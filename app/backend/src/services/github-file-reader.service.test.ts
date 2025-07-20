import { GitHubFileReaderService } from './github-file-reader.service';
import { GitHubAppService } from '@/modules/auth/services/github-app-service';
import axios from 'axios';
import { logger } from '@/shared/logger';

jest.mock('@/modules/auth/services/github-app-service');
jest.mock('axios');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('GitHubFileReaderService', () => {
  let service: GitHubFileReaderService;
  let mockGitHubAppService: jest.Mocked<GitHubAppService>;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGitHubAppService = {
      generateInstallationToken: jest.fn(),
    } as any;
    
    (GitHubAppService as jest.MockedClass<typeof GitHubAppService>).mockImplementation(() => mockGitHubAppService);
    mockAxios = axios as jest.Mocked<typeof axios>;
    
    service = new GitHubFileReaderService();
  });

  describe('fetchRepositoryFiles', () => {
    const mockInstallationId = 12345;
    const mockOwner = 'test-owner';
    const mockRepo = 'test-repo';
    const mockBranch = 'main';
    const mockToken = 'test-token';
    const mockInstallationToken = {
      token: mockToken,
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    };

    beforeEach(() => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue(mockInstallationToken);
    });

    it('should fetch repository files successfully', async () => {
      // Mock branch response
      mockAxios.get.mockResolvedValueOnce({
        data: {
          commit: {
            commit: {
              tree: { sha: 'tree-sha-123' },
            },
          },
        },
      });

      // Mock tree response
      mockAxios.get.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'src/index.ts', type: 'blob', size: 100 },
            { path: 'src/utils.ts', type: 'blob', size: 200 },
            { path: 'README.md', type: 'blob', size: 300 },
            { path: 'node_modules/lib.js', type: 'blob', size: 400 },
            { path: 'src', type: 'tree', size: 0 },
          ],
        },
      });

      // Mock file content responses
      const mockFileContent = (path: string, content: string) => ({
        data: {
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
          size: content.length,
        },
      });

      mockAxios.get
        .mockResolvedValueOnce(mockFileContent('src/index.ts', 'export const app = {};'))
        .mockResolvedValueOnce(mockFileContent('src/utils.ts', 'export function util() {}'))
        .mockResolvedValueOnce(mockFileContent('README.md', '# Test Repo'));

      const files = await service.fetchRepositoryFiles(mockInstallationId, mockOwner, mockRepo, mockBranch);

      expect(files).toHaveLength(3);
      expect(files[0]).toMatchObject({
        path: 'src/index.ts',
        content: 'export const app = {};',
        language: 'typescript',
      });
      expect(files[1]).toMatchObject({
        path: 'src/utils.ts',
        content: 'export function util() {}',
        language: 'typescript',
      });
      expect(files[2]).toMatchObject({
        path: 'README.md',
        content: '# Test Repo',
        language: 'markdown',
      });

      // Verify API calls
      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://api.github.com/repos/${mockOwner}/${mockRepo}/branches/${mockBranch}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `token ${mockToken}`,
          }),
        })
      );
    });

    it('should apply file filters correctly', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          commit: {
            commit: {
              tree: { sha: 'tree-sha-123' },
            },
          },
        },
      });

      mockAxios.get.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'src/index.ts', type: 'blob', size: 100 },
            { path: 'src/large-file.ts', type: 'blob', size: 2 * 1024 * 1024 }, // 2MB
            { path: 'src/excluded.ts', type: 'blob', size: 100 },
            { path: 'src/image.png', type: 'blob', size: 100 },
            { path: 'test/test.spec.ts', type: 'blob', size: 100 },
          ],
        },
      });

      const filter = {
        excludePaths: ['test'],
        excludePatterns: [/excluded/],
        includeExtensions: ['.ts'],
        maxFileSize: 1024 * 1024, // 1MB
      };

      mockAxios.get.mockResolvedValueOnce({
        data: {
          content: Buffer.from('export const app = {};').toString('base64'),
          encoding: 'base64',
          size: 22,
        },
      });

      const files = await service.fetchRepositoryFiles(mockInstallationId, mockOwner, mockRepo, mockBranch, filter);

      expect(files).toHaveLength(1);
      expect(files[0]?.path).toBe('src/index.ts');
    });

    it('should handle errors gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('GitHub API error'));

      await expect(
        service.fetchRepositoryFiles(mockInstallationId, mockOwner, mockRepo, mockBranch)
      ).rejects.toThrow('GitHub API error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch repository files',
        expect.objectContaining({ owner: mockOwner, repo: mockRepo })
      );
    });

    it('should process files in batches with delays', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          commit: {
            commit: {
              tree: { sha: 'tree-sha-123' },
            },
          },
        },
      });

      // Create 15 files to test batching
      const treeFiles = Array.from({ length: 15 }, (_, i) => ({
        path: `file${i}.ts`,
        type: 'blob',
        size: 100,
      }));

      mockAxios.get.mockResolvedValueOnce({
        data: { tree: treeFiles },
      });

      // Mock file content responses
      treeFiles.forEach((_, i) => {
        mockAxios.get.mockResolvedValueOnce({
          data: {
            content: Buffer.from(`content${i}`).toString('base64'),
            encoding: 'base64',
            size: 8,
          },
        });
      });

      const startTime = Date.now();
      const files = await service.fetchRepositoryFiles(mockInstallationId, mockOwner, mockRepo);
      const duration = Date.now() - startTime;

      expect(files).toHaveLength(15);
      // Should have at least one 100ms delay between batches
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('fetchReadme', () => {
    it('should fetch README file successfully', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      mockAxios.get.mockResolvedValueOnce({
        data: {
          content: Buffer.from('# My Project\n\nThis is a test project.').toString('base64'),
          encoding: 'base64',
          size: 36,
        },
      });

      const readme = await service.fetchReadme(12345, 'owner', 'repo');

      expect(readme).toBe('# My Project\n\nThis is a test project.');
    });

    it('should try multiple README filename variations', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      // First two attempts fail
      mockAxios.get.mockRejectedValueOnce(new Error('Not found'));
      mockAxios.get.mockRejectedValueOnce(new Error('Not found'));
      
      // Third attempt succeeds
      mockAxios.get.mockResolvedValueOnce({
        data: {
          content: Buffer.from('# Found').toString('base64'),
          encoding: 'base64',
          size: 7,
        },
      });

      const readme = await service.fetchReadme(12345, 'owner', 'repo');

      expect(readme).toBe('# Found');
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should return null if no README found', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      mockAxios.get.mockRejectedValue(new Error('Not found'));

      const readme = await service.fetchReadme(12345, 'owner', 'repo');

      expect(readme).toBeNull();
    });
  });

  describe('fetchPackageJson', () => {
    it('should fetch and parse package.json successfully', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0',
        },
      };

      mockAxios.get.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify(packageJson)).toString('base64'),
          encoding: 'base64',
          size: 100,
        },
      });

      const result = await service.fetchPackageJson(12345, 'owner', 'repo');

      expect(result).toEqual(packageJson);
    });

    it('should return null if package.json not found', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      mockAxios.get.mockRejectedValue(new Error('Not found'));

      const result = await service.fetchPackageJson(12345, 'owner', 'repo');

      expect(result).toBeNull();
    });
  });

  describe('fetchConfigurationFiles', () => {
    it('should fetch multiple configuration files', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      // Mock responses for different config files
      const configResponses = [
        { path: 'package.json', content: '{"name":"test"}' },
        { path: 'tsconfig.json', content: '{"compilerOptions":{}}' },
        { path: 'README.md', content: '# Test' },
      ];

      let getCallCount = 0;
      mockAxios.get.mockImplementation((url) => {
        const response = configResponses[getCallCount % configResponses.length];
        getCallCount++;
        
        if (url.includes('/contents/') && response) {
          return Promise.resolve({
            data: {
              content: Buffer.from(response.content).toString('base64'),
              encoding: 'base64',
              size: response.content.length,
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });

      const files = await service.fetchConfigurationFiles(12345, 'owner', 'repo');

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path === 'package.json')).toBe(true);
      expect(files.some(f => f.path === 'tsconfig.json')).toBe(true);
    });

    it('should handle wildcard patterns for workflow files', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      // Mock all axios.get calls
      mockAxios.get.mockImplementation((url) => {
        // Mock directory listing for .github/workflows
        if (url.includes('/contents/.github/workflows') && !url.includes('.yml')) {
          return Promise.resolve({
            data: [
              { name: 'ci.yml', type: 'file', path: '.github/workflows/ci.yml' },
              { name: 'deploy.yml', type: 'file', path: '.github/workflows/deploy.yml' },
              { name: 'README.md', type: 'file', path: '.github/workflows/README.md' },
            ],
          });
        }
        
        // Mock individual file fetches
        if (url.includes('/contents/.github/workflows/ci.yml')) {
          return Promise.resolve({
            data: {
              content: Buffer.from('name: CI').toString('base64'),
              encoding: 'base64',
              size: 8,
            },
          });
        }
        
        if (url.includes('/contents/.github/workflows/deploy.yml')) {
          return Promise.resolve({
            data: {
              content: Buffer.from('name: Deploy').toString('base64'),
              encoding: 'base64',
              size: 12,
            },
          });
        }
        
        // Don't fail for other patterns, just return not found
        return Promise.reject({ response: { status: 404 } });
      });

      const files = await service.fetchConfigurationFiles(12345, 'owner', 'repo');

      const workflowFiles = files.filter(f => f.path.includes('.github/workflows') && f.path.endsWith('.yml'));
      
      expect(workflowFiles).toHaveLength(2);
      expect(workflowFiles.find(f => f.path.includes('ci.yml'))?.content).toBe('name: CI');
      expect(workflowFiles.find(f => f.path.includes('deploy.yml'))?.content).toBe('name: Deploy');
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze JavaScript dependencies from package.json', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      const packageJson = {
        dependencies: {
          express: '^4.18.0',
          axios: '^1.5.0',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
        scripts: {
          test: 'jest',
          start: 'node index.js',
        },
      };

      // Mock fetchPackageJson
      jest.spyOn(service, 'fetchPackageJson').mockResolvedValue(packageJson);

      const dependencies = await service.analyzeDependencies(12345, 'owner', 'repo');

      expect(dependencies.javascript).toEqual({
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        scripts: packageJson.scripts,
        engines: {},
      });
    });

    it('should analyze Python dependencies from requirements.txt', async () => {
      mockGitHubAppService.generateInstallationToken.mockResolvedValue({
      token: 'test-token',
      expires_at: '2024-12-31T23:59:59Z',
      permissions: { contents: 'read', metadata: 'read' }
    });
      
      const requirementsContent = `
# Main dependencies
django==3.2.0
requests>=2.25.0
# Dev dependencies
pytest==6.2.0
black
`;

      jest.spyOn(service, 'fetchPackageJson').mockResolvedValue(null);
      
      mockAxios.get.mockResolvedValueOnce({
        data: {
          content: Buffer.from(requirementsContent).toString('base64'),
          encoding: 'base64',
          size: requirementsContent.length,
        },
      });

      const dependencies = await service.analyzeDependencies(12345, 'owner', 'repo');

      expect(dependencies.python.requirements).toEqual([
        'django==3.2.0',
        'requests>=2.25.0',
        'pytest==6.2.0',
        'black',
      ]);
    });

    it('should return empty object on error', async () => {
      mockGitHubAppService.generateInstallationToken.mockRejectedValue(new Error('Auth error'));

      const dependencies = await service.analyzeDependencies(12345, 'owner', 'repo');

      expect(dependencies).toEqual({});
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to analyze dependencies',
        expect.any(Object)
      );
    });
  });

  describe('language detection', () => {
    it('should detect languages correctly from file extensions', () => {
      const testCases = [
        { path: 'app.ts', expected: 'typescript' },
        { path: 'component.tsx', expected: 'typescript' },
        { path: 'script.js', expected: 'javascript' },
        { path: 'App.jsx', expected: 'javascript' },
        { path: 'main.py', expected: 'python' },
        { path: 'Main.java', expected: 'java' },
        { path: 'program.cpp', expected: 'cpp' },
        { path: 'app.go', expected: 'go' },
        { path: 'lib.rs', expected: 'rust' },
        { path: 'README.md', expected: 'markdown' },
        { path: 'config.yaml', expected: 'yaml' },
        { path: 'unknown.xyz', expected: 'unknown' },
      ];

      for (const testCase of testCases) {
        const result = (service as any).detectLanguage(testCase.path);
        expect(result).toBe(testCase.expected);
      }
    });
  });
});
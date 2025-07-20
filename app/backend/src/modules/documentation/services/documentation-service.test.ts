import { DocumentationService } from './documentation-service';
import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { OpenAIService } from '@/services/openai.service';
import { GitHubFileReaderService } from '@/services/github-file-reader.service';
import { CodeChunkingService } from '@/services/code-chunking.service';
import { MultiPassGenerationService } from '@/services/multi-pass-generation.service';
import { CodeContextExtractionService } from '@/services/code-context-extraction.service';
import { FileDocumentationService } from '@/services/file-documentation.service';
import { PromptTemplates } from '@/services/prompt-templates';

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('@/services/openai.service');
jest.mock('@/services/github-file-reader.service');
jest.mock('@/services/code-chunking.service');
jest.mock('@/services/multi-pass-generation.service');
jest.mock('@/services/code-context-extraction.service');
jest.mock('@/services/file-documentation.service');
jest.mock('@/services/prompt-templates');

describe('DocumentationService', () => {
  let documentationService: DocumentationService;
  let mockSupabase: any;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockGitHubFileReaderService: jest.Mocked<GitHubFileReaderService>;
  let mockFileDocumentationService: jest.Mocked<FileDocumentationService>;

  const mockRepository = {
    id: 'repo-123',
    user_id: 'user-123',
    repo_full_name: 'testuser/test-repo',
    repo_name: 'test-repo',
    repo_owner: 'testuser',
    language: 'TypeScript',
    default_branch: 'main',
  };

  const mockInstallation = {
    id: 'install-123',
    user_id: 'user-123',
    github_installation_id: 12345,
  };

  const mockGeneration = {
    id: 'gen-123',
    repository_id: 'repo-123',
    user_id: 'user-123',
    status: 'processing',
    trigger_type: 'manual',
    files_processed: 0,
    files_failed: 0,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const mockFiles = [
    {
      path: 'src/index.ts',
      content: 'export const app = () => {}',
      language: 'typescript',
      size: 28,
      encoding: 'utf8',
    },
    {
      path: 'src/utils.ts',
      content: 'export const helper = () => {}',
      language: 'typescript',
      size: 30,
      encoding: 'utf8',
    },
  ];

  const mockFileDocumentations = [
    {
      file_path: 'src/index.ts',
      documentation: '# index.ts\n\nMain application entry point.',
      metadata: {
        file_type: 'source',
        language: 'typescript',
        lines_of_code: 1,
      },
    },
    {
      file_path: 'src/utils.ts',
      documentation: '# utils.ts\n\nUtility functions.',
      metadata: {
        file_type: 'source',
        language: 'typescript',
        lines_of_code: 1,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      })),
    };
    (supabaseAdmin as any) = mockSupabase;

    // Setup mock services
    mockOpenAIService = {
      generateDocumentation: jest.fn(),
    } as any;
    
    mockGitHubFileReaderService = {
      fetchRepositoryFiles: jest.fn(),
      fetchConfigurationFiles: jest.fn(),
      fetchPackageJson: jest.fn(),
      fetchReadme: jest.fn(),
      analyzeDependencies: jest.fn(),
    } as any;
    
    mockFileDocumentationService = {
      generateBatchFileDocumentation: jest.fn(),
      generateRepositorySummary: jest.fn(),
    } as any;

    // Mock the constructors
    (OpenAIService as jest.MockedClass<typeof OpenAIService>).mockImplementation(() => mockOpenAIService);
    (GitHubFileReaderService as jest.MockedClass<typeof GitHubFileReaderService>).mockImplementation(() => mockGitHubFileReaderService);
    (FileDocumentationService as jest.MockedClass<typeof FileDocumentationService>).mockImplementation(() => mockFileDocumentationService);

    // Create service instance
    documentationService = new DocumentationService();
  });

  describe('generateFileBasedDocumentation', () => {
    beforeEach(() => {
      // Setup default successful responses
      const setupMockChain = (data: any, error: any = null) => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data, error }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return setupMockChain(mockRepository);
        }
        if (table === 'github_installations') {
          return setupMockChain(mockInstallation);
        }
        if (table === 'documentation_generations') {
          return setupMockChain(mockGeneration);
        }
        return setupMockChain(null);
      });

      mockGitHubFileReaderService.fetchRepositoryFiles.mockResolvedValue(mockFiles as any);
      mockGitHubFileReaderService.fetchConfigurationFiles.mockResolvedValue([]);
      mockGitHubFileReaderService.fetchPackageJson.mockResolvedValue(null);

      mockFileDocumentationService.generateBatchFileDocumentation.mockResolvedValue(mockFileDocumentations as any);
      mockFileDocumentationService.generateRepositorySummary.mockResolvedValue('# Repository Summary\n\nTest summary');

      (PromptTemplates.detectProjectType as jest.Mock).mockReturnValue('web-app');
    });

    it('should successfully generate file-based documentation', async () => {
      const result = await documentationService.generateFileBasedDocumentation('repo-123', 'user-123');

      expect(result).toEqual({
        repository_id: 'repo-123',
        generation_id: 'gen-123',
        summary: '# Repository Summary\n\nTest summary',
        files: mockFileDocumentations,
        metadata: {
          total_files: 2,
          languages: {
            typescript: 2,
          },
          total_lines: 2,
          documentation_coverage: 100,
        },
      });

      expect(mockGitHubFileReaderService.fetchRepositoryFiles).toHaveBeenCalledWith(
        12345,
        'testuser',
        'test-repo',
        'main'
      );

      expect(mockFileDocumentationService.generateBatchFileDocumentation).toHaveBeenCalled();
      expect(mockFileDocumentationService.generateRepositorySummary).toHaveBeenCalled();
    });

    it('should handle repository not found error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(documentationService.generateFileBasedDocumentation('repo-123', 'user-123'))
        .rejects.toThrow('Repository not found or access denied');
    });

    it('should handle GitHub installation not found error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockRepository, error: null }),
          };
        }
        if (table === 'github_installations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(documentationService.generateFileBasedDocumentation('repo-123', 'user-123'))
        .rejects.toThrow('GitHub installation not found');
    });

    it('should update generation record on failure', async () => {
      // First setup successful responses for the initial calls
      const setupMockChain = (data: any, error: any = null) => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data, error }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return setupMockChain(mockRepository);
        }
        if (table === 'github_installations') {
          return setupMockChain(mockInstallation);
        }
        if (table === 'documentation_generations') {
          return setupMockChain(mockGeneration);
        }
        return setupMockChain(null);
      });
      
      const error = new Error('File fetch failed');
      mockGitHubFileReaderService.fetchRepositoryFiles.mockRejectedValue(error);

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation_generations' && updateMock.mock.calls.length > 0) {
          return {
            update: updateMock,
            eq: eqMock,
          };
        }
        // Default mock for other cases
        const setupMockChain = (data: any, error: any = null) => ({
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: updateMock,
          upsert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data, error }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        });

        if (table === 'repository_access') {
          return setupMockChain(mockRepository);
        }
        if (table === 'github_installations') {
          return setupMockChain(mockInstallation);
        }
        if (table === 'documentation_generations') {
          return setupMockChain(mockGeneration);
        }
        return setupMockChain(null);
      });

      await expect(documentationService.generateFileBasedDocumentation('repo-123', 'user-123'))
        .rejects.toThrow('File fetch failed');

      expect(updateMock).toHaveBeenCalledWith({
        status: 'failed',
        completed_at: expect.any(String),
        error_data: {
          message: 'File fetch failed',
          stack: expect.any(String),
        },
      });
    });

    it('should create immediate placeholder documentation and summary', async () => {
      const upsertMock = jest.fn().mockReturnThis();
      let upsertCalls: any[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        const setupMockChain = (data: any, error: any = null) => ({
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          upsert: jest.fn((data: any, options: any) => {
            upsertCalls.push({ table, data, options });
            return { data: null, error: null };
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data, error }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        });

        if (table === 'repository_access') {
          return setupMockChain(mockRepository);
        }
        if (table === 'github_installations') {
          return setupMockChain(mockInstallation);
        }
        if (table === 'documentation_generations') {
          return setupMockChain(mockGeneration);
        }
        return setupMockChain(null);
      });

      await documentationService.generateFileBasedDocumentation('repo-123', 'user-123');

      // Check placeholder documentation was created
      const docUpsert = upsertCalls.find(call => call.table === 'documentation');
      expect(docUpsert).toBeDefined();
      expect(docUpsert.data.content).toContain('Documentation is being generated');

      // Check placeholder summary was created
      const summaryUpsert = upsertCalls.find(call => call.table === 'documentation_summaries');
      expect(summaryUpsert).toBeDefined();
      expect(summaryUpsert.data.content).toContain('Documentation is being generated');
    });
  });

  describe('getFileDocumentation', () => {
    it('should get file documentation for a repository', async () => {
      const mockFileData = [
        {
          id: 'file-1',
          repository_id: 'repo-123',
          generation_id: 'gen-123',
          file_path: 'src/index.ts',
          file_type: 'source',
          language: 'typescript',
          lines_of_code: 100,
          generated_documentation: '# Documentation',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'repo-123' }, error: null }),
          };
        }
        if (table === 'documentation_generations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'gen-123' }, error: null }),
          };
        }
        if (table === 'documentation_files') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockFileData, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getFileDocumentation('repo-123', 'user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'file-1',
        repository_id: 'repo-123',
        file_path: 'src/index.ts',
        language: 'typescript',
      });
    });

    it('should throw error when user has no access', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(documentationService.getFileDocumentation('repo-123', 'user-123'))
        .rejects.toThrow('Repository not found or access denied');
    });

    it('should return empty array when no generation exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'repo-123' }, error: null }),
          };
        }
        if (table === 'documentation_generations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getFileDocumentation('repo-123', 'user-123');
      expect(result).toEqual([]);
    });
  });

  describe('getDocumentationSummary', () => {
    it('should get documentation summary', async () => {
      const mockSummary = {
        id: 'summary-123',
        repository_id: 'repo-123',
        generation_id: 'gen-123',
        content: '# Summary',
        metadata: { total_files: 10 },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'repo-123' }, error: null }),
          };
        }
        if (table === 'documentation_summaries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSummary, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getDocumentationSummary('repo-123', 'user-123');

      expect(result).toMatchObject({
        id: 'summary-123',
        repository_id: 'repo-123',
        content: '# Summary',
      });
    });

    it('should return null when no summary exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'repo-123' }, error: null }),
          };
        }
        if (table === 'documentation_summaries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getDocumentationSummary('repo-123', 'user-123');
      expect(result).toBeNull();
    });
  });

  describe('getAllDocumentation', () => {
    it('should get all documentation for a user', async () => {
      const mockDocumentation = [
        {
          id: 'doc-1',
          repository_id: 'repo-123',
          user_id: 'user-123',
          content: '# Documentation',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockRepo = {
        id: 'repo-123',
        repo_full_name: 'testuser/test-repo',
        repo_name: 'test-repo',
        repo_owner: 'testuser',
        language: 'TypeScript',
        default_branch: 'main',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockDocumentation, error: null }),
          };
        }
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockRepo, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getAllDocumentation('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'doc-1',
        repository_id: 'repo-123',
        repository: mockRepo,
      });
    });

    it('should return empty array when no documentation exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getAllDocumentation('user-123');
      expect(result).toEqual([]);
    });

    it('should handle missing repository data gracefully', async () => {
      const mockDocumentation = [
        {
          id: 'doc-1',
          repository_id: 'repo-123',
          user_id: 'user-123',
          content: '# Documentation',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockDocumentation, error: null }),
          };
        }
        if (table === 'repository_access') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getAllDocumentation('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].repository).toBeNull();
    });
  });

  describe('getDocumentation', () => {
    it('should get documentation for a repository', async () => {
      const mockDoc = {
        id: 'doc-123',
        repository_id: 'repo-123',
        user_id: 'user-123',
        content: '# Documentation',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getDocumentation('repo-123', 'user-123');
      expect(result).toEqual(mockDoc);
    });

    it('should return null when documentation not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documentation') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await documentationService.getDocumentation('repo-123', 'user-123');
      expect(result).toBeNull();
    });
  });

  describe('generateDocumentation', () => {
    it('should redirect to file-based generation', async () => {
      const mockResult = {
        repository_id: 'repo-123',
        generation_id: 'gen-123',
        summary: '# Summary',
        files: mockFileDocumentations,
        metadata: { 
          total_files: 2,
          languages: { typescript: 2 },
          total_lines: 2,
          documentation_coverage: 100
        },
      };

      jest.spyOn(documentationService, 'generateFileBasedDocumentation').mockResolvedValue(mockResult);

      const result = await documentationService.generateDocumentation('repo-123', 'user-123', false);

      expect(result).toMatchObject({
        id: 'gen-123',
        status: 'completed',
        filesProcessed: 2,
      });

      expect(documentationService.generateFileBasedDocumentation).toHaveBeenCalledWith('repo-123', 'user-123');
    });
  });

  describe('Not Implemented Methods', () => {
    it('createProject should throw not implemented error', async () => {
      await expect(documentationService.createProject({})).rejects.toThrow('Not implemented');
    });

    it('getUserProjects should throw not implemented error', async () => {
      await expect(documentationService.getUserProjects('user-123')).rejects.toThrow('Not implemented');
    });

    it('getProject should throw not implemented error', async () => {
      await expect(documentationService.getProject('project-123')).rejects.toThrow('Not implemented');
    });

    it('updateProject should throw not implemented error', async () => {
      await expect(documentationService.updateProject('project-123', {})).rejects.toThrow('Not implemented');
    });

    it('deleteProject should throw not implemented error', async () => {
      await expect(documentationService.deleteProject('project-123')).rejects.toThrow('Not implemented');
    });

    it('searchDocumentation should throw not implemented error', async () => {
      await expect(documentationService.searchDocumentation('query')).rejects.toThrow('Not implemented');
    });

    it('exportDocumentation should throw not implemented error', async () => {
      await expect(documentationService.exportDocumentation('project-123', 'pdf')).rejects.toThrow('Not implemented');
    });
  });
});
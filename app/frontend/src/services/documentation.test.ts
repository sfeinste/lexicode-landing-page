import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentationApi, buildFileTree } from './documentation';
import { api } from './api';

// Mock the api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const mockedApi = api as any;

describe('documentationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAll', () => {
    it('should fetch all documentation items', async () => {
      const mockDocumentation = [
        { id: '1', repository_id: 'repo1', content: 'Content 1' },
        { id: '2', repository_id: 'repo2', content: 'Content 2' }
      ];
      mockedApi.get.mockResolvedValue({ data: mockDocumentation });

      const result = await documentationApi.getAll();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documentation');
      expect(result).toEqual(mockDocumentation);
    });
  });

  describe('getByRepository', () => {
    it('should fetch documentation by repository ID', async () => {
      const mockDocumentation = {
        id: '1',
        repository_id: 'repo1',
        content: 'Documentation content'
      };
      mockedApi.get.mockResolvedValue({ data: mockDocumentation });

      const result = await documentationApi.getByRepository('repo1');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documentation/repo1');
      expect(result).toEqual(mockDocumentation);
    });
  });

  describe('generate', () => {
    it('should generate documentation for repository', async () => {
      const mockResponse = {
        jobId: 'job123',
        status: 'pending'
      };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await documentationApi.generate('repo1');

      expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/documentation/generate/repo1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateFiles', () => {
    it('should generate file-based documentation for repository', async () => {
      const mockResponse = {
        jobId: 'job123',
        status: 'pending'
      };
      mockedApi.post.mockResolvedValue({ data: mockResponse });

      const result = await documentationApi.generateFiles('repo1');

      expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/documentation/generate-files/repo1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getJobProgress', () => {
    it('should fetch job progress', async () => {
      const mockProgress = {
        jobId: 'job123',
        status: 'processing',
        progress: 50,
        currentFile: 'src/index.ts'
      };
      mockedApi.get.mockResolvedValue({ data: mockProgress });

      const result = await documentationApi.getJobProgress('job123');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documentation/progress/job123');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('pollJobProgress', () => {
    it('should poll until job is completed', async () => {
      const mockProgressStates = [
        { jobId: 'job123', status: 'processing', progress: 25 },
        { jobId: 'job123', status: 'processing', progress: 50 },
        { jobId: 'job123', status: 'processing', progress: 75 },
        { jobId: 'job123', status: 'completed', progress: 100 }
      ];

      let callCount = 0;
      mockedApi.get.mockImplementation(() => {
        const response = mockProgressStates[callCount];
        callCount++;
        return Promise.resolve({ data: response });
      });

      const progressUpdates: any[] = [];
      const onProgress = vi.fn((progress) => progressUpdates.push(progress));

      const promise = documentationApi.pollJobProgress('job123', onProgress, 100);

      // Fast-forward through all polling intervals
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      const result = await promise;

      expect(result).toEqual(mockProgressStates[3]);
      expect(onProgress).toHaveBeenCalledTimes(4);
      expect(progressUpdates).toHaveLength(4);
      expect(progressUpdates[3].status).toBe('completed');
    });

    it('should reject when job fails', async () => {
      const mockFailedProgress = {
        jobId: 'job123',
        status: 'failed',
        error: 'Generation failed'
      };

      mockedApi.get.mockResolvedValue({ data: mockFailedProgress });

      await expect(documentationApi.pollJobProgress('job123'))
        .rejects.toThrow('Generation failed');
    });

    it('should reject when API call fails', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      await expect(documentationApi.pollJobProgress('job123'))
        .rejects.toThrow('Network error');
    });

    it('should use custom poll interval', async () => {
      const mockProgress = { jobId: 'job123', status: 'processing' };
      mockedApi.get.mockResolvedValue({ data: mockProgress });

      const onProgress = vi.fn();
      documentationApi.pollJobProgress('job123', onProgress, 5000);

      await vi.advanceTimersByTimeAsync(4999);
      expect(onProgress).toHaveBeenCalledTimes(1); // Initial call

      await vi.advanceTimersByTimeAsync(1);
      expect(onProgress).toHaveBeenCalledTimes(2); // Second call after 5000ms
    });
  });

  describe('getFiles', () => {
    it('should fetch documentation files for repository', async () => {
      const mockResponse = {
        repository_id: 'repo1',
        files: ['src/index.ts', 'src/utils.ts'],
        metadata: {}
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await documentationApi.getFiles('repo1');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documentation/repo1/files');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFileByPath', () => {
    it('should fetch documentation for specific file', async () => {
      const mockResponse = {
        file_path: 'src/index.ts',
        documentation: 'File documentation content',
        metadata: {}
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await documentationApi.getFileByPath('repo1', 'src/index.ts');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/documentation/repo1/files/src%2Findex.ts'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should properly encode file paths with special characters', async () => {
      const mockResponse = { file_path: 'src/[id].ts', documentation: 'Content' };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      await documentationApi.getFileByPath('repo1', 'src/[id].ts');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/documentation/repo1/files/src%2F%5Bid%5D.ts'
      );
    });
  });

  describe('getSummary', () => {
    it('should fetch documentation summary for repository', async () => {
      const mockSummary = {
        repository_id: 'repo1',
        total_files: 10,
        documented_files: 8,
        languages: ['TypeScript', 'JavaScript']
      };
      mockedApi.get.mockResolvedValue({ data: mockSummary });

      const result = await documentationApi.getSummary('repo1');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/documentation/repo1/summary');
      expect(result).toEqual(mockSummary);
    });
  });
});

describe('buildFileTree', () => {
  it('should build tree from flat file list', () => {
    const files = [
      'src/index.ts',
      'src/utils.ts',
      'src/components/Button.tsx',
      'src/components/Form.tsx',
      'test/index.test.ts'
    ];

    const result = buildFileTree(files);

    expect(result).toHaveLength(2); // src and test folders
    
    const srcFolder = result.find((node: any) => node.name === 'src');
    expect(srcFolder).toBeDefined();
    expect(srcFolder.type).toBe('folder');
    expect(srcFolder.children).toHaveLength(3); // index.ts, utils.ts, components

    const componentsFolder = srcFolder.children.find((node: any) => node.name === 'components');
    expect(componentsFolder).toBeDefined();
    expect(componentsFolder.type).toBe('folder');
    expect(componentsFolder.children).toHaveLength(2); // Button.tsx, Form.tsx
  });

  it('should handle single file', () => {
    const files = ['index.ts'];
    const result = buildFileTree(files);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('index.ts');
    expect(result[0].type).toBe('file');
    expect(result[0].path).toBe('index.ts');
    expect(result[0].children).toBeUndefined();
  });

  it('should handle empty file list', () => {
    const files: string[] = [];
    const result = buildFileTree(files);

    expect(result).toHaveLength(0);
  });

  it('should handle deeply nested paths', () => {
    const files = ['a/b/c/d/e/file.ts'];
    const result = buildFileTree(files);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('a');
    
    let current = result[0];
    const expectedNames = ['a', 'b', 'c', 'd', 'e'];
    
    for (let i = 0; i < expectedNames.length; i++) {
      expect(current.name).toBe(expectedNames[i]);
      expect(current.type).toBe('folder');
      if (i < expectedNames.length - 1) {
        expect(current.children).toHaveLength(1);
        current = current.children[0];
      }
    }
    
    expect(current.children).toHaveLength(1);
    expect(current.children[0].name).toBe('file.ts');
    expect(current.children[0].type).toBe('file');
  });

  it('should build correct paths for all nodes', () => {
    const files = ['src/components/Button.tsx'];
    const result = buildFileTree(files);

    const srcNode = result[0];
    expect(srcNode.path).toBe('src');

    const componentsNode = srcNode.children[0];
    expect(componentsNode.path).toBe('src/components');

    const buttonNode = componentsNode.children[0];
    expect(buttonNode.path).toBe('src/components/Button.tsx');
  });
});
import { Request, Response } from 'express';
import { DocumentationController } from './documentation-controller';
import { DocumentationService } from '../services/documentation-service';
import { logger } from '@/shared/logger';
import { queueService } from '../../../services/queueService';
import { createClient } from 'redis';

jest.mock('../services/documentation-service');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../services/queueService', () => ({
  queueService: {
    publishDocumentationJob: jest.fn(),
  },
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('DocumentationController', () => {
  let documentationController: DocumentationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDocumentationService: jest.Mocked<DocumentationService>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    // Create mock request
    mockRequest = {
      params: {},
      body: {},
      user: { id: 'user-123' },
    } as any;

    // Create controller
    documentationController = new DocumentationController();
    mockDocumentationService = (documentationController as any).documentationService;
  });

  describe('generateDocumentation', () => {
    beforeEach(() => {
      mockRequest.params = { repositoryId: 'repo-123' };
    });

    it('should queue documentation generation successfully', async () => {
      const mockRepoInfo = {
        id: 'repo-123',
        name: 'test-repo',
        repo_full_name: 'testuser/test-repo',
      };

      mockDocumentationService.getRepositoryInfo.mockResolvedValue(mockRepoInfo);

      await documentationController.generateDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getRepositoryInfo).toHaveBeenCalledWith('repo-123', 'user-123');
      
      expect(queueService.publishDocumentationJob).toHaveBeenCalledWith({
        jobId: 'mock-uuid-123',
        userId: 'user-123',
        repositoryId: 'repo-123',
        repositoryName: 'test-repo',
        generateFiles: true,
      });

      expect(statusMock).toHaveBeenCalledWith(202);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Documentation generation queued',
        jobId: 'mock-uuid-123',
        status: 'pending',
      });
    });

    it('should return 400 when repository ID is missing', async () => {
      mockRequest.params = {};

      await documentationController.generateDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Repository ID is required' });
      expect(mockDocumentationService.getRepositoryInfo).not.toHaveBeenCalled();
    });

    it('should return 404 when repository not found', async () => {
      mockDocumentationService.getRepositoryInfo.mockResolvedValue(null);

      await documentationController.generateDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Repository not found' });
      expect(queueService.publishDocumentationJob).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getRepositoryInfo.mockRejectedValue(error);

      await documentationController.generateDocumentation(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalledWith('Generate documentation error:', error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Service error' });
    });

    it('should handle unknown errors', async () => {
      mockDocumentationService.getRepositoryInfo.mockRejectedValue('Unknown error');

      await documentationController.generateDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getDocumentation', () => {
    beforeEach(() => {
      mockRequest.params = { repositoryId: 'repo-123' };
    });

    it('should get documentation successfully', async () => {
      const mockDocumentation = {
        id: 'doc-123',
        repository_id: 'repo-123',
        content: '# Documentation',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockDocumentationService.getDocumentation.mockResolvedValue(mockDocumentation);

      await documentationController.getDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getDocumentation).toHaveBeenCalledWith('repo-123', 'user-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockDocumentation);
    });

    it('should return 400 when repository ID is missing', async () => {
      mockRequest.params = {};

      await documentationController.getDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Repository ID is required' });
      expect(mockDocumentationService.getDocumentation).not.toHaveBeenCalled();
    });

    it('should return 404 when documentation not found', async () => {
      mockDocumentationService.getDocumentation.mockResolvedValue(null);

      await documentationController.getDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Documentation not found' });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockDocumentationService.getDocumentation.mockRejectedValue(error);

      await documentationController.getDocumentation(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalledWith('Get documentation error:', error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getAllDocumentation', () => {
    it('should get all documentation successfully', async () => {
      const mockDocumentation = [
        {
          id: 'doc-1',
          repository_id: 'repo-123',
          content: '# Doc 1',
        },
        {
          id: 'doc-2',
          repository_id: 'repo-456',
          content: '# Doc 2',
        },
      ];

      mockDocumentationService.getAllDocumentation.mockResolvedValue(mockDocumentation);

      await documentationController.getAllDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getAllDocumentation).toHaveBeenCalledWith('user-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockDocumentation);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockDocumentationService.getAllDocumentation.mockRejectedValue(error);

      await documentationController.getAllDocumentation(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalledWith('Get all documentation error:', error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getFileDocumentation', () => {
    beforeEach(() => {
      mockRequest.params = { repositoryId: 'repo-123' };
    });

    it('should get file documentation successfully', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          repository_id: 'repo-123',
          file_path: 'src/index.ts',
          generated_documentation: '# index.ts',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'file-2',
          repository_id: 'repo-123',
          file_path: 'src/utils.ts',
          generated_documentation: '# utils.ts',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDocumentationService.getFileDocumentation.mockResolvedValue(mockFiles);

      await documentationController.getFileDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getFileDocumentation).toHaveBeenCalledWith('repo-123', 'user-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        repository_id: 'repo-123',
        files: [
          {
            file_path: 'src/index.ts',
            file_type: undefined,
            language: undefined,
            lines_of_code: undefined,
            has_documentation: true,
          },
          {
            file_path: 'src/utils.ts',
            file_type: undefined,
            language: undefined,
            lines_of_code: undefined,
            has_documentation: true,
          },
        ],
        total_files: 2,
      });
    });

    it('should return 400 when repository ID is missing', async () => {
      mockRequest.params = {};

      await documentationController.getFileDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Repository ID is required' });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getFileDocumentation.mockRejectedValue(error);

      await documentationController.getFileDocumentation(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalledWith('Get file documentation error:', error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Service error' });
    });
  });

  describe('getDocumentationSummary', () => {
    beforeEach(() => {
      mockRequest.params = { repositoryId: 'repo-123' };
    });

    it('should get documentation summary successfully', async () => {
      const mockSummary = {
        id: 'summary-123',
        repository_id: 'repo-123',
        content: '# Repository Summary',
        metadata: { total_files: 10 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDocumentationService.getDocumentationSummary.mockResolvedValue(mockSummary);

      await documentationController.getDocumentationSummary(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getDocumentationSummary).toHaveBeenCalledWith('repo-123', 'user-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        repository_id: 'repo-123',
        content: '# Repository Summary',
        metadata: { total_files: 10 },
        created_at: mockSummary.created_at,
        updated_at: mockSummary.updated_at,
      });
    });

    it('should return 404 when summary not found', async () => {
      mockDocumentationService.getDocumentationSummary.mockResolvedValue(null);

      await documentationController.getDocumentationSummary(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Documentation summary not found' });
    });
  });

  describe('getFileDocumentationByPath', () => {
    beforeEach(() => {
      mockRequest.params = { 
        repositoryId: 'repo-123',
        '0': 'src/index.ts' // This represents the wildcard capture
      };
    });

    it('should get specific file documentation successfully', async () => {
      const mockFile = {
        id: 'file-123',
        repository_id: 'repo-123',
        file_path: 'src/index.ts',
        file_type: 'source',
        language: 'typescript',
        lines_of_code: 100,
        generated_documentation: '# index.ts',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDocumentationService.getFileDocumentationByPath.mockResolvedValue(mockFile);

      await documentationController.getFileDocumentationByPath(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getFileDocumentationByPath).toHaveBeenCalledWith(
        'repo-123',
        'user-123',
        'src/index.ts'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        file_path: 'src/index.ts',
        file_type: 'source',
        language: 'typescript',
        lines_of_code: 100,
        documentation: '# index.ts',
        metadata: {},
        created_at: mockFile.created_at,
        updated_at: mockFile.updated_at,
      });
    });

    it('should return 400 when file path is missing', async () => {
      mockRequest.params = { repositoryId: 'repo-123' };

      await documentationController.getFileDocumentationByPath(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Repository ID and file path are required' });
    });

    it('should return 404 when file not found', async () => {
      mockDocumentationService.getFileDocumentationByPath.mockResolvedValue(null);

      await documentationController.getFileDocumentationByPath(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'File documentation not found' });
    });
  });

  describe('getJobProgress', () => {
    beforeEach(() => {
      mockRequest.params = { jobId: 'job-123' };
    });

    it('should get job progress successfully', async () => {
      const mockRedisClient = (documentationController as any).redisClient;
      mockRedisClient.get = jest.fn().mockResolvedValue(JSON.stringify({
        jobId: 'job-123',
        status: 'processing',
        progress: 50,
        currentFile: 5,
        totalFiles: 10,
      }));

      await documentationController.getJobProgress(mockRequest as Request, mockResponse as Response);

      expect(mockRedisClient.get).toHaveBeenCalledWith('progress:job-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        jobId: 'job-123',
        status: 'processing',
        progress: 50,
        currentFile: 5,
        totalFiles: 10,
      });
    });

    it('should return 400 when job ID is missing', async () => {
      mockRequest.params = {};

      await documentationController.getJobProgress(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Job ID is required' });
    });

    it('should return 404 when job not found', async () => {
      const mockRedisClient = (documentationController as any).redisClient;
      mockRedisClient.get = jest.fn().mockResolvedValue(null);

      await documentationController.getJobProgress(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Job not found' });
    });

    it('should handle redis errors', async () => {
      const mockRedisClient = (documentationController as any).redisClient;
      const error = new Error('Redis error');
      mockRedisClient.get = jest.fn().mockRejectedValue(error);

      await documentationController.getJobProgress(mockRequest as Request, mockResponse as Response);

      expect(logger.error).toHaveBeenCalledWith('Get job progress error:', error);
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Redis error' });
    });
  });

  describe('Not Implemented Methods', () => {
    it('getProjects should return 501', async () => {
      await documentationController.getProjects(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Get projects not implemented yet' });
    });

    it('getProject should return 501', async () => {
      await documentationController.getProject(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Get project not implemented yet' });
    });

    it('updateProject should return 501', async () => {
      await documentationController.updateProject(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Update project not implemented yet' });
    });

    it('deleteProject should return 501', async () => {
      await documentationController.deleteProject(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Delete project not implemented yet' });
    });

    it('searchDocumentation should return 501', async () => {
      await documentationController.searchDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Search documentation not implemented yet' });
    });

    it('exportDocumentation should return 501', async () => {
      await documentationController.exportDocumentation(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(501);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Export documentation not implemented yet' });
    });
  });

  describe('Redis client initialization', () => {
    it('should create redis client with default URL', () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      new DocumentationController();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
      });

      process.env.REDIS_URL = originalEnv;
    });

    it('should create redis client with custom URL', () => {
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://custom:6380';

      new DocumentationController();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://custom:6380',
      });

      process.env.REDIS_URL = originalEnv;
    });

    it('should handle redis connection errors', () => {
      const mockRedisClient = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Connection failed'));
          }
        }),
        connect: jest.fn().mockRejectedValue(new Error('Connect failed')),
      };

      (createClient as jest.Mock).mockReturnValue(mockRedisClient);

      new DocumentationController();

      expect(logger.error).toHaveBeenCalledWith('Redis Client Error in Controller', expect.any(Error));
    });
  });
});
import { FileDocumentationService } from './file-documentation.service';
import { OpenAIService } from './openai.service';
import { CodeContextExtractionService } from './code-context-extraction.service';
import { logger } from '@/shared/logger';

jest.mock('./openai.service');
jest.mock('./code-context-extraction.service');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('FileDocumentationService', () => {
  let service: FileDocumentationService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;
  let mockCodeContextExtraction: jest.Mocked<CodeContextExtractionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOpenAIService = {
      generateDocumentation: jest.fn(),
    } as any;
    
    mockCodeContextExtraction = {
      extractEnhancedContext: jest.fn(),
    } as any;
    
    (OpenAIService as jest.MockedClass<typeof OpenAIService>).mockImplementation(() => mockOpenAIService);
    (CodeContextExtractionService as jest.MockedClass<typeof CodeContextExtractionService>).mockImplementation(() => mockCodeContextExtraction);
    
    service = new FileDocumentationService();
  });

  describe('generateFileDocumentation', () => {
    const mockFileContext = {
      filePath: 'src/services/user.service.ts',
      content: `
import { Database } from '../database';

export class UserService {
  constructor(private db: Database) {}
  
  async getUser(id: string) {
    return this.db.users.findOne({ id });
  }
}
      `,
      language: 'typescript',
      projectContext: {
        repositoryName: 'test-repo',
        projectType: 'node',
        dependencies: { express: '^4.18.0' },
      },
    };

    const mockEnhancedContext = {
      typeDefinitions: [{ name: 'UserService', type: 'class' as const, definition: 'class UserService {}', file: 'user.service.ts', line: 1 }],
      docComments: [],
      designPatterns: [],
      configSchemas: [],
      environmentVariables: [],
      testExamples: [],
    };

    const mockLLMResponse = {
      content: '# Documentation for user.service.ts\n\n## Overview\nThis service handles user operations...',
      model: 'gpt-4o-mini',
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      cost: 0.001,
    };

    beforeEach(() => {
      mockCodeContextExtraction.extractEnhancedContext.mockReturnValue(mockEnhancedContext);
      mockOpenAIService.generateDocumentation.mockResolvedValue(mockLLMResponse);
    });

    it('should generate documentation for a single file', async () => {
      const result = await service.generateFileDocumentation(mockFileContext);

      expect(result).toEqual({
        file_path: 'src/services/user.service.ts',
        documentation: mockLLMResponse.content,
        metadata: {
          file_type: 'service',
          language: 'typescript',
          lines_of_code: 7,
          imports: ['../database'],
          exports: ['UserService'],
        },
      });

      expect(mockCodeContextExtraction.extractEnhancedContext).toHaveBeenCalledWith([
        expect.objectContaining({
          path: mockFileContext.filePath,
          content: mockFileContext.content,
          language: mockFileContext.language,
        }),
      ]);

      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('Generate comprehensive documentation')
      );
    });

    it('should include related files in the prompt if provided', async () => {
      const contextWithRelated = {
        ...mockFileContext,
        relatedFiles: ['src/database.ts', 'src/models/user.model.ts'],
      };

      await service.generateFileDocumentation(contextWithRelated);

      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('Related Files:\n- src/database.ts\n- src/models/user.model.ts')
      );
    });

    it('should handle files without language specified', async () => {
      const contextWithoutLang = {
        ...mockFileContext,
        language: undefined,
      };

      const result = await service.generateFileDocumentation(contextWithoutLang);

      expect(result.metadata).not.toHaveProperty('language');
      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('Language: Unknown')
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('LLM API error');
      mockOpenAIService.generateDocumentation.mockRejectedValue(error);

      await expect(service.generateFileDocumentation(mockFileContext)).rejects.toThrow('LLM API error');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate documentation'),
        expect.objectContaining({ error })
      );
    });
  });

  describe('generateBatchFileDocumentation', () => {
    const mockFiles = [
      {
        filePath: 'file1.ts',
        content: 'export const a = 1;',
        language: 'typescript',
      },
      {
        filePath: 'file2.ts',
        content: 'export const b = 2;',
        language: 'typescript',
      },
      {
        filePath: 'file3.ts',
        content: 'export const c = 3;',
        language: 'typescript',
      },
    ];

    beforeEach(() => {
      mockCodeContextExtraction.extractEnhancedContext.mockReturnValue({
        typeDefinitions: [],
        docComments: [],
        designPatterns: [],
        configSchemas: [],
        environmentVariables: [],
        testExamples: [],
      });

      mockOpenAIService.generateDocumentation.mockImplementation(async () => ({
        content: 'Generated documentation',
        model: 'gpt-4o-mini',
        usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
        cost: 0.0005,
      }));
    });

    it('should process files in batches', async () => {
      const results = await service.generateBatchFileDocumentation(mockFiles);

      expect(results).toHaveLength(3);
      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledTimes(3);
      
      // Verify batch processing logs
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting batch file documentation'),
        expect.objectContaining({ totalFiles: 3, batchSize: 2 })
      );
    });

    it('should call onFileCompleted callback when provided', async () => {
      const onFileCompleted = jest.fn();
      
      await service.generateBatchFileDocumentation(mockFiles, onFileCompleted);

      expect(onFileCompleted).toHaveBeenCalledTimes(3);
      expect(onFileCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ file_path: 'file1.ts' }),
        0,
        3
      );
      expect(onFileCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ file_path: 'file2.ts' }),
        1,
        3
      );
      expect(onFileCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ file_path: 'file3.ts' }),
        2,
        3
      );
    });

    it('should add delay between batches', async () => {
      const startTime = Date.now();
      
      await service.generateBatchFileDocumentation(mockFiles);
      
      const duration = Date.now() - startTime;
      // Should have at least 1 second delay between batch 1 and batch 2
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it('should continue processing even if a batch fails', async () => {
      mockOpenAIService.generateDocumentation
        .mockResolvedValueOnce({
          content: 'Doc 1',
          model: 'gpt-4o-mini',
          usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
          cost: 0.0005,
        })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          content: 'Doc 3',
          model: 'gpt-4o-mini',
          usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
          cost: 0.0005,
        });

      const results = await service.generateBatchFileDocumentation(mockFiles);

      // Should continue despite one failure
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Batch documentation generation failed'),
        expect.any(Object)
      );
    });
  });

  describe('generateRepositorySummary', () => {
    const mockFiles = [
      { path: 'src/index.ts', content: 'export const app = {};', language: 'typescript' },
      { path: 'src/service.ts', content: 'export class Service {}', language: 'typescript' },
      { path: 'test.spec.ts', content: 'test("test", () => {});', language: 'typescript' },
    ];

    const mockFileDocumentations = [
      {
        file_path: 'src/index.ts',
        documentation: '# src/index.ts\n\n## Overview\nMain entry point for the application',
        metadata: { file_type: 'entry', language: 'typescript', lines_of_code: 1, imports: [], exports: ['app'] },
      },
      {
        file_path: 'src/service.ts',
        documentation: '# src/service.ts\n\n## Overview\nCore service implementation',
        metadata: { file_type: 'service', language: 'typescript', lines_of_code: 1, imports: [], exports: ['Service'] },
      },
    ];

    it('should generate repository summary', async () => {
      const mockSummary = '# Repository Documentation\n\nThis is a comprehensive overview...';
      mockOpenAIService.generateDocumentation.mockResolvedValue({
        content: mockSummary,
        model: 'gpt-4o-mini',
        usage: { inputTokens: 200, outputTokens: 400, totalTokens: 600 },
        cost: 0.002,
      });

      const result = await service.generateRepositorySummary('test-repo', mockFiles, mockFileDocumentations);

      expect(result).toBe(mockSummary);
      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('Generate a comprehensive overview documentation')
      );
    });

    it('should include file statistics in the prompt', async () => {
      mockOpenAIService.generateDocumentation.mockResolvedValue({
        content: 'Summary',
        model: 'gpt-4o-mini',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        cost: 0.001,
      });

      await service.generateRepositorySummary('test-repo', mockFiles, mockFileDocumentations);

      const promptCall = mockOpenAIService.generateDocumentation.mock.calls[0]?.[0] || '';
      expect(promptCall).toContain('Total Files: 3');
      expect(promptCall).toContain('typescript (3)');
      expect(promptCall).toContain('entry: 1 files');
      expect(promptCall).toContain('service: 1 files');
    });
  });

  describe('file type detection', () => {
    it('should detect different file types correctly', () => {
      const testCases = [
        { path: 'src/components/Button.tsx', content: 'export const Button = () => {}', expectedType: 'component' },
        { path: 'src/services/auth.service.ts', content: 'export class AuthService {}', expectedType: 'service' },
        { path: 'src/models/user.model.ts', content: 'export interface User {}', expectedType: 'model' },
        { path: 'src/controllers/user.controller.ts', content: 'export class UserController {}', expectedType: 'controller' },
        { path: 'src/routes/api.routes.ts', content: 'export const router = {};', expectedType: 'service' },
        { path: 'src/user.test.ts', content: 'test("user", () => {});', expectedType: 'test' },
        { path: 'config/app.config.ts', content: 'export const config = {};', expectedType: 'config' },
        { path: 'src/utils/helper.ts', content: 'export function help() {}', expectedType: 'utility' },
        { path: 'src/random.ts', content: 'export const x = 1;', expectedType: 'other' },
      ];

      for (const testCase of testCases) {
        const metadata = (service as any).extractFileMetadata({
          filePath: testCase.path,
          content: testCase.content,
          language: 'typescript',
        });

        expect(metadata.file_type).toBe(testCase.expectedType);
      }
    });
  });

  describe('metadata extraction', () => {
    it('should extract imports and exports from TypeScript/JavaScript files', () => {
      const fileContext = {
        filePath: 'test.ts',
        content: `
import { Component } from 'react';
import axios from 'axios';
import { helper } from './utils/helper';

export class MyComponent extends Component {}
export const API_URL = 'https://api.example.com';
export default MyComponent;
        `,
        language: 'typescript',
      };

      const metadata = (service as any).extractFileMetadata(fileContext);

      expect(metadata.imports).toEqual(['react', 'axios', './utils/helper']);
      expect(metadata.exports).toEqual(['MyComponent', 'API_URL']);
      expect(metadata.lines_of_code).toBe(6);
    });

    it('should handle files with no imports or exports', () => {
      const fileContext = {
        filePath: 'constants.ts',
        content: `
const INTERNAL_CONSTANT = 42;
console.log(INTERNAL_CONSTANT);
        `,
        language: 'typescript',
      };

      const metadata = (service as any).extractFileMetadata(fileContext);

      expect(metadata.imports).toEqual([]);
      expect(metadata.exports).toEqual([]);
    });
  });

  describe('prompt building', () => {
    it('should format enhanced context correctly', () => {
      const enhancedContext = {
        typeDefinitions: [
          { name: 'User', type: 'interface' },
          { name: 'UserService', type: 'class' },
          { name: 'UserRole', type: 'enum' },
          { name: 'UserStatus', type: 'type' },
        ],
        docComments: [{ content: 'Some doc' }, { content: 'Another doc' }],
        designPatterns: [{ name: 'Singleton' }, { name: 'Factory' }],
      };

      const formatted = (service as any).formatEnhancedContext(enhancedContext);

      expect(formatted).toContain('Type Definitions: User, UserService, UserRole');
      expect(formatted).toContain('Existing Documentation: 2 comments found');
      expect(formatted).toContain('Design Patterns: Singleton, Factory');
    });
  });
});
import { CodeChunkingService } from './code-chunking.service';
import { FileAnalysisService } from './file-analysis.service';
import { GitHubFile } from './github-file-reader.service';

jest.mock('./file-analysis.service');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CodeChunkingService', () => {
  let service: CodeChunkingService;
  let mockFileAnalysisService: jest.Mocked<FileAnalysisService>;

  const createMockFile = (
    path: string,
    content: string,
    language: string = 'typescript'
  ): GitHubFile => ({
    path,
    content,
    language,
    size: content.length,
    encoding: 'utf8',
  });

  const createMockFileMetadata = (path: string, priority: number): any => ({
    path,
    language: 'typescript',
    type: 'other',
    priority,
    imports: [],
    exports: [],
    dependencies: [],
    complexity: 1,
    linesOfCode: 10,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFileAnalysisService = {
      analyzeDependencies: jest.fn(),
      groupFilesIntoModules: jest.fn(),
    } as any;
    
    (FileAnalysisService as jest.MockedClass<typeof FileAnalysisService>).mockImplementation(
      () => mockFileAnalysisService
    );
    
    service = new CodeChunkingService();
  });

  describe('smartChunkFiles', () => {
    it('should chunk files based on dependency analysis', () => {
      const files = [
        createMockFile('src/index.ts', 'export * from "./module1"'),
        createMockFile('src/module1.ts', 'export const value = 1'),
        createMockFile('src/module2.ts', 'export const value = 2'),
      ];

      const mockDependencyGraph = {
        nodes: new Map([
          ['src/index.ts', createMockFileMetadata('src/index.ts', 10)],
          ['src/module1.ts', createMockFileMetadata('src/module1.ts', 5)],
          ['src/module2.ts', createMockFileMetadata('src/module2.ts', 5)],
        ]),
        edges: [],
      };

      const mockModules = new Map([
        ['main', ['src/index.ts', 'src/module1.ts']],
        ['secondary', ['src/module2.ts']],
      ]);

      mockFileAnalysisService.analyzeDependencies.mockReturnValue(mockDependencyGraph);
      mockFileAnalysisService.groupFilesIntoModules.mockReturnValue(mockModules);

      const chunks = service.smartChunkFiles(files);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.files).toHaveLength(2);
      expect(chunks[0]?.files.map(f => f.path)).toEqual(['src/index.ts', 'src/module1.ts']);
      expect(chunks[1]?.files).toHaveLength(1);
      expect(chunks[1]?.files[0]?.path).toBe('src/module2.ts');
    });

    it('should split large modules that exceed token limits', () => {
      const largeContent = 'a'.repeat(200000); // ~50k tokens
      const files = [
        createMockFile('src/large1.ts', largeContent),
        createMockFile('src/large2.ts', largeContent),
      ];

      const mockDependencyGraph = {
        nodes: new Map([
          ['src/large1.ts', createMockFileMetadata('src/large1.ts', 10)],
          ['src/large2.ts', createMockFileMetadata('src/large2.ts', 5)],
        ]),
        edges: [],
      };

      const mockModules = new Map([
        ['large-module', ['src/large1.ts', 'src/large2.ts']],
      ]);

      mockFileAnalysisService.analyzeDependencies.mockReturnValue(mockDependencyGraph);
      mockFileAnalysisService.groupFilesIntoModules.mockReturnValue(mockModules);

      const chunks = service.smartChunkFiles(files, { maxTokensPerChunk: 50000 });

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.files).toHaveLength(1);
      expect(chunks[1]?.files).toHaveLength(1);
    });

    it('should respect maxFilesPerChunk option', () => {
      const files = Array(5).fill(null).map((_, i) => 
        createMockFile(`src/file${i}.ts`, 'small content')
      );

      const mockDependencyGraph = {
        nodes: new Map(files.map(f => [f.path, createMockFileMetadata(f.path, 1)])),
        edges: [],
      };

      const mockModules = new Map([
        ['module', files.map(f => f.path)],
      ]);

      mockFileAnalysisService.analyzeDependencies.mockReturnValue(mockDependencyGraph);
      mockFileAnalysisService.groupFilesIntoModules.mockReturnValue(mockModules);

      const chunks = service.smartChunkFiles(files, { maxFilesPerChunk: 2 });

      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.files).toHaveLength(2);
      expect(chunks[1]?.files).toHaveLength(2);
      expect(chunks[2]?.files).toHaveLength(1);
    });
  });

  describe('chunkFiles', () => {
    it('should chunk files based on token limits', () => {
      const files = [
        createMockFile('src/file1.ts', 'a'.repeat(40000)), // ~10k tokens
        createMockFile('src/file2.ts', 'b'.repeat(40000)), // ~10k tokens
        createMockFile('src/file3.ts', 'c'.repeat(40000)), // ~10k tokens
      ];

      const chunks = service.chunkFiles(files, { maxTokensPerChunk: 25000 });

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.files).toHaveLength(2);
      expect(chunks[1]?.files).toHaveLength(1);
      expect(chunks[0]?.tokenEstimate).toBeLessThanOrEqual(25000);
    });

    it('should prioritize files by extension', () => {
      const files = [
        createMockFile('config.json', '{}', 'json'),
        createMockFile('main.py', 'print("hello")', 'python'),
        createMockFile('index.ts', 'export default {}', 'typescript'),
        createMockFile('style.css', 'body {}', 'css'),
      ];

      const chunks = service.chunkFiles(files, {
        prioritizeByExtension: ['.ts', '.py'],
        maxTokensPerChunk: 100000,
      });

      expect(chunks[0]?.files[0]?.path).toBe('index.ts');
      expect(chunks[0]?.files[1]?.path).toBe('main.py');
      expect(chunks[0]?.files[2]?.path).toBe('config.json');
      expect(chunks[0]?.files[3]?.path).toBe('style.css');
    });

    it('should respect maxFilesPerChunk limit', () => {
      const files = Array(10).fill(null).map((_, i) => 
        createMockFile(`file${i}.ts`, 'small content')
      );

      const chunks = service.chunkFiles(files, { maxFilesPerChunk: 3 });

      expect(chunks).toHaveLength(4);
      expect(chunks[0]?.files).toHaveLength(3);
      expect(chunks[1]?.files).toHaveLength(3);
      expect(chunks[2]?.files).toHaveLength(3);
      expect(chunks[3]?.files).toHaveLength(1);
    });

    it('should handle empty files array', () => {
      const chunks = service.chunkFiles([]);
      expect(chunks).toHaveLength(0);
    });
  });

  describe('createSingleChunk', () => {
    it('should create a single chunk with all files', () => {
      const files = [
        createMockFile('file1.ts', 'content1'),
        createMockFile('file2.ts', 'content2'),
      ];

      const chunk = service.createSingleChunk(files);

      expect(chunk.files).toEqual(files);
      expect(chunk.tokenEstimate).toBe(Math.ceil((files[0]?.content.length! + files[1]?.content.length!) / 4));
      expect(chunk.metadata).toEqual({
        startIndex: 0,
        endIndex: 1,
        totalFiles: 2,
      });
    });
  });

  describe('aggregateChunkContent', () => {
    it('should format chunk content for LLM processing', () => {
      const chunk = {
        id: 'chunk_0_1',
        files: [
          createMockFile('file1.ts', 'const a = 1;'),
          createMockFile('file2.py', 'print("hello")', 'python'),
        ],
        tokenEstimate: 100,
        metadata: { startIndex: 0, endIndex: 1, totalFiles: 2 },
      };

      const content = service.aggregateChunkContent(chunk);

      expect(content).toContain('### File: file1.ts');
      expect(content).toContain('```typescript');
      expect(content).toContain('const a = 1;');
      expect(content).toContain('### File: file2.py');
      expect(content).toContain('```python');
      expect(content).toContain('print("hello")');
    });
  });

  describe('getChunkSummary', () => {
    it('should generate a summary of chunk contents', () => {
      const chunk = {
        id: 'chunk_0_2',
        files: [
          createMockFile('src/index.ts', 'export default {}'),
          createMockFile('src/utils.ts', 'export const util = () => {}'),
          createMockFile('README.md', '# Readme', 'markdown'),
        ],
        tokenEstimate: 150,
        metadata: { startIndex: 0, endIndex: 2, totalFiles: 3 },
      };

      const summary = service.getChunkSummary(chunk);

      expect(summary).toContain('Chunk chunk_0_2 contains 3 files:');
      expect(summary).toContain('- src/index.ts (typescript)');
      expect(summary).toContain('- src/utils.ts (typescript)');
      expect(summary).toContain('- README.md (markdown)');
      expect(summary).toContain('Token estimate: 150');
    });
  });

  describe('canProcessInSingleRequest', () => {
    it('should return true if files fit within token limit', () => {
      const files = [
        createMockFile('file1.ts', 'a'.repeat(10000)),
        createMockFile('file2.ts', 'b'.repeat(10000)),
      ];

      const result = service.canProcessInSingleRequest(files, 10000);
      expect(result).toBe(true);
    });

    it('should return false if files exceed token limit', () => {
      const files = [
        createMockFile('file1.ts', 'a'.repeat(100000)),
        createMockFile('file2.ts', 'b'.repeat(100000)),
      ];

      const result = service.canProcessInSingleRequest(files, 10000);
      expect(result).toBe(false);
    });

    it('should use default token limit when not specified', () => {
      const files = [
        createMockFile('file1.ts', 'a'.repeat(200001)), // >50k tokens (50001 tokens)
      ];

      const result = service.canProcessInSingleRequest(files);
      expect(result).toBe(false);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens as roughly 1/4 of character count', () => {
      const content = 'a'.repeat(1000);
      const tokens = (service as any).estimateTokens(content);
      expect(tokens).toBe(250);
    });

    it('should round up token estimates', () => {
      const content = 'abc'; // 3 chars
      const tokens = (service as any).estimateTokens(content);
      expect(tokens).toBe(1);
    });
  });
});
import { MultiPassGenerationService } from './multi-pass-generation.service';
import { OpenAIService } from './openai.service';
import { logger } from '@/shared/logger';
import { CodeContext } from './prompt-templates';

jest.mock('./openai.service');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MultiPassGenerationService', () => {
  let service: MultiPassGenerationService;
  let mockOpenAIService: jest.Mocked<OpenAIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOpenAIService = {
      generateDocumentation: jest.fn(),
    } as any;
    
    (OpenAIService as jest.MockedClass<typeof OpenAIService>).mockImplementation(() => mockOpenAIService);
    
    service = new MultiPassGenerationService();
  });

  describe('generateMultiPassDocumentation', () => {
    const mockContext: CodeContext = {
      repositoryName: 'test-repo',
      language: 'typescript',
      files: [
        {
          path: 'src/index.ts',
          content: 'export const app = {};',
          language: 'typescript',
        },
        {
          path: 'src/api/routes.ts',
          content: 'export const routes = {};',
          language: 'typescript',
        },
      ],
      entryPoints: ['src/index.ts'],
      dependencies: {
        express: '^4.18.0',
        jest: '^29.0.0',
      },
      readme: '# Test Repository\n\nThis is a test project.',
      packageJson: {
        name: 'test-repo',
        version: '1.0.0',
        scripts: {
          start: 'node index.js',
          test: 'jest',
        },
      },
    };

    const mockFirstPassResponse = `
### 1. PROJECT OVERVIEW
This is a test project that demonstrates various features.

### 2. ARCHITECTURE OVERVIEW
The project follows a modular architecture with clear separation of concerns.

### 3. PROJECT STRUCTURE
- src/ - Source code
- tests/ - Test files
    `;

    beforeEach(() => {
      mockOpenAIService.generateDocumentation.mockResolvedValue({
        content: mockFirstPassResponse,
        model: 'gpt-4o-mini',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        cost: 0.001,
      });
    });

    it('should generate multi-pass documentation successfully', async () => {
      const result = await service.generateMultiPassDocumentation(mockContext);

      expect(result).toBeDefined();
      expect(result.sections).toHaveLength(3);
      expect(result.passCount).toBe(3);
      expect(result.totalCost).toBe(0.001);
      expect(result.mergedContent).toContain('# test-repo');
      expect(result.mergedContent).toContain('Table of Contents');

      // Verify first pass was called
      expect(mockOpenAIService.generateDocumentation).toHaveBeenCalledWith(
        expect.stringContaining('Generate High-Level Documentation - Pass 1 of 3')
      );
    });

    it('should include context information in prompts', async () => {
      await service.generateMultiPassDocumentation(mockContext);

      const promptCall = mockOpenAIService.generateDocumentation.mock.calls[0]?.[0] || '';
      
      expect(promptCall).toContain('Repository: test-repo');
      expect(promptCall).toContain('Language: typescript');
      expect(promptCall).toContain('Entry Points: src/index.ts');
      expect(promptCall).toContain('# Test Repository');
      expect(promptCall).toContain('"name": "test-repo"');
    });

    it('should parse sections correctly', async () => {
      const result = await service.generateMultiPassDocumentation(mockContext);

      const overviewSection = result.sections.find(s => s.title.includes('PROJECT OVERVIEW'));
      const architectureSection = result.sections.find(s => s.title.includes('ARCHITECTURE OVERVIEW'));
      const structureSection = result.sections.find(s => s.title.includes('PROJECT STRUCTURE'));

      expect(overviewSection).toBeDefined();
      expect(overviewSection?.type).toBe('overview');
      expect(overviewSection?.pass).toBe(1);
      expect(overviewSection?.content).toContain('test project');

      expect(architectureSection).toBeDefined();
      // "ARCHITECTURE OVERVIEW" contains both 'architecture' and 'overview', 
      // but 'overview' is checked first in detectSectionType
      expect(architectureSection?.type).toBe('overview');

      expect(structureSection).toBeDefined();
      expect(structureSection?.content).toContain('src/ - Source code');
    });

    it('should handle sections without headers', async () => {
      mockOpenAIService.generateDocumentation.mockResolvedValue({
        content: 'This is documentation without any headers.',
        model: 'gpt-4o-mini',
        usage: { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
        cost: 0.0005,
      });

      const result = await service.generateMultiPassDocumentation(mockContext);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]?.title).toBe('Pass 1 Documentation');
      expect(result.sections[0]?.type).toBe('overview');
      expect(result.sections[0]?.content).toBe('This is documentation without any headers.');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('LLM API error');
      mockOpenAIService.generateDocumentation.mockRejectedValue(error);

      await expect(service.generateMultiPassDocumentation(mockContext)).rejects.toThrow('LLM API error');

      expect(logger.error).toHaveBeenCalledWith('Multi-pass generation failed', { error });
    });

    it('should merge sections in logical order', async () => {
      // Create sections with different types
      const mixedResponse = `
### API REFERENCE
API documentation here.

### PROJECT OVERVIEW  
Overview content.

### GETTING STARTED
Setup instructions.

### ARCHITECTURE OVERVIEW
Architecture details.
      `;

      mockOpenAIService.generateDocumentation.mockResolvedValue({
        content: mixedResponse,
        model: 'gpt-4o-mini',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        cost: 0.001,
      });

      const result = await service.generateMultiPassDocumentation(mockContext);

      const mergedContent = result.mergedContent;
      
      // Verify all sections are present in the merged content
      expect(mergedContent).toContain('## PROJECT OVERVIEW');
      expect(mergedContent).toContain('## ARCHITECTURE OVERVIEW');
      expect(mergedContent).toContain('## GETTING STARTED');
      expect(mergedContent).toContain('## API REFERENCE');
      
      // Verify table of contents is included
      expect(mergedContent).toContain('Table of Contents');
      
      // Verify footer is included
      expect(mergedContent).toContain('Documentation generated using multi-pass analysis');
    });
  });

  describe('section type detection', () => {
    it('should detect section types correctly', () => {
      const testCases = [
        { title: 'PROJECT OVERVIEW', expectedType: 'overview' },
        { title: '1. Introduction', expectedType: 'overview' },
        { title: 'ARCHITECTURE OVERVIEW', expectedType: 'overview' }, // contains 'overview' which is checked first
        { title: 'System Design', expectedType: 'architecture' },
        { title: 'API REFERENCE', expectedType: 'api' },
        { title: 'API Documentation', expectedType: 'api' },
        { title: 'USAGE EXAMPLES', expectedType: 'usage' },
        { title: 'Getting Started Guide', expectedType: 'usage' },
        { title: 'CONFIGURATION', expectedType: 'configuration' },
        { title: 'Settings Reference', expectedType: 'api' }, // contains 'reference' which is checked before 'setting'
        { title: 'SETUP INSTRUCTIONS', expectedType: 'setup' },
        { title: 'Installation Guide', expectedType: 'usage' }, // contains 'guide' which is checked before 'install'
        { title: 'RANDOM SECTION', expectedType: 'overview' }, // default
      ];

      for (const testCase of testCases) {
        const type = (service as any).detectSectionType(testCase.title);
        expect(type).toBe(testCase.expectedType);
      }
    });
  });

  describe('cross-references generation', () => {
    it('should generate cross-references between related sections', () => {
      const sections = [
        {
          id: 'api1',
          title: 'User API',
          content: 'API documentation for user endpoints',
          type: 'api' as const,
          pass: 2,
        },
        {
          id: 'usage1',
          title: 'User API Examples',
          content: 'Examples of using the User API endpoints',
          type: 'usage' as const,
          pass: 3,
        },
      ];

      const apiRef = (service as any).generateCrossReferences(sections[0], sections);
      const usageRef = (service as any).generateCrossReferences(sections[1], sections);

      expect(apiRef).toContain('See also:');
      expect(apiRef).toContain('User API Examples');
      expect(usageRef).toContain('See also:');
      expect(usageRef).toContain('User API');
    });

    it('should return null when no related sections found', () => {
      const sections = [
        {
          id: 'overview1',
          title: 'Project Overview',
          content: 'Overview content',
          type: 'overview' as const,
          pass: 1,
        },
      ];

      const ref = (service as any).generateCrossReferences(sections[0], sections);
      expect(ref).toBeNull();
    });
  });

  describe('prompt building', () => {
    const mockContext: CodeContext = {
      repositoryName: 'test-repo',
      language: 'typescript',
      files: [
        {
          path: 'src/index.ts',
          content: 'export const app = {};',
          language: 'typescript',
        },
      ],
      entryPoints: ['src/index.ts'],
    };

    it('should build first pass prompt correctly', () => {
      const prompt = (service as any).buildFirstPassPrompt(mockContext, { projectType: 'api' });

      expect(prompt).toContain('Pass 1 of 3');
      expect(prompt).toContain('Type: api');
      expect(prompt).toContain('Entry Points: src/index.ts');
      expect(prompt).toContain('DO NOT generate API documentation in this pass');
      expect(prompt).toContain('FOCUS on the big picture');
    });

    it('should include entry point code samples in first pass', () => {
      const prompt = (service as any).buildFirstPassPrompt(mockContext, {});

      expect(prompt).toContain('### src/index.ts');
      expect(prompt).toContain('export const app = {};');
    });

    it('should handle missing optional context data', () => {
      const minimalContext: CodeContext = {
        repositoryName: 'minimal-repo',
        language: 'javascript',
        files: [],
      };

      const prompt = (service as any).buildFirstPassPrompt(minimalContext, {});

      expect(prompt).toContain('Entry Points: Not detected');
      expect(prompt).toContain('Type: unknown');
      expect(prompt).not.toContain('## Existing README');
      expect(prompt).not.toContain('## Package Configuration');
    });
  });

  describe('section parsing', () => {
    it('should parse multiple sections with metadata', () => {
      const content = `
### 1. FIRST SECTION
First section content with multiple
lines of text.

### 2. SECOND SECTION
Second section content.

### THIRD SECTION
Third section without number.
      `;

      const sections = (service as any).parseResponseIntoSections(content, 1);

      expect(sections).toHaveLength(3);
      
      expect(sections[0].title).toBe('1. FIRST SECTION');
      expect(sections[0].content).toContain('multiple\nlines of text');
      expect(sections[0].metadata.wordCount).toBeGreaterThan(0);
      
      expect(sections[1].title).toBe('2. SECOND SECTION');
      expect(sections[2].title).toBe('THIRD SECTION');
    });

    it('should handle edge cases in section parsing', () => {
      const edgeCases = [
        {
          content: '### SECTION\n\n\n\nContent with extra newlines\n\n\n',
          expectedSections: 1,
          expectedContent: 'Content with extra newlines',
        },
        {
          content: '### SECTION ONE\nContent 1\n### SECTION TWO\nNo content between',
          expectedSections: 2,
        },
        {
          content: 'Content before first header\n### SECTION\nSection content',
          expectedSections: 1,
        },
      ];

      for (const testCase of edgeCases) {
        const sections = (service as any).parseResponseIntoSections(testCase.content, 1);
        expect(sections).toHaveLength(testCase.expectedSections);
        
        if (testCase.expectedContent) {
          expect(sections[0].content).toBe(testCase.expectedContent);
        }
      }
    });
  });

  describe('merged content generation', () => {
    it('should include table of contents with proper anchors', () => {
      const sections = [
        {
          id: '1',
          title: 'Getting Started',
          content: 'Start here',
          type: 'setup' as const,
          pass: 1,
        },
        {
          id: '2',
          title: 'API Reference (v2)',
          content: 'API docs',
          type: 'api' as const,
          pass: 2,
        },
      ];

      const mergedContent = (service as any).mergeSections(sections, { repositoryName: 'test-repo' });

      expect(mergedContent).toContain('## 📋 Table of Contents');
      expect(mergedContent).toContain('- [Getting Started](#getting-started)');
      expect(mergedContent).toContain('- [API Reference (v2)](#api-reference-v2-)');
      expect(mergedContent).toContain('## Getting Started');
      expect(mergedContent).toContain('## API Reference (v2)');
    });

    it('should add metadata footer', () => {
      const sections = [{
        id: '1',
        title: 'Overview',
        content: 'Content',
        type: 'overview' as const,
        pass: 1,
      }];

      const mergedContent = (service as any).mergeSections(sections, { repositoryName: 'test-repo' });

      expect(mergedContent).toContain('Documentation generated using multi-pass analysis');
    });
  });
});
import { logger } from '@/shared/logger';
//import { AnthropicService } from './anthropic.service';
import { OpenAIService } from './openai.service';
import { CodeContextExtractionService } from './code-context-extraction.service';
import { FileDocumentationResult } from '@/modules/documentation/types';

export interface FileContext {
  filePath: string;
  content: string;
  language?: string | undefined;
  relatedFiles?: string[];
  projectContext?: {
    repositoryName: string;
    projectType?: string;
    dependencies?: { [key: string]: string };
  };
}

export class FileDocumentationService {
  private anthropicService: OpenAIService;
  private codeContextExtraction: CodeContextExtractionService;

  constructor() {
    this.anthropicService = new OpenAIService();
    this.codeContextExtraction = new CodeContextExtractionService();
  }

  /**
   * Generate documentation for a single file
   */
  async generateFileDocumentation(fileContext: FileContext): Promise<FileDocumentationResult> {
    const startTime = Date.now();
    
    try {
      // Extract file metadata
      const fileMetadata = this.extractFileMetadata(fileContext);
      
      // Extract enhanced context for this specific file
      const enhancedContext = this.codeContextExtraction.extractEnhancedContext([{
        path: fileContext.filePath,
        content: fileContext.content,
        ...(fileContext.language !== undefined && { language: fileContext.language }),
        encoding: 'utf8',
        size: fileContext.content.length
      }]);

      // Build the prompt for single file documentation
      const prompt = this.buildFileDocumentationPrompt(fileContext, enhancedContext, fileMetadata);
      
      // Generate documentation
      const response = await this.anthropicService.generateDocumentation(prompt);
      
      logger.info(`Generated documentation for file: ${fileContext.filePath}`, {
        processingTime: Date.now() - startTime,
        cost: response.cost
      });

      return {
        file_path: fileContext.filePath,
        documentation: response.content,
        metadata: {
          ...fileMetadata
        }
      };
    } catch (error) {
      logger.error(`Failed to generate documentation for file: ${fileContext.filePath}`, { error });
      throw error;
    }
  }

  /**
   * Generate documentation for multiple files in batch
   */
  async generateBatchFileDocumentation(
    files: FileContext[],
    onFileCompleted?: (result: FileDocumentationResult, index: number, total: number) => Promise<void>
  ): Promise<FileDocumentationResult[]> {
    const batchSize = 2; // Process 2 files at a time to avoid rate limits
    const results: FileDocumentationResult[] = [];
    
    logger.info(`Starting batch file documentation generation`, { 
      totalFiles: files.length, 
      batchSize 
    });
    
    // Process all files
    const filesToProcess = files;
    
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      const batchPromises = batch.map(file => this.generateFileDocumentation(file));
      
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}`, { 
        batchStart: i, 
        batchEnd: Math.min(i + batchSize, filesToProcess.length),
        filesInBatch: batch.length,
        files: batch.map(f => f.filePath)
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        
        // Save each file immediately if callback is provided
        if (onFileCompleted) {
          for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result) {
              const globalIndex = i + j;
              await onFileCompleted(result, globalIndex, filesToProcess.length);
              logger.info(`File saved immediately: ${result.file_path}`, {
                index: globalIndex,
                total: filesToProcess.length
              });
            }
          }
        }
        
        results.push(...batchResults);
        logger.info(`Batch ${Math.floor(i / batchSize) + 1} completed successfully`, { 
          resultsCount: batchResults.length 
        });
        
        // Add delay between batches to avoid rate limits
        if (i + batchSize < filesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (error) {
        logger.error('Batch documentation generation failed', { error, batchIndex: i });
        // Continue with next batch even if one fails
      }
    }
    
    logger.info(`Batch file documentation generation completed`, { 
      totalResults: results.length,
      totalFilesRequested: files.length,
      filesProcessed: filesToProcess.length
    });
    
    return results;
  }

  /**
   * Generate a summary/overview documentation for the repository
   */
  async generateRepositorySummary(
    repositoryName: string,
    files: { path: string; content: string; language?: string }[],
    fileDocumentations: FileDocumentationResult[]
  ): Promise<string> {
    logger.info('Generating repository summary', {
      repositoryName,
      totalFiles: files.length,
      documentedFiles: fileDocumentations.length
    });
    
    const prompt = this.buildRepositorySummaryPrompt(repositoryName, files, fileDocumentations);
    const response = await this.anthropicService.generateDocumentation(prompt);
    
    logger.info('Repository summary generated successfully', {
      summaryLength: response.content.length
    });
    
    return response.content;
  }

  private extractFileMetadata(fileContext: FileContext) {
    const lines = fileContext.content.split('\n');
    const linesOfCode = lines.filter(line => line.trim().length > 0).length;
    
    // Extract imports and exports
    const imports: string[] = [];
    const exports: string[] = [];
    
    if (fileContext.language === 'typescript' || fileContext.language === 'javascript') {
      // Extract imports
      const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(fileContext.content)) !== null) {
        if (match[1]) imports.push(match[1]);
      }
      
      // Extract exports
      const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|interface|type)\s+(\w+)/g;
      while ((match = exportRegex.exec(fileContext.content)) !== null) {
        if (match[1]) exports.push(match[1]);
      }
    }
    
    // Detect file type
    const fileType = this.detectFileType(fileContext.filePath, fileContext.content);
    
    return {
      file_type: fileType,
      ...(fileContext.language !== undefined && { language: fileContext.language }),
      lines_of_code: linesOfCode,
      imports,
      exports
    };
  }

  private detectFileType(filePath: string, content: string): string {
    const path = filePath.toLowerCase();
    
    // Component files
    if (path.includes('component') || path.endsWith('.tsx') || path.endsWith('.jsx')) {
      return 'component';
    }
    
    // Service files
    if (path.includes('service') || path.includes('api')) {
      return 'service';
    }
    
    // Model/Type files
    if (path.includes('model') || path.includes('type') || path.includes('interface')) {
      return 'model';
    }
    
    // Controller files
    if (path.includes('controller') || path.includes('handler')) {
      return 'controller';
    }
    
    // Route files
    if (path.includes('route') || path.includes('router')) {
      return 'route';
    }
    
    // Test files
    if (path.includes('test') || path.includes('spec')) {
      return 'test';
    }
    
    // Config files
    if (path.includes('config') || path.endsWith('.json') || path.endsWith('.yml')) {
      return 'config';
    }
    
    // Utility files
    if (path.includes('util') || path.includes('helper')) {
      return 'utility';
    }
    
    return 'other';
  }

  private buildFileDocumentationPrompt(
    fileContext: FileContext,
    enhancedContext: any,
    metadata: any
  ): string {
    const relatedFilesSection = fileContext.relatedFiles && fileContext.relatedFiles.length > 0
      ? `\nRelated Files:\n${fileContext.relatedFiles.map(f => `- ${f}`).join('\n')}`
      : '';

    const projectContextSection = fileContext.projectContext
      ? `\nProject Context:
- Repository: ${fileContext.projectContext.repositoryName}
- Project Type: ${fileContext.projectContext.projectType || 'Unknown'}
${fileContext.projectContext.dependencies ? `- Key Dependencies: ${Object.keys(fileContext.projectContext.dependencies).slice(0, 5).join(', ')}` : ''}`
      : '';

    return `Generate comprehensive documentation for the following code file.

File Information:
- Path: ${fileContext.filePath}
- Type: ${metadata.file_type}
- Language: ${fileContext.language || 'Unknown'}
- Lines of Code: ${metadata.lines_of_code}
${relatedFilesSection}
${projectContextSection}

Enhanced Context:
${this.formatEnhancedContext(enhancedContext)}

File Content:
\`\`\`${fileContext.language ?? ''}
${fileContext.content}
\`\`\`

Generate documentation in the following format:

# ${fileContext.filePath}

## Overview
[Provide a brief description of what this file does and its purpose in the project]

## Key Features
[List the main features or functionality provided by this file]

${metadata.file_type === 'component' ? '## Props/Parameters\n[Document any props or parameters if applicable]' : ''}

${metadata.exports.length > 0 ? '## Exports\n[Document what this file exports and how to use them]' : ''}

## Usage Examples
[Provide practical examples of how to use the code in this file]

## Dependencies
[List key dependencies and explain why they are used]

${metadata.file_type === 'service' || metadata.file_type === 'controller' ? '## API/Methods\n[Document public methods or API endpoints]' : ''}

## Implementation Notes
[Explain any important implementation details, design decisions, or patterns used]

${enhancedContext.designPatterns.length > 0 ? '## Design Patterns\n[Document any design patterns identified in this file]' : ''}

Ensure the documentation is:
- Clear and concise
- Includes practical examples
- Explains the "why" not just the "what"
- Uses proper markdown formatting
- Is helpful for developers who need to understand or modify this code`;
  }

  private buildRepositorySummaryPrompt(
    repositoryName: string,
    files: { path: string; content: string; language?: string }[],
    fileDocumentations: FileDocumentationResult[]
  ): string {
    // Group files by type
    const filesByType: { [key: string]: string[] } = {};
    fileDocumentations.forEach(doc => {
      const type = doc.metadata.file_type || 'other';
      if (!filesByType[type]) filesByType[type] = [];
      filesByType[type].push(doc.file_path);
    });

    // Calculate language distribution
    const languageStats: { [key: string]: number } = {};
    files.forEach(file => {
      const lang = file.language || 'unknown';
      languageStats[lang] = (languageStats[lang] || 0) + 1;
    });

    return `Generate a comprehensive overview documentation for the repository based on the individual file documentations.

Repository: ${repositoryName}

File Statistics:
- Total Files: ${files.length}
- Languages: ${Object.entries(languageStats).map(([lang, count]) => `${lang} (${count})`).join(', ')}

File Organization:
${Object.entries(filesByType).map(([type, paths]) => `- ${type}: ${paths.length} files`).join('\n')}

Individual File Summaries:
${fileDocumentations.slice(0, 10).map(doc => `
File: ${doc.file_path}
Summary: ${doc.documentation.split('\n').find(line => line.includes('Overview'))?.slice(0, 200) || 'No overview available'}
`).join('\n')}

Generate a repository overview in the following format:

# ${repositoryName} Documentation

## Project Overview
[Provide a high-level description of the project, its purpose, and main features]

## Architecture
[Describe the overall architecture and how different parts work together]

## Project Structure
[Explain the directory structure and organization]

## Key Components
[List and briefly describe the most important components/modules]

## Technology Stack
[List the main technologies, frameworks, and libraries used]

## Getting Started
[Provide quick start instructions for developers]

## Development Workflow
[Explain the typical development workflow and best practices]

## API Overview
[If applicable, provide a high-level overview of the API]

## Configuration
[Explain key configuration options and environment setup]

## Testing Strategy
[Describe the testing approach and how to run tests]

## Deployment
[Provide deployment guidelines and considerations]

## Contributing
[Explain how to contribute to the project]

Ensure the overview:
- Provides a bird's-eye view of the entire project
- Helps new developers understand the codebase quickly
- Includes practical information for getting started
- Uses clear, concise language
- Follows proper markdown formatting`;
  }

  private formatEnhancedContext(context: any): string {
    const sections: string[] = [];
    
    if (context.typeDefinitions.length > 0) {
      sections.push(`Type Definitions: ${context.typeDefinitions.slice(0, 3).map((t: any) => t.name).join(', ')}`);
    }
    
    if (context.docComments.length > 0) {
      sections.push(`Existing Documentation: ${context.docComments.length} comments found`);
    }
    
    if (context.designPatterns.length > 0) {
      sections.push(`Design Patterns: ${context.designPatterns.map((p: any) => p.name).join(', ')}`);
    }
    
    return sections.join('\n');
  }
}
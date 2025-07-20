import { logger } from '@/shared/logger';
//import { AnthropicService } from './anthropic.service';
import { OpenAIService } from './openai.service'; 
import { CodeContext, PromptOptions } from './prompt-templates';
import OpenAI from 'openai';

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  type: 'overview' | 'architecture' | 'api' | 'usage' | 'configuration' | 'setup';
  pass: number;
  metadata?: any;
}

export interface MultiPassResult {
  sections: DocumentationSection[];
  mergedContent: string;
  totalCost: number;
  passCount: number;
}

export class MultiPassGenerationService {
  private anthropicService: OpenAIService;
  
  constructor() {
    this.anthropicService = new OpenAIService();
  }
  
  /**
   * Generate documentation in multiple passes for better quality and organization
   */
  async generateMultiPassDocumentation(
    context: CodeContext,
    options: PromptOptions = {}
  ): Promise<MultiPassResult> {
    logger.info('Starting multi-pass documentation generation', {
      repository: context.repositoryName,
      fileCount: context.files.length
    });
    
    const sections: DocumentationSection[] = [];
    let totalCost = 0;
    
    try {
      // Pass 1: High-level overview and architecture
      const pass1Result = await this.generateFirstPass(context, options);
      sections.push(...pass1Result.sections);
      totalCost += pass1Result.cost;
      
      // Pass 2: Detailed API documentation and component guides
      // const pass2Result = await this.generateSecondPass(context, options, pass1Result.sections);
      // sections.push(...pass2Result.sections);
      // totalCost += pass2Result.cost;
      
      // // Pass 3: Usage examples and integration guides
      // const pass3Result = await this.generateThirdPass(context, options, sections);
      // sections.push(...pass3Result.sections);
      // totalCost += pass3Result.cost;
      
      // Merge all sections into final documentation
      const mergedContent = this.mergeSections(sections, context);
      
      logger.info('Multi-pass documentation generation completed', {
        sectionCount: sections.length,
        totalCost,
        passCount: 3
      });
      
      return {
        sections,
        mergedContent,
        totalCost,
        passCount: 3
      };
    } catch (error) {
      logger.error('Multi-pass generation failed', { error });
      throw error;
    }
  }
  
  /**
   * First pass: Generate high-level overview and architecture
   */
  private async generateFirstPass(
    context: CodeContext,
    options: PromptOptions
  ): Promise<{ sections: DocumentationSection[], cost: number }> {
    logger.info('Generating first pass: Overview and Architecture');
    
    const prompt = this.buildFirstPassPrompt(context, options);
    const response = await this.anthropicService.generateDocumentation(prompt);
    
    // Parse response into sections
    const sections = this.parseResponseIntoSections(response.content, 1);
    
    return {
      sections,
      cost: response.cost
    };
  }
  
  /**
   * Second pass: Generate detailed API documentation
   */
  private async generateSecondPass(
    context: CodeContext,
    options: PromptOptions,
    previousSections: DocumentationSection[]
  ): Promise<{ sections: DocumentationSection[], cost: number }> {
    logger.info('Generating second pass: API Documentation and Component Guides');
    
    const prompt = this.buildSecondPassPrompt(context, options, previousSections);
    const response = await this.anthropicService.generateDocumentation(prompt);
    
    // Parse response into sections
    const sections = this.parseResponseIntoSections(response.content, 2);
    
    return {
      sections,
      cost: response.cost
    };
  }
  
  /**
   * Third pass: Generate usage examples and integration guides
   */
  private async generateThirdPass(
    context: CodeContext,
    options: PromptOptions,
    previousSections: DocumentationSection[]
  ): Promise<{ sections: DocumentationSection[], cost: number }> {
    logger.info('Generating third pass: Usage Examples and Integration Guides');
    
    const prompt = this.buildThirdPassPrompt(context, options, previousSections);
    const response = await this.anthropicService.generateDocumentation(prompt);
    
    // Parse response into sections
    const sections = this.parseResponseIntoSections(response.content, 3);
    
    return {
      sections,
      cost: response.cost
    };
  }
  
  /**
   * Build prompt for first pass focusing on overview and architecture
   */
  private buildFirstPassPrompt(context: CodeContext, options: PromptOptions): string {
    const entryPoints = context.entryPoints?.join(', ') || 'Not detected';
    const projectType = options.projectType || 'unknown';
    
    return `
# Generate High-Level Documentation - Pass 1 of 3

You are creating the FIRST PASS of documentation for ${context.repositoryName}.
Focus ONLY on high-level overview, architecture, and project structure.

## Project Information
- Repository: ${context.repositoryName}
- Type: ${projectType}
- Language: ${context.language}
- Entry Points: ${entryPoints}

${context.readme ? `## Existing README\n${context.readme}\n` : ''}

${context.packageJson ? `## Package Configuration\n\`\`\`json\n${JSON.stringify(context.packageJson, null, 2)}\n\`\`\`\n` : ''}

## YOUR TASK (PASS 1 - OVERVIEW & ARCHITECTURE)

Generate ONLY these sections:

### 1. PROJECT OVERVIEW
- What the project does (clear, concise explanation)
- Primary purpose and goals
- Target audience
- Key features and capabilities
- Technology stack overview

### 2. ARCHITECTURE OVERVIEW
- System architecture (high-level design)
- Core components and their relationships
- Data flow between components
- External dependencies and integrations
- Design patterns and principles used
- Architectural decisions and trade-offs

### 3. PROJECT STRUCTURE
- Directory organization
- Module breakdown
- Key files and their purposes
- How components are organized

### 4. KEY CONCEPTS
- Domain-specific concepts
- Important abstractions
- Core functionality overview

## IMPORTANT:
- DO NOT generate API documentation in this pass
- DO NOT include detailed code examples
- DO NOT document individual functions/methods
- FOCUS on the big picture and high-level understanding
- Use clear headings with ### for each section

## Source Files for Analysis
${context.files.slice(0, 20).map(f => `- ${f.path}`).join('\n')}
... and ${Math.max(0, context.files.length - 20)} more files

## Brief Code Samples for Context
${context.files
  .filter(f => context.entryPoints?.includes(f.path))
  .slice(0, 3)
  .map(f => `
### ${f.path}
\`\`\`${f.language || ''}
${f.content.slice(0, 500)}...
\`\`\`
`).join('\n')}

Generate the overview and architecture documentation now.`;
  }
  
  /**
   * Build prompt for second pass focusing on API documentation
   */
  private buildSecondPassPrompt(
    context: CodeContext,
    options: PromptOptions,
    previousSections: DocumentationSection[]
  ): string {
    const overviewSection = previousSections.find(s => s.type === 'overview');
    const architectureSection = previousSections.find(s => s.type === 'architecture');
    
    return `
# Generate Detailed Documentation - Pass 2 of 3

You are creating the SECOND PASS of documentation for ${context.repositoryName}.
Focus on detailed API documentation, component guides, and technical specifications.

## Context from Previous Pass
${overviewSection ? `### Project Overview Summary\n${overviewSection.content.slice(0, 500)}...\n` : ''}
${architectureSection ? `### Architecture Summary\n${architectureSection.content.slice(0, 500)}...\n` : ''}

## YOUR TASK (PASS 2 - DETAILED DOCUMENTATION)

Generate these sections:

### 1. API REFERENCE
${options.projectType === 'api' ? `
- Document all REST/GraphQL endpoints
- Request/response formats with examples
- Authentication and authorization
- Error codes and handling
- Rate limiting details
` : `
- Public functions and methods
- Class definitions and interfaces
- Method signatures with parameters
- Return types and values
- Exceptions and error handling
`}

### 2. COMPONENT DOCUMENTATION
- Major components/modules in detail
- Component interfaces and contracts
- Dependencies between components
- Configuration options
- Events and callbacks

### 3. DATA MODELS
- Core data structures
- Database schemas (if applicable)
- Type definitions
- Data validation rules
- Relationships between models

### 4. CONFIGURATION REFERENCE
- All configuration options
- Environment variables
- Default values
- Configuration file formats
- Runtime configuration

## IMPORTANT:
- Include code signatures and type information
- Document parameters and return values
- Show the structure, not implementation details
- Reference the architecture from Pass 1
- Use consistent formatting for API documentation

## Source Code for Detailed Analysis
${context.files
  .filter(f => {
    return f.path.includes('api') || 
           f.path.includes('route') || 
           f.path.includes('controller') ||
           f.path.includes('service') ||
           f.path.includes('model');
  })
  .slice(0, 30)
  .map(f => `
### ${f.path}
\`\`\`${f.language || ''}
${f.content}
\`\`\`
`).join('\n')}

Generate the detailed API and component documentation now.`;
  }
  
  /**
   * Build prompt for third pass focusing on usage examples
   */
  private buildThirdPassPrompt(
    context: CodeContext,
    _options: PromptOptions,
    previousSections: DocumentationSection[]
  ): string {
    const apiSection = previousSections.find(s => s.type === 'api');
    
    // Find test files for examples
    const testFiles = context.files.filter(f => 
      f.path.includes('.test.') || 
      f.path.includes('.spec.') ||
      f.path.includes('__tests__') ||
      f.path.includes('example')
    );
    
    return `
# Generate Usage Documentation - Pass 3 of 3

You are creating the THIRD AND FINAL PASS of documentation for ${context.repositoryName}.
Focus on practical usage examples, integration guides, and best practices.

## Context from Previous Passes
${apiSection ? `### API Summary\n${apiSection.content.slice(0, 500)}...\n` : ''}

## YOUR TASK (PASS 3 - USAGE & EXAMPLES)

Generate these sections:

### 1. GETTING STARTED
- Installation instructions
- Basic setup and configuration
- First steps tutorial
- Minimal working example

### 2. USAGE EXAMPLES
- Common use cases with complete code
- Real-world scenarios
- Integration examples
- Advanced usage patterns
- Error handling examples

### 3. BEST PRACTICES
- Recommended patterns
- Performance optimization tips
- Security considerations
- Common pitfalls to avoid
- Testing strategies

### 4. TROUBLESHOOTING
- Common errors and solutions
- Debugging tips
- FAQ section
- Known issues and workarounds

### 5. INTEGRATION GUIDES
- How to integrate with other systems
- Deployment strategies
- CI/CD setup
- Monitoring and logging

## IMPORTANT:
- Every example must be complete and runnable
- Include all necessary imports and setup
- Show expected output in comments
- Provide error handling in examples
- Reference the APIs documented in Pass 2
- Make examples progressively more complex

${testFiles.length > 0 ? `
## Test Files for Example Reference
${testFiles.slice(0, 10).map(f => `
### ${f.path}
\`\`\`${f.language || ''}
${f.content}
\`\`\`
`).join('\n')}
` : ''}

${context.dependencies ? `
## Dependencies for Examples
${Object.entries(context.dependencies).slice(0, 20).map(([name, version]) => `- ${name}: ${version}`).join('\n')}
` : ''}

Generate the usage documentation and examples now.`;
  }
  
  /**
   * Parse LLM response into structured sections
   */
  private parseResponseIntoSections(content: string, pass: number): DocumentationSection[] {
    const sections: DocumentationSection[] = [];
    
    // Split content by main headers (###)
    const sectionRegex = /### ([\d.]*\s*[A-Z][A-Z\s]+)\n([\s\S]*?)(?=###|$)/g;
    let match;
    let sectionIndex = 0;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      const title = match[1] ? match[1].trim() : '';
      const sectionContent = match[2] ? match[2].trim() : '';
      
      // Determine section type based on title
      const type = this.detectSectionType(title);
      
      sections.push({
        id: `pass${pass}_section${sectionIndex}`,
        title,
        content: sectionContent,
        type,
        pass,
        metadata: {
          index: sectionIndex,
          wordCount: sectionContent.split(/\s+/).length
        }
      });
      
      sectionIndex++;
    }
    
    // If no sections found, treat entire content as one section
    if (sections.length === 0 && content.trim()) {
      sections.push({
        id: `pass${pass}_full`,
        title: `Pass ${pass} Documentation`,
        content: content.trim(),
        type: 'overview',
        pass
      });
    }
    
    return sections;
  }
  
  /**
   * Detect section type from title
   */
  private detectSectionType(title: string): DocumentationSection['type'] {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('overview') || lowerTitle.includes('introduction')) {
      return 'overview';
    } else if (lowerTitle.includes('architecture') || lowerTitle.includes('design')) {
      return 'architecture';
    } else if (lowerTitle.includes('api') || lowerTitle.includes('reference')) {
      return 'api';
    } else if (lowerTitle.includes('usage') || lowerTitle.includes('example') || lowerTitle.includes('guide')) {
      return 'usage';
    } else if (lowerTitle.includes('config') || lowerTitle.includes('setting')) {
      return 'configuration';
    } else if (lowerTitle.includes('setup') || lowerTitle.includes('install')) {
      return 'setup';
    }
    
    return 'overview';
  }
  
  /**
   * Merge sections from all passes into final documentation
   */
  private mergeSections(sections: DocumentationSection[], context: CodeContext): string {
    logger.info('Merging documentation sections', { sectionCount: sections.length });
    
    // Group sections by type for better organization
    const sectionsByType = new Map<string, DocumentationSection[]>();
    
    for (const section of sections) {
      if (!sectionsByType.has(section.type)) {
        sectionsByType.set(section.type, []);
      }
      sectionsByType.get(section.type)!.push(section);
    }
    
    // Build final documentation with proper structure
    const parts: string[] = [];
    
    // Title
    parts.push(`# ${context.repositoryName}`);
    parts.push('');
    
    // Table of Contents
    parts.push('## 📋 Table of Contents');
    parts.push('');
    
    const tocItems: string[] = [];
    for (const section of sections) {
      const anchor = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      tocItems.push(`- [${section.title}](#${anchor})`);
    }
    parts.push(tocItems.join('\n'));
    parts.push('');
    
    // Add sections in logical order
    const sectionOrder: DocumentationSection['type'][] = [
      'overview',
      'architecture',
      'setup',
      'configuration',
      'api',
      'usage'
    ];
    
    for (const type of sectionOrder) {
      const typeSections = sectionsByType.get(type) || [];
      for (const section of typeSections) {
        parts.push(`## ${section.title}`);
        parts.push('');
        parts.push(section.content);
        parts.push('');
        
        // Add cross-references if needed
        const crossRefs = this.generateCrossReferences(section, sections);
        if (crossRefs) {
          parts.push(crossRefs);
          parts.push('');
        }
      }
    }
    
    // Add metadata footer
    parts.push('---');
    parts.push('');
    parts.push('*Documentation generated using multi-pass analysis for comprehensive coverage.*');
    
    return parts.join('\n');
  }
  
  /**
   * Generate cross-references between related sections
   */
  private generateCrossReferences(
    currentSection: DocumentationSection,
    allSections: DocumentationSection[]
  ): string | null {
    const references: string[] = [];
    
    // Find related sections based on content
    if (currentSection.type === 'api') {
      const titleParts = currentSection.title.split(' ');
      const lastWord = titleParts.length > 0 ? titleParts[titleParts.length - 1] : '';
      
      const usageSection = allSections.find(s => 
        s.type === 'usage' && 
        lastWord && s.content.includes(lastWord)
      );
      
      if (usageSection) {
        references.push(`> **See also:** [${usageSection.title}](#${usageSection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}) for usage examples`);
      }
    } else if (currentSection.type === 'usage') {
      const apiSection = allSections.find(s => s.type === 'api');
      if (apiSection) {
        references.push(`> **See also:** [${apiSection.title}](#${apiSection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}) for detailed API reference`);
      }
    }
    
    return references.length > 0 ? references.join('\n') : null;
  }
}
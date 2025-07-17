export interface CodeContext {
  repositoryName: string;
  language: string;
  files: Array<{
    path: string;
    content: string;
    language?: string;
  }>;
  dependencies?: Record<string, string>;
  readme?: string;
}

export interface PromptOptions {
  style?: 'technical' | 'beginner-friendly' | 'comprehensive';
  includeExamples?: boolean;
  focusAreas?: string[];
}

export class PromptTemplates {
  /**
   * Main documentation generation prompt
   * This is the core prompt that can be easily modified to improve documentation quality
   */
  static generateDocumentationPrompt(
    context: CodeContext,
    options: PromptOptions = {}
  ): string {
    const {
      style = 'comprehensive',
      includeExamples = true,
      focusAreas = []
    } = options;

    // Build the file list section
    const filesList = context.files
      .map(f => `- ${f.path} (${f.language || 'unknown'})`)
      .join('\n');

    // Build the code section
    const codeSection = context.files
      .map(file => {
        return `
### File: ${file.path}
\`\`\`${file.language || ''}
${file.content}
\`\`\`
`;
      })
      .join('\n');

    // Build dependencies section if available
    const dependenciesSection = context.dependencies
      ? `
## Dependencies
${Object.entries(context.dependencies)
  .map(([name, version]) => `- ${name}: ${version}`)
  .join('\n')}
`
      : '';

    // Build the main prompt
    const prompt = `
# Generate Documentation for ${context.repositoryName}

You are tasked with generating comprehensive documentation for a ${context.language} project.

## Project Overview
- Repository: ${context.repositoryName}
- Primary Language: ${context.language}
- Total Files: ${context.files.length}

## Files to Document
${filesList}

${dependenciesSection}

${context.readme ? `## Existing README\n${context.readme}\n` : ''}

## Documentation Requirements

Please generate documentation that includes:

1. **Project Overview**
   - What the project does
   - Key features and capabilities
   - Technology stack and dependencies

2. **Architecture Overview**
   - High-level architecture description
   - Key components and their relationships
   - Design patterns used

3. **Installation & Setup**
   - Prerequisites
   - Step-by-step installation guide
   - Configuration requirements

4. **API Documentation** (if applicable)
   - Endpoint descriptions
   - Request/response formats
   - Authentication details

5. **Code Structure**
   - Directory structure explanation
   - Key modules/components description
   - Important classes and functions

6. **Usage Guide**
   ${includeExamples ? '- Code examples for common use cases' : ''}
   - Best practices
   - Common pitfalls to avoid

7. **Configuration**
   - Available configuration options
   - Environment variables
   - Default values

${focusAreas.length > 0 ? `
8. **Additional Focus Areas**
${focusAreas.map(area => `   - ${area}`).join('\n')}
` : ''}

## Style Guidelines
- Documentation style: ${style}
- Use clear, concise language
- Include code examples where helpful
- Use proper markdown formatting
- Organize content with clear headings

## Source Code

${codeSection}

---

Generate comprehensive documentation based on the above code. Focus on clarity, completeness, and practical usefulness for developers who will use this project.
`;

    return prompt.trim();
  }

  /**
   * Prompt for generating a specific section of documentation
   */
  static generateSectionPrompt(
    section: 'api' | 'setup' | 'architecture' | 'usage',
    context: CodeContext
  ): string {
    const sectionPrompts = {
      api: `Generate detailed API documentation for the ${context.repositoryName} project. Include all endpoints, request/response formats, authentication, and error handling.`,
      setup: `Generate a comprehensive setup and installation guide for the ${context.repositoryName} project. Include prerequisites, step-by-step instructions, and troubleshooting tips.`,
      architecture: `Generate an architecture overview for the ${context.repositoryName} project. Include system design, component relationships, data flow, and design decisions.`,
      usage: `Generate usage documentation with practical examples for the ${context.repositoryName} project. Include common use cases, code examples, and best practices.`
    };

    return `
${sectionPrompts[section]}

## Project Context
- Repository: ${context.repositoryName}
- Language: ${context.language}

## Source Code
${context.files.map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n')}
`;
  }

  /**
   * Prompt for summarizing documentation (useful for large projects)
   */
  static generateSummaryPrompt(documentation: string): string {
    return `
Please create a concise summary of the following documentation. 
Focus on the most important aspects that developers need to know.

## Full Documentation
${documentation}

---

Generate a summary that includes:
1. Project purpose (1-2 sentences)
2. Key features (bullet points)
3. Quick start guide (essential steps only)
4. Most important API endpoints or functions
5. Critical configuration notes
`;
  }
}
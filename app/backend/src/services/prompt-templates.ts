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
  packageJson?: any;
  entryPoints?: string[];
  testFiles?: Array<{
    path: string;
    content: string;
  }>;
  enhancedContext?: {
    typeDefinitions?: Array<{
      name: string;
      type: string;
      definition: string;
      file: string;
    }>;
    docComments?: Array<{
      type: string;
      content: string;
      file: string;
    }>;
    designPatterns?: Array<{
      name: string;
      type: string;
      description: string;
      files: string[];
    }>;
    environmentVariables?: Array<{
      name: string;
      description?: string;
      defaultValue?: string;
      required: boolean;
    }>;
    testExamples?: Array<{
      name: string;
      code: string;
      file: string;
    }>;
  };
}

export interface PromptOptions {
  style?: 'technical' | 'beginner-friendly' | 'comprehensive';
  includeExamples?: boolean;
  focusAreas?: string[];
  projectType?: 'web-app' | 'library' | 'cli' | 'api' | 'mobile' | 'desktop' | 'unknown';
}

export class PromptTemplates {
  /**
   * Detect project type based on files and dependencies
   */
  static detectProjectType(context: CodeContext): string {
    const files = context.files.map(f => f.path.toLowerCase());
    const deps = context.dependencies ? Object.keys(context.dependencies) : [];
    
    // Check for API/Backend
    if (files.some(f => f.includes('controller') || f.includes('routes') || f.includes('api'))) {
      return 'api';
    }
    
    // Check for CLI
    if (files.some(f => f.includes('cli') || f.includes('bin/')) || 
        deps.includes('commander') || deps.includes('yargs')) {
      return 'cli';
    }
    
    // Check for Web App
    if (deps.includes('react') || deps.includes('vue') || deps.includes('angular') ||
        deps.includes('next') || deps.includes('nuxt') || deps.includes('svelte')) {
      return 'web-app';
    }
    
    // Check for Mobile
    if (deps.includes('react-native') || deps.includes('expo') ||
        files.some(f => f.includes('.swift') || f.includes('.kt') || f.includes('.java'))) {
      return 'mobile';
    }
    
    // Check for Desktop
    if (deps.includes('electron') || deps.includes('tauri')) {
      return 'desktop';
    }
    
    // Check for Library
    if (files.some(f => f.includes('index.') || f.includes('lib/')) &&
        !files.some(f => f.includes('server') || f.includes('app'))) {
      return 'library';
    }
    
    return 'unknown';
  }
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
      focusAreas = [],
      projectType = 'unknown'
    } = options;

    // Build the file list section with better organization
    const filesList = context.files
      .map(f => `- ${f.path} (${f.language || 'unknown'})`)
      .join('\n');

    // Build the code section with better formatting
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

    // Build dependencies section with more detail
    const dependenciesSection = context.dependencies
      ? `
## Dependencies
${Object.entries(context.dependencies)
  .map(([name, version]) => `- ${name}: ${version}`)
  .join('\n')}
`
      : '';

    // Include test files if available for better examples
    const testSection = context.testFiles && context.testFiles.length > 0
      ? `
## Test Files (for usage examples)
${context.testFiles.map(file => `
### ${file.path}
\`\`\`
${file.content}
\`\`\`
`).join('\n')}
`
      : '';

    // Build enhanced context sections
    const enhancedContextSection = this.buildEnhancedContextSection(context);
    
    // Build the enhanced main prompt
    const prompt = `
# Generate Comprehensive Documentation for ${context.repositoryName}

You are an expert technical writer tasked with creating professional, comprehensive documentation for a ${context.language} ${projectType !== 'unknown' ? projectType : 'project'}.

## CRITICAL INSTRUCTIONS:
1. Write documentation that is IMMEDIATELY USEFUL to developers
2. Include REAL CODE EXAMPLES from the provided source code
3. Explain the WHY behind design decisions, not just the what
4. Organize content in a logical, progressive manner
5. Use clear, professional markdown formatting with proper hierarchy

## Project Context
- Repository: ${context.repositoryName}
- Primary Language: ${context.language}
- Project Type: ${projectType}
- Total Files: ${context.files.length}
${context.entryPoints?.length ? `- Entry Points: ${context.entryPoints.join(', ')}` : ''}

## Files Analyzed
${filesList}

${dependenciesSection}

${context.readme ? `## Existing README Context\n${context.readme}\n` : ''}

${context.packageJson ? `## Package Configuration\n\`\`\`json\n${JSON.stringify(context.packageJson, null, 2)}\n\`\`\`\n` : ''}

## DOCUMENTATION STRUCTURE REQUIREMENTS

Generate documentation with ALL of the following sections in this exact order:

# ${context.repositoryName}

## 📋 Table of Contents
Generate a complete table of contents with links to all major sections.

## 🎯 Overview
- **What it is**: One clear sentence explaining what this project does
- **Who it's for**: Target audience and use cases
- **Key Benefits**: 3-5 bullet points on why someone would use this
- **Quick Example**: A simple code snippet showing the core functionality

## ✨ Features
- List all major features with brief descriptions
- Group related features together
- Highlight unique or standout capabilities
- Include feature status (stable, beta, planned) if relevant

## 🏗️ Architecture
### System Design
- High-level architecture diagram (described in text/ASCII if needed)
- Core components and their responsibilities
- Data flow between components
- External service integrations

### Design Patterns
- Patterns used and why they were chosen
- Key architectural decisions and trade-offs
- Scalability considerations

### Project Structure
\`\`\`
project-root/
├── src/           # Explain each directory's purpose
│   ├── ...
├── tests/         # Testing approach
├── docs/          # Additional documentation
└── ...
\`\`\`

## 🚀 Getting Started

### Prerequisites
- List all requirements with specific versions
- Include both required and optional dependencies
- System requirements (OS, runtime versions, etc.)

### Installation
\`\`\`bash
# Step-by-step installation commands
# Include different methods if available (npm, yarn, pip, etc.)
\`\`\`

### Quick Start
\`\`\`${context.language}
// Minimal working example to get users started immediately
// Should be copy-pasteable and functional
\`\`\`

### Verification
Steps to verify the installation worked correctly.

## 📖 Usage Guide

### Basic Usage
Show the most common use cases with real code examples:

\`\`\`${context.language}
// Example 1: Primary use case
// Include imports, setup, and actual usage
\`\`\`

\`\`\`${context.language}
// Example 2: Another common scenario
// Show expected outputs in comments
\`\`\`

### Advanced Usage
- Complex scenarios and configurations
- Performance optimization techniques
- Integration with other tools/libraries

### Real-World Examples
Provide 2-3 practical, production-ready examples that demonstrate:
- Error handling
- Best practices
- Common patterns

## 📚 API Reference

${projectType === 'api' || projectType === 'library' ? `
### Core APIs
Document all public APIs with:
- Function/method signatures
- Parameter descriptions with types
- Return values
- Exceptions/errors that can be thrown
- Usage examples for each

### Classes/Modules
- Class hierarchies and relationships
- Public properties and methods
- Constructor parameters
- Lifecycle methods
` : ''}

${projectType === 'api' ? `
### Endpoints
For each endpoint:
- HTTP method and path
- Request parameters (query, body, headers)
- Response format with examples
- Status codes and error responses
- Authentication requirements
- Rate limiting information
` : ''}

## ⚙️ Configuration

### Configuration Options
Present configuration in a clear table format:

| Option | Type | Default | Description | Example |
|--------|------|---------|-------------|---------|
| option1 | string | "default" | What this does | "custom" |

### Environment Variables
\`\`\`bash
# Required environment variables
REQUIRED_VAR=explanation_of_what_this_does

# Optional environment variables
OPTIONAL_VAR=default_value  # Explanation
\`\`\`

### Configuration Files
Show example configuration files with all options documented:

\`\`\`json
{
  "option1": "value1",  // Explanation
  "option2": {
    "nested": "value"   // What this controls
  }
}
\`\`\`

## 🧪 Testing

### Running Tests
\`\`\`bash
# Commands to run different test suites
npm test              # Run all tests
npm test:unit        # Unit tests only
npm test:integration # Integration tests
\`\`\`

### Writing Tests
Show how to write tests for this project:

\`\`\`${context.language}
// Example test case showing best practices
\`\`\`

### Test Coverage
- How to generate coverage reports
- Current coverage targets
- Areas that need more testing

## 🔧 Development

### Development Setup
\`\`\`bash
# Commands for development environment
\`\`\`

### Code Style
- Linting configuration
- Formatting rules
- Commit message conventions

### Building
\`\`\`bash
# Build commands and what they do
\`\`\`

### Contributing
- How to submit issues
- Pull request process
- Code review guidelines

## 📊 Performance

### Benchmarks
- Performance characteristics
- Optimization tips
- Resource usage guidelines

### Best Practices
- Do's and don'ts for optimal performance
- Common performance pitfalls
- Scaling considerations

## 🐛 Troubleshooting

### Common Issues
For each common issue:
1. **Problem**: Clear description of the symptoms
2. **Cause**: Why this happens
3. **Solution**: Step-by-step fix
4. **Prevention**: How to avoid this in the future

### FAQ
Address the most frequently asked questions:
- **Q**: Common question?
  **A**: Clear, helpful answer with examples if needed.

### Debug Mode
How to enable debug logging and interpret output:
\`\`\`bash
# Enable debug mode
DEBUG=* npm start
\`\`\`

### Getting Help
- Where to ask questions (GitHub issues, Discord, etc.)
- What information to include in bug reports
- Response time expectations

## 🚢 Deployment

### Production Deployment
Step-by-step deployment guide for common platforms:

#### Docker
\`\`\`dockerfile
# Example Dockerfile with explanations
\`\`\`

#### Cloud Platforms
- AWS/GCP/Azure deployment steps
- Recommended configurations
- Cost considerations

### Monitoring
- Recommended monitoring tools
- Key metrics to track
- Alert configurations

## 📈 Changelog
Link to changelog or recent notable changes.

## 📄 License
License information and usage restrictions.

## 🤝 Credits
- Main contributors
- Acknowledgments
- Third-party libraries used

${testSection}

## Source Code for Analysis

${codeSection}

---

## FORMATTING REQUIREMENTS:
1. Use proper markdown hierarchy (# ## ### ####)
2. Include emoji icons for main sections to improve readability
3. Use code blocks with language hints for syntax highlighting
4. Use tables for structured data
5. Include inline code formatting for commands, file names, and small code references
6. Add horizontal rules between major sections for visual separation
7. Use bold for important terms and warnings
8. Use blockquotes for important notes or tips

## QUALITY REQUIREMENTS:
1. Every code example must be complete and runnable (include all imports)
2. Explain complex concepts in simple terms first, then dive into details
3. Anticipate common questions and address them proactively
4. Include version numbers for all dependencies and requirements
5. Provide multiple installation/usage methods when available
6. Always show expected output for code examples
7. Include error messages users might encounter and how to fix them

Generate comprehensive, professional documentation that developers will find immediately useful and easy to navigate.

${this.getFrameworkSpecificInstructions(context)}

${enhancedContextSection}`;

    return prompt.trim();
  }

  /**
   * Build enhanced context section from extracted metadata
   */
  static buildEnhancedContextSection(context: CodeContext): string {
    if (!context.enhancedContext) {
      return '';
    }
    
    const sections: string[] = [];
    
    // Type definitions section
    if (context.enhancedContext.typeDefinitions && context.enhancedContext.typeDefinitions.length > 0) {
      sections.push(`
## IMPORTANT TYPE DEFINITIONS
The following types are key to understanding the codebase:

${context.enhancedContext.typeDefinitions.slice(0, 10).map(type => `
### ${type.name} (${type.type})
File: ${type.file}
\`\`\`
${type.definition}
\`\`\`
`).join('\n')}
`);
    }
    
    // Documentation comments section
    if (context.enhancedContext.docComments && context.enhancedContext.docComments.length > 0) {
      sections.push(`
## EXISTING DOCUMENTATION
The following documentation already exists in the code:

${context.enhancedContext.docComments.slice(0, 10).map(doc => `
### ${doc.file}
Type: ${doc.type}
${doc.content}
`).join('\n')}
`);
    }
    
    // Design patterns section
    if (context.enhancedContext.designPatterns && context.enhancedContext.designPatterns.length > 0) {
      sections.push(`
## IDENTIFIED DESIGN PATTERNS
The codebase uses the following design patterns:

${context.enhancedContext.designPatterns.map(pattern => `
### ${pattern.name} Pattern (${pattern.type})
${pattern.description}
Used in: ${pattern.files.slice(0, 3).join(', ')}${pattern.files.length > 3 ? ` and ${pattern.files.length - 3} more files` : ''}
`).join('\n')}
`);
    }
    
    // Environment variables section
    if (context.enhancedContext.environmentVariables && context.enhancedContext.environmentVariables.length > 0) {
      sections.push(`
## ENVIRONMENT VARIABLES
The following environment variables are used:

${context.enhancedContext.environmentVariables.map(env => `
- **${env.name}**: ${env.required ? 'Required' : 'Optional'}${env.description ? ` - ${env.description}` : ''}${env.defaultValue ? ` (default: ${env.defaultValue})` : ''}
`).join('')}
`);
    }
    
    // Test examples section
    if (context.enhancedContext.testExamples && context.enhancedContext.testExamples.length > 0) {
      sections.push(`
## TEST EXAMPLES FOR DOCUMENTATION
Use these test cases as examples in the usage documentation:

${context.enhancedContext.testExamples.slice(0, 5).map(test => `
### Test: ${test.name}
From: ${test.file}
\`\`\`
${test.code}
\`\`\`
`).join('\n')}
`);
    }
    
    return sections.join('\n');
  }

  /**
   * Get framework-specific instructions
   */
  static getFrameworkSpecificInstructions(context: CodeContext): string {
    const deps = context.dependencies ? Object.keys(context.dependencies) : [];
    const files = context.files.map(f => f.path.toLowerCase());
    
    // React/Next.js specific
    if (deps.includes('react') || deps.includes('next')) {
      return `
### React/Next.js Specific Requirements:
- Document component props with TypeScript interfaces
- Include examples of component usage
- Document hooks and their parameters
- Explain state management approach
- Document API routes (for Next.js)
- Include SSR/SSG considerations
`;
    }
    
    // Vue specific
    if (deps.includes('vue') || deps.includes('nuxt')) {
      return `
### Vue/Nuxt Specific Requirements:
- Document component props, events, and slots
- Include template examples
- Document composables and their usage
- Explain store/state management (Vuex/Pinia)
- Document API routes (for Nuxt)
`;
    }
    
    // Express/Fastify API specific
    if (deps.includes('express') || deps.includes('fastify') || deps.includes('@nestjs/core')) {
      return `
### API Framework Specific Requirements:
- Document all endpoints with full OpenAPI-style specs
- Include authentication middleware documentation
- Document request/response schemas
- Include rate limiting and CORS configuration
- Document error handling patterns
- Include database models and relationships
`;
    }
    
    // Python specific
    if (context.language === 'python' || files.some(f => f.endsWith('.py'))) {
      return `
### Python Specific Requirements:
- Document function signatures with type hints
- Include docstring content in documentation
- Document class inheritance hierarchies
- Explain package structure and imports
- Include virtual environment setup
- Document testing with pytest examples
`;
    }
    
    // CLI specific
    if (deps.includes('commander') || deps.includes('yargs') || deps.includes('chalk')) {
      return `
### CLI Tool Specific Requirements:
- Document all commands and subcommands
- Include option flags with descriptions
- Provide usage examples for each command
- Document configuration file format
- Include shell completion setup
- Provide troubleshooting for common CLI issues
`;
    }
    
    return '';
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
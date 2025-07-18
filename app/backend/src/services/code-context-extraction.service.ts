import { GitHubFile } from './github-file-reader.service';
import { logger } from '@/shared/logger';

export interface TypeDefinition {
  name: string;
  type: 'interface' | 'type' | 'class' | 'enum';
  definition: string;
  file: string;
  line: number;
}

export interface DocComment {
  type: 'jsdoc' | 'docstring';
  content: string;
  params?: Array<{ name: string; type?: string; description?: string }>;
  returns?: { type?: string; description?: string };
  examples?: string[];
  file: string;
  line: number;
}

export interface DesignPattern {
  name: string;
  type: string;
  description: string;
  files: string[];
  examples: string[];
}

export interface ConfigSchema {
  name: string;
  schema: any;
  defaults?: any;
  required?: string[];
  file: string;
}

export interface EnhancedCodeContext {
  typeDefinitions: TypeDefinition[];
  docComments: DocComment[];
  designPatterns: DesignPattern[];
  configSchemas: ConfigSchema[];
  environmentVariables: Array<{
    name: string;
    description?: string;
    defaultValue?: string;
    required: boolean;
    file: string;
  }>;
  testExamples: Array<{
    name: string;
    code: string;
    file: string;
  }>;
}

export class CodeContextExtractionService {
  /**
   * Extract enhanced context from code files
   */
  extractEnhancedContext(files: GitHubFile[]): EnhancedCodeContext {
    logger.info('Extracting enhanced code context', { fileCount: files.length });
    
    const context: EnhancedCodeContext = {
      typeDefinitions: [],
      docComments: [],
      designPatterns: [],
      configSchemas: [],
      environmentVariables: [],
      testExamples: []
    };
    
    for (const file of files) {
      // Extract based on file type
      if (this.isTypeScriptFile(file.path)) {
        context.typeDefinitions.push(...this.extractTypeScriptTypes(file));
        context.docComments.push(...this.extractJSDocComments(file));
      } else if (this.isPythonFile(file.path)) {
        context.typeDefinitions.push(...this.extractPythonTypes(file));
        context.docComments.push(...this.extractPythonDocstrings(file));
      }
      
      // Extract environment variables from any file
      context.environmentVariables.push(...this.extractEnvironmentVariables(file));
      
      // Extract test examples
      if (this.isTestFile(file.path)) {
        context.testExamples.push(...this.extractTestExamples(file));
      }
      
      // Extract config schemas
      if (this.isConfigFile(file.path)) {
        const schema = this.extractConfigSchema(file);
        if (schema) {
          context.configSchemas.push(schema);
        }
      }
    }
    
    // Identify design patterns across all files
    context.designPatterns = this.identifyDesignPatterns(files);
    
    logger.info('Enhanced context extraction complete', {
      typeDefinitions: context.typeDefinitions.length,
      docComments: context.docComments.length,
      designPatterns: context.designPatterns.length,
      configSchemas: context.configSchemas.length,
      environmentVariables: context.environmentVariables.length,
      testExamples: context.testExamples.length
    });
    
    return context;
  }
  
  /**
   * Extract TypeScript type definitions
   */
  private extractTypeScriptTypes(file: GitHubFile): TypeDefinition[] {
    const types: TypeDefinition[] = [];
    const lines = file.content.split('\n');
    
    // Regular expressions for TypeScript types
    const patterns = {
      interface: /export\s+interface\s+(\w+)(?:<[^>]+>)?\s*{/,
      type: /export\s+type\s+(\w+)(?:<[^>]+>)?\s*=/,
      class: /export\s+(?:abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*{/,
      enum: /export\s+enum\s+(\w+)\s*{/
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Check for interface
      let match = patterns.interface.exec(line);
      if (match && match[1]) {
        const definition = this.extractTypeDefinition(lines, i, '{', '}');
        types.push({
          name: match[1],
          type: 'interface',
          definition,
          file: file.path,
          line: i + 1
        });
        continue;
      }
      
      // Check for type alias
      match = patterns.type.exec(line);
      if (match && match[1]) {
        const definition = this.extractTypeDefinition(lines, i, '=', ';');
        types.push({
          name: match[1],
          type: 'type',
          definition,
          file: file.path,
          line: i + 1
        });
        continue;
      }
      
      // Check for class
      match = patterns.class.exec(line);
      if (match && match[1]) {
        const definition = this.extractTypeDefinition(lines, i, '{', '}');
        types.push({
          name: match[1],
          type: 'class',
          definition,
          file: file.path,
          line: i + 1
        });
        continue;
      }
      
      // Check for enum
      match = patterns.enum.exec(line);
      if (match && match[1]) {
        const definition = this.extractTypeDefinition(lines, i, '{', '}');
        types.push({
          name: match[1],
          type: 'enum',
          definition,
          file: file.path,
          line: i + 1
        });
      }
    }
    
    return types;
  }
  
  /**
   * Extract Python type definitions
   */
  private extractPythonTypes(file: GitHubFile): TypeDefinition[] {
    const types: TypeDefinition[] = [];
    const lines = file.content.split('\n');
    
    // Regular expressions for Python types
    const patterns = {
      class: /^class\s+(\w+)(?:\([^)]*\))?:/,
      namedtuple: /(\w+)\s*=\s*namedtuple\s*\(/,
      typedDict: /class\s+(\w+)\s*\(\s*TypedDict\s*\)/,
      dataclass: /@dataclass(?:\([^)]*\))?\s*\nclass\s+(\w+)/
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Check for class definition
      let match = patterns.class.exec(line);
      if (match && match[1]) {
        const definition = this.extractPythonClassDefinition(lines, i);
        types.push({
          name: match[1],
          type: 'class',
          definition,
          file: file.path,
          line: i + 1
        });
      }
      
      // Check for dataclass
      if (i < lines.length - 1) {
        const twoLines = line + '\n' + lines[i + 1];
        match = patterns.dataclass.exec(twoLines);
        if (match && match[1]) {
          const definition = this.extractPythonClassDefinition(lines, i + 1);
          types.push({
            name: match[1],
            type: 'class',
            definition: '@dataclass\n' + definition,
            file: file.path,
            line: i + 1
          });
        }
      }
    }
    
    return types;
  }
  
  /**
   * Extract JSDoc comments
   */
  private extractJSDocComments(file: GitHubFile): DocComment[] {
    const comments: DocComment[] = [];
    const jsdocRegex = /\/\*\*\s*([\s\S]*?)\*\//g;
    let match;
    
    while ((match = jsdocRegex.exec(file.content)) !== null) {
      const content = match[1] || '';
      const lineNumber = file.content.substring(0, match.index).split('\n').length;
      
      const docComment: DocComment = {
        type: 'jsdoc',
        content: content.trim(),
        file: file.path,
        line: lineNumber
      };
      
      // Parse parameters
      const paramRegex = /@param\s+(?:\{([^}]+)\})?\s*(\w+)\s*-?\s*(.+)/g;
      let paramMatch;
      docComment.params = [];
      
      while ((paramMatch = paramRegex.exec(content)) !== null) {
        const param: { name: string; type?: string; description?: string } = {
          name: paramMatch[2] || ''
        };
        if (paramMatch[1]) param.type = paramMatch[1];
        if (paramMatch[3]) param.description = paramMatch[3];
        docComment.params.push(param);
      }
      
      // Parse return type
      const returnMatch = /@returns?\s+(?:\{([^}]+)\})?\s*(.+)/.exec(content);
      if (returnMatch) {
        const returns: { type?: string; description?: string } = {};
        if (returnMatch[1]) returns.type = returnMatch[1];
        if (returnMatch[2]) returns.description = returnMatch[2];
        docComment.returns = returns;
      }
      
      // Parse examples
      const exampleRegex = /@example\s*([\s\S]+?)(?=@\w+|$)/g;
      let exampleMatch;
      docComment.examples = [];
      
      while ((exampleMatch = exampleRegex.exec(content)) !== null) {
        if (exampleMatch[1]) {
          docComment.examples.push(exampleMatch[1].trim());
        }
      }
      
      comments.push(docComment);
    }
    
    return comments;
  }
  
  /**
   * Extract Python docstrings
   */
  private extractPythonDocstrings(file: GitHubFile): DocComment[] {
    const comments: DocComment[] = [];
    const docstringRegex = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
    let match;
    
    while ((match = docstringRegex.exec(file.content)) !== null) {
      const content = match[1] || match[2] || '';
      const lineNumber = file.content.substring(0, match.index).split('\n').length;
      
      const docComment: DocComment = {
        type: 'docstring',
        content: content.trim(),
        file: file.path,
        line: lineNumber
      };
      
      // Parse parameters (Google/NumPy style)
      const paramSection = /(?:Args?|Parameters?|Params?):\s*\n([\s\S]+?)(?=\n\w+:|$)/i.exec(content);
      if (paramSection && paramSection[1]) {
        docComment.params = [];
        const paramLines = paramSection[1].split('\n');
        
        for (const line of paramLines) {
          const paramMatch = /^\s*(\w+)\s*(?:\([^)]+\))?\s*:\s*(.+)/.exec(line);
          if (paramMatch) {
            const param: { name: string; type?: string; description?: string } = {
              name: paramMatch[1] || ''
            };
            if (paramMatch[2]) param.description = paramMatch[2];
            docComment.params.push(param);
          }
        }
      }
      
      // Parse return
      const returnSection = /(?:Returns?|Yields?):\s*\n([\s\S]+?)(?=\n\w+:|$)/i.exec(content);
      if (returnSection && returnSection[1]) {
        docComment.returns = {
          description: returnSection[1].trim()
        };
      }
      
      // Parse examples
      const exampleSection = /(?:Examples?|Usage):\s*\n([\s\S]+?)(?=\n\w+:|$)/i.exec(content);
      if (exampleSection && exampleSection[1]) {
        docComment.examples = [exampleSection[1].trim()];
      }
      
      comments.push(docComment);
    }
    
    return comments;
  }
  
  /**
   * Extract environment variables
   */
  private extractEnvironmentVariables(file: GitHubFile): Array<{
    name: string;
    description?: string;
    defaultValue?: string;
    required: boolean;
    file: string;
  }> {
    const envVars: Array<{
      name: string;
      description?: string;
      defaultValue?: string;
      required: boolean;
      file: string;
    }> = [];
    
    // Pattern for process.env usage
    const envRegex = /process\.env\.(\w+)/g;
    const envWithDefault = /process\.env\.(\w+)\s*\|\|\s*['"`]([^'"`]+)['"`]/g;
    const envWithComment = /\/\/\s*(.+)\s*\n\s*.*process\.env\.(\w+)/g;
    
    const foundVars = new Set<string>();
    
    // Find all environment variable references
    let match: RegExpExecArray | null;
    while ((match = envRegex.exec(file.content)) !== null) {
      if (match[1] && !foundVars.has(match[1])) {
        foundVars.add(match[1]);
        envVars.push({
          name: match[1],
          required: true,
          file: file.path
        });
      }
    }
    
    // Find environment variables with defaults
    while ((match = envWithDefault.exec(file.content)) !== null) {
      if (match[1] && match[2]) {
        const existing = envVars.find(v => v.name === match![1]);
        if (existing) {
          existing.defaultValue = match[2];
          existing.required = false;
        }
      }
    }
    
    // Find environment variables with comments
    while ((match = envWithComment.exec(file.content)) !== null) {
      if (match[1] && match[2]) {
        const existing = envVars.find(v => v.name === match![2]);
        if (existing) {
          existing.description = match[1];
        }
      }
    }
    
    // Also check for .env.example files
    if (file.path.includes('.env')) {
      const lines = file.content.split('\n');
      for (const line of lines) {
        const envMatch = /^([A-Z_]+)=(.*)/.exec(line);
        if (envMatch && envMatch[1]) {
          const [, name, value] = envMatch;
          
          // Check if there's a comment on the previous line
          const lineIndex = lines.indexOf(line);
          let description: string | undefined;
          if (lineIndex > 0) {
            const prevLine = lines[lineIndex - 1];
            const commentMatch = /^#\s*(.+)/.exec(prevLine || '');
            if (commentMatch && commentMatch[1]) {
              description = commentMatch[1];
            }
          }
          
          const envVar: {
            name: string;
            description?: string;
            defaultValue?: string;
            required: boolean;
            file: string;
          } = {
            name,
            required: !value,
            file: file.path
          };
          if (description) envVar.description = description;
          if (value) envVar.defaultValue = value;
          envVars.push(envVar);
        }
      }
    }
    
    return envVars;
  }
  
  /**
   * Extract test examples
   */
  private extractTestExamples(file: GitHubFile): Array<{
    name: string;
    code: string;
    file: string;
  }> {
    const examples: Array<{
      name: string;
      code: string;
      file: string;
    }> = [];
    
    // Extract test cases
    const testPatterns = [
      /(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*{([\s\S]*?)}\s*\)/g,
      /def\s+test_(\w+)\s*\([^)]*\)\s*:\s*([\s\S]*?)(?=\ndef|\nclass|$)/g
    ];
    
    for (const pattern of testPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        if (match[1] && match[2]) {
          examples.push({
            name: match[1],
            code: match[2].trim(),
            file: file.path
          });
        }
      }
    }
    
    return examples;
  }
  
  /**
   * Extract configuration schema
   */
  private extractConfigSchema(file: GitHubFile): ConfigSchema | null {
    try {
      if (file.path.endsWith('.json')) {
        const config = JSON.parse(file.content);
        
        // Look for schema definitions
        if (config.$schema || config.schema) {
          return {
            name: file.path.split('/').pop() || 'config',
            schema: config.$schema || config.schema,
            defaults: config.defaults,
            required: config.required,
            file: file.path
          };
        }
        
        // For package.json, extract relevant config
        if (file.path.includes('package.json')) {
          return {
            name: 'package.json',
            schema: {
              scripts: config.scripts,
              dependencies: config.dependencies,
              devDependencies: config.devDependencies,
              engines: config.engines
            },
            file: file.path
          };
        }
      }
      
      // For TypeScript config
      if (file.path.includes('tsconfig')) {
        const config = JSON.parse(file.content);
        return {
          name: 'tsconfig',
          schema: config.compilerOptions,
          file: file.path
        };
      }
    } catch (error) {
      // Not a valid JSON file
    }
    
    return null;
  }
  
  /**
   * Identify design patterns across files
   */
  private identifyDesignPatterns(files: GitHubFile[]): DesignPattern[] {
    const patterns: DesignPattern[] = [];
    
    // Singleton pattern
    const singletonFiles = files.filter(f => 
      f.content.includes('getInstance') || 
      f.content.includes('_instance') ||
      /class\s+\w+\s*{[\s\S]*?static\s+instance/i.test(f.content)
    );
    
    if (singletonFiles.length > 0) {
      patterns.push({
        name: 'Singleton',
        type: 'Creational',
        description: 'Ensures a class has only one instance and provides global access to it',
        files: singletonFiles.map(f => f.path),
        examples: this.extractPatternExamples(singletonFiles, 'getInstance')
      });
    }
    
    // Factory pattern
    const factoryFiles = files.filter(f => 
      /class\s+\w*Factory/i.test(f.content) ||
      /function\s+create\w+/i.test(f.content) ||
      f.content.includes('createInstance')
    );
    
    if (factoryFiles.length > 0) {
      patterns.push({
        name: 'Factory',
        type: 'Creational',
        description: 'Provides an interface for creating objects without specifying their concrete classes',
        files: factoryFiles.map(f => f.path),
        examples: this.extractPatternExamples(factoryFiles, 'create')
      });
    }
    
    // Observer pattern
    const observerFiles = files.filter(f => 
      f.content.includes('addEventListener') ||
      f.content.includes('subscribe') ||
      f.content.includes('EventEmitter') ||
      /class\s+\w*Observer/i.test(f.content)
    );
    
    if (observerFiles.length > 0) {
      patterns.push({
        name: 'Observer',
        type: 'Behavioral',
        description: 'Defines a one-to-many dependency between objects',
        files: observerFiles.map(f => f.path),
        examples: this.extractPatternExamples(observerFiles, 'subscribe')
      });
    }
    
    // Repository pattern
    const repositoryFiles = files.filter(f => 
      /class\s+\w*Repository/i.test(f.content) ||
      f.path.includes('repository')
    );
    
    if (repositoryFiles.length > 0) {
      patterns.push({
        name: 'Repository',
        type: 'Data Access',
        description: 'Encapsulates data access logic and provides a more object-oriented view of the persistence layer',
        files: repositoryFiles.map(f => f.path),
        examples: this.extractPatternExamples(repositoryFiles, 'find')
      });
    }
    
    // Dependency Injection
    const diFiles = files.filter(f => 
      f.content.includes('@Injectable') ||
      f.content.includes('constructor(') && f.content.includes('private') ||
      f.content.includes('container.register')
    );
    
    if (diFiles.length > 0) {
      patterns.push({
        name: 'Dependency Injection',
        type: 'Structural',
        description: 'Implements inversion of control for resolving dependencies',
        files: diFiles.map(f => f.path),
        examples: this.extractPatternExamples(diFiles, 'constructor')
      });
    }
    
    return patterns;
  }
  
  /**
   * Helper methods
   */
  
  private isTypeScriptFile(path: string): boolean {
    return path.endsWith('.ts') || path.endsWith('.tsx');
  }
  
  private isPythonFile(path: string): boolean {
    return path.endsWith('.py');
  }
  
  private isTestFile(path: string): boolean {
    return path.includes('.test.') || 
           path.includes('.spec.') || 
           path.includes('__tests__') ||
           path.includes('test_');
  }
  
  private isConfigFile(path: string): boolean {
    return path.includes('config') || 
           path.endsWith('.json') || 
           path.endsWith('.yml') || 
           path.endsWith('.yaml') ||
           path.endsWith('.toml');
  }
  
  private extractTypeDefinition(lines: string[], startLine: number, startChar: string, endChar: string): string {
    let definition = lines[startLine] || '';
    let depth = 1;
    let i = startLine + 1;
    
    // Find the opening character
    const startIndex = definition.indexOf(startChar);
    if (startIndex === -1) return definition;
    
    // Count braces to find the complete definition
    for (let j = startIndex + 1; j < definition.length; j++) {
      if (definition[j] === startChar) depth++;
      else if (definition[j] === endChar) depth--;
      
      if (depth === 0) return definition;
    }
    
    // Continue on next lines
    while (i < lines.length && depth > 0) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }
      definition += '\n' + line;
      
      for (const char of line) {
        if (char === startChar) depth++;
        else if (char === endChar) depth--;
        
        if (depth === 0) break;
      }
      
      i++;
    }
    
    return definition;
  }
  
  private extractPythonClassDefinition(lines: string[], startLine: number): string {
    let definition = lines[startLine] || '';
    let i = startLine + 1;
    
    // Continue while lines are indented
    while (i < lines.length) {
      const line = lines[i];
      
      // Stop at next non-indented line (except empty lines)
      if (line && line.trim() && !line.startsWith('    ') && !line.startsWith('\t')) {
        break;
      }
      
      if (line !== undefined) {
        definition += '\n' + line;
      }
      i++;
    }
    
    return definition;
  }
  
  private extractPatternExamples(files: GitHubFile[], keyword: string): string[] {
    const examples: string[] = [];
    
    for (const file of files) {
      const regex = new RegExp(`([^\\n]*${keyword}[^\\n]*(?:\\n[^\\n]*){0,5})`, 'gi');
      const matches = file.content.match(regex);
      
      if (matches) {
        examples.push(...matches.slice(0, 2)); // Take first 2 examples
      }
    }
    
    return examples.slice(0, 3); // Return max 3 examples total
  }
}
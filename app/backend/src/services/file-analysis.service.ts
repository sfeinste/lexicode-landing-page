import { GitHubFile } from './github-file-reader.service';
import { logger } from '@/shared/logger';

export interface FileRelationship {
  source: string;
  target: string;
  type: 'import' | 'export' | 'extends' | 'implements' | 'uses';
  weight: number;
}

export interface FileMetadata {
  path: string;
  language: string;
  type: 'entry' | 'config' | 'test' | 'component' | 'service' | 'utility' | 'model' | 'route' | 'other';
  priority: number;
  imports: string[];
  exports: string[];
  dependencies: string[];
  complexity: number;
  linesOfCode: number;
}

export interface DependencyGraph {
  nodes: Map<string, FileMetadata>;
  edges: FileRelationship[];
}

export class FileAnalysisService {
  /**
   * Analyze files and build a dependency graph
   */
  analyzeDependencies(files: GitHubFile[]): DependencyGraph {
    logger.info('Starting dependency analysis', { fileCount: files.length });
    
    const nodes = new Map<string, FileMetadata>();
    const edges: FileRelationship[] = [];
    
    // First pass: analyze each file
    for (const file of files) {
      const metadata = this.analyzeFile(file);
      nodes.set(file.path, metadata);
    }
    
    // Second pass: build relationships
    for (const file of files) {
      const metadata = nodes.get(file.path);
      if (!metadata) continue;
      
      for (const importPath of metadata.imports) {
        const resolvedPath = this.resolveImportPath(importPath, file.path, files);
        if (resolvedPath && nodes.has(resolvedPath)) {
          edges.push({
            source: file.path,
            target: resolvedPath,
            type: 'import',
            weight: 1
          });
        }
      }
    }
    
    logger.info('Dependency analysis complete', { 
      nodeCount: nodes.size, 
      edgeCount: edges.length 
    });
    
    return { nodes, edges };
  }
  
  /**
   * Analyze a single file to extract metadata
   */
  private analyzeFile(file: GitHubFile): FileMetadata {
    const content = file.content;
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => line.trim().length > 0).length;
    
    // Detect file type
    const type = this.detectFileType(file.path, content);
    
    // Extract imports and exports
    const imports = this.extractImports(content, file.language || '');
    const exports = this.extractExports(content, file.language || '');
    
    // Calculate complexity (simple heuristic)
    const complexity = this.calculateComplexity(content);
    
    // Calculate priority
    const priority = this.calculatePriority(file.path, type, imports.length, exports.length);
    
    return {
      path: file.path,
      language: file.language || 'unknown',
      type,
      priority,
      imports,
      exports,
      dependencies: imports,
      complexity,
      linesOfCode
    };
  }
  
  /**
   * Detect the type of file based on path and content
   */
  private detectFileType(path: string, content: string): FileMetadata['type'] {
    const lowerPath = path.toLowerCase();
    
    // Entry points
    if (lowerPath.includes('index.') || 
        lowerPath.includes('main.') || 
        lowerPath.includes('app.') ||
        lowerPath.includes('server.') ||
        lowerPath === 'cli.js' ||
        lowerPath === 'bin/cli') {
      return 'entry';
    }
    
    // Configuration files
    if (lowerPath.includes('config') || 
        lowerPath.includes('.env') ||
        lowerPath.includes('webpack') ||
        lowerPath.includes('vite') ||
        lowerPath.includes('tsconfig') ||
        lowerPath.includes('jest.config') ||
        lowerPath.includes('babel.config')) {
      return 'config';
    }
    
    // Test files
    if (lowerPath.includes('.test.') || 
        lowerPath.includes('.spec.') ||
        lowerPath.includes('__tests__')) {
      return 'test';
    }
    
    // Component files (React/Vue/Angular)
    if ((lowerPath.includes('component') || lowerPath.endsWith('.tsx') || lowerPath.endsWith('.jsx')) &&
        (content.includes('render') || content.includes('template'))) {
      return 'component';
    }
    
    // Service/Controller files
    if (lowerPath.includes('service') || 
        lowerPath.includes('controller') ||
        lowerPath.includes('handler')) {
      return 'service';
    }
    
    // Model files
    if (lowerPath.includes('model') || 
        lowerPath.includes('schema') ||
        lowerPath.includes('entity')) {
      return 'model';
    }
    
    // Route files
    if (lowerPath.includes('route') || 
        lowerPath.includes('router')) {
      return 'route';
    }
    
    // Utility files
    if (lowerPath.includes('util') || 
        lowerPath.includes('helper') ||
        lowerPath.includes('lib/')) {
      return 'utility';
    }
    
    return 'other';
  }
  
  /**
   * Extract import statements from code
   */
  private extractImports(content: string, language: string): string[] {
    const imports: string[] = [];
    
    if (language === 'javascript' || language === 'typescript' || language === 'javascriptreact' || language === 'typescriptreact') {
      // ES6 imports
      const es6ImportRegex = /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = es6ImportRegex.exec(content)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        }
      }
      
      // CommonJS requires
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        }
      }
    } else if (language === 'python') {
      // Python imports
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+(\S+)/g;
      let match;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        if (match[1]) {
          imports.push(match[1]);
        } else if (match[2]) {
          imports.push(match[2]);
        }
      }
    }
    
    return [...new Set(imports)]; // Remove duplicates
  }
  
  /**
   * Extract export statements from code
   */
  private extractExports(content: string, language: string): string[] {
    const exports: string[] = [];
    
    if (language === 'javascript' || language === 'typescript' || language === 'javascriptreact' || language === 'typescriptreact') {
      // Named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        if (match[1]) {
          exports.push(match[1]);
        }
      }
      
      // Default export
      if (/export\s+default/.test(content)) {
        exports.push('default');
      }
    }
    
    return exports;
  }
  
  /**
   * Calculate file complexity (simple heuristic)
   */
  private calculateComplexity(content: string): number {
    let complexity = 1;
    
    // Count control flow statements
    const controlFlowPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g
    ];
    
    for (const pattern of controlFlowPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
  
  /**
   * Calculate file priority for documentation
   */
  private calculatePriority(
    path: string, 
    type: FileMetadata['type'], 
    importCount: number, 
    exportCount: number
  ): number {
    let priority = 0;
    
    // Type-based priority
    const typePriorities: Record<FileMetadata['type'], number> = {
      'entry': 100,
      'config': 80,
      'route': 70,
      'service': 60,
      'model': 50,
      'component': 40,
      'utility': 30,
      'test': 20,
      'other': 10
    };
    
    priority += typePriorities[type];
    
    // Adjust based on import/export counts
    priority += Math.min(exportCount * 5, 30); // Files with many exports are important
    priority -= Math.min(importCount * 2, 20); // Files with many imports might be leaf nodes
    
    // Special files get bonus priority
    const specialFiles = ['README', 'package.json', 'requirements.txt', 'setup.py', 'Dockerfile'];
    if (specialFiles.some(special => path.toLowerCase().includes(special.toLowerCase()))) {
      priority += 50;
    }
    
    return Math.max(priority, 0);
  }
  
  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(importPath: string, currentFile: string, allFiles: GitHubFile[]): string | null {
    // Skip external dependencies
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    // Get directory of current file
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    
    // Resolve relative path
    let resolvedPath = importPath;
    if (importPath.startsWith('./')) {
      resolvedPath = currentDir + '/' + importPath.substring(2);
    } else if (importPath.startsWith('../')) {
      const parts = currentDir.split('/');
      const importParts = importPath.split('/');
      
      // Go up directories
      while (importParts[0] === '..') {
        parts.pop();
        importParts.shift();
      }
      
      resolvedPath = parts.join('/') + '/' + importParts.join('/');
    }
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', ''];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (allFiles.some(f => f.path === fullPath)) {
        return fullPath;
      }
      
      // Try index file
      const indexPath = resolvedPath + '/index' + ext;
      if (allFiles.some(f => f.path === indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }
  
  /**
   * Get files sorted by priority
   */
  getSortedFilesByPriority(graph: DependencyGraph): FileMetadata[] {
    return Array.from(graph.nodes.values())
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get related files that should be grouped together
   */
  getRelatedFiles(filePath: string, graph: DependencyGraph): Set<string> {
    const related = new Set<string>();
    related.add(filePath);
    
    // Add files that this file imports
    const imports = graph.edges
      .filter(edge => edge.source === filePath)
      .map(edge => edge.target);
    
    // Add files that import this file
    const importedBy = graph.edges
      .filter(edge => edge.target === filePath)
      .map(edge => edge.source);
    
    // Add all to related set
    [...imports, ...importedBy].forEach(path => related.add(path));
    
    return related;
  }
  
  /**
   * Group files into logical modules
   */
  groupFilesIntoModules(graph: DependencyGraph): Map<string, string[]> {
    const modules = new Map<string, string[]>();
    const visited = new Set<string>();
    
    // Start with entry points and high-priority files
    const sortedFiles = this.getSortedFilesByPriority(graph);
    
    for (const file of sortedFiles) {
      if (visited.has(file.path)) continue;
      
      // Get all related files
      const moduleFiles = this.getRelatedFiles(file.path, graph);
      
      // Create module name based on entry point
      const moduleName = this.getModuleName(file);
      
      // Add files to module
      modules.set(moduleName, Array.from(moduleFiles));
      
      // Mark files as visited
      moduleFiles.forEach(f => visited.add(f));
    }
    
    return modules;
  }
  
  /**
   * Generate a module name based on file metadata
   */
  private getModuleName(file: FileMetadata): string {
    if (file.type === 'entry') {
      return `core-${file.path.replace(/\//g, '-')}`;
    }
    
    const pathParts = file.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const dirName = pathParts[pathParts.length - 2] || '';
    
    return `${file.type}-${dirName}-${fileName}`.replace(/\./g, '-');
  }
}
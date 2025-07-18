import axios from 'axios';
import { GitHubAppService } from '@/modules/auth/services/github-app-service';
import { logger } from '@/shared/logger';
import path from 'path';

export interface GitHubFile {
  path: string;
  content: string;
  encoding: string;
  size: number;
  language?: string;
}

export interface FileFilter {
  excludePaths?: string[];
  excludePatterns?: RegExp[];
  includeExtensions?: string[];
  maxFileSize?: number;
}

export class GitHubFileReaderService {
  // Logger is available as a singleton
  private githubAppService: GitHubAppService;
  
  // Common file extensions for code files
  private readonly codeExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.swift', '.m', '.scala',
    '.r', '.dart', '.vue', '.sql', '.sh', '.bash', '.zsh', '.ps1',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
    '.md', '.mdx', '.rst', '.txt'
  ];
  
  // Paths to exclude by default
  private readonly defaultExcludePaths = [
    'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage',
    '.next', '.nuxt', 'out', 'target', 'bin', 'obj', '.cache', '.parcel-cache',
    'vendor', 'packages', '.idea', '.vscode', '.DS_Store', '__pycache__',
    '.pytest_cache', '.mypy_cache', 'venv', 'env', '.env', '.venv'
  ];

  constructor() {
    this.githubAppService = new GitHubAppService();
  }

  /**
   * Fetch all code files from a GitHub repository
   */
  async fetchRepositoryFiles(
    installationId: number,
    owner: string,
    repo: string,
    branch: string = 'main',
    filter?: FileFilter
  ): Promise<GitHubFile[]> {
    try {
      logger.info('Fetching repository files', { owner, repo, branch });
      
      // Get installation token
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      // Get repository tree
      const tree = await this.getRepositoryTree(token, owner, repo, branch);
      
      // Filter files
      const filteredFiles = this.filterFiles(tree, filter);
      
      // Fetch file contents in batches
      const files = await this.fetchFileContents(token, owner, repo, filteredFiles);
      
      logger.info('Successfully fetched repository files', { 
        owner, 
        repo, 
        fileCount: files.length 
      });
      
      return files;
    } catch (error) {
      logger.error('Failed to fetch repository files', { owner, repo, error });
      throw error;
    }
  }

  /**
   * Get repository tree structure
   */
  private async getRepositoryTree(
    token: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<any[]> {
    try {
      // First, get the branch SHA
      const branchResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );
      
      const treeSha = branchResponse.data.commit.commit.tree.sha;
      
      // Get the tree recursively
      const treeResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );
      
      return treeResponse.data.tree || [];
    } catch (error) {
      logger.error('Failed to get repository tree', { owner, repo, branch, error });
      throw error;
    }
  }

  /**
   * Filter files based on criteria
   */
  private filterFiles(tree: any[], filter?: FileFilter): any[] {
    const {
      excludePaths = this.defaultExcludePaths,
      excludePatterns = [],
      includeExtensions = this.codeExtensions,
      maxFileSize = 1024 * 1024 // 1MB default
    } = filter || {};

    return tree.filter(item => {
      // Only process files (not directories)
      if (item.type !== 'blob') return false;
      
      // Check file size
      if (item.size > maxFileSize) {
        logger.debug('Skipping large file', { path: item.path, size: item.size });
        return false;
      }
      
      // Check excluded paths
      if (excludePaths.some(excludePath => item.path.includes(excludePath))) {
        return false;
      }
      
      // Check excluded patterns
      if (excludePatterns.some(pattern => pattern.test(item.path))) {
        return false;
      }
      
      // Check file extension
      const ext = path.extname(item.path).toLowerCase();
      if (!includeExtensions.includes(ext)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Fetch contents of multiple files
   */
  private async fetchFileContents(
    token: string,
    owner: string,
    repo: string,
    files: any[]
  ): Promise<GitHubFile[]> {
    const results: GitHubFile[] = [];
    const batchSize = 10; // Process 10 files at a time
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => 
        this.fetchFileContent(token, owner, repo, file.path)
          .catch(error => {
            logger.error('Failed to fetch file content', { 
              path: file.path, 
              error 
            });
            return null;
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as GitHubFile[]);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Fetch content of a single file
   */
  private async fetchFileContent(
    token: string,
    owner: string,
    repo: string,
    filePath: string
  ): Promise<GitHubFile | null> {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );
      
      const { content, encoding, size } = response.data;
      
      // Decode base64 content
      const decodedContent = Buffer.from(content, 'base64').toString('utf-8');
      
      return {
        path: filePath,
        content: decodedContent,
        encoding,
        size,
        language: this.detectLanguage(filePath)
      };
    } catch (error) {
      logger.error('Failed to fetch file content', { filePath, error });
      return null;
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.m': 'objective-c',
      '.scala': 'scala',
      '.r': 'r',
      '.dart': 'dart',
      '.vue': 'vue',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.ps1': 'powershell',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.ini': 'ini',
      '.cfg': 'config',
      '.conf': 'config',
      '.md': 'markdown',
      '.mdx': 'markdown',
      '.rst': 'restructuredtext',
      '.txt': 'text'
    };
    
    return languageMap[ext] || 'unknown';
  }

  /**
   * Get README content if it exists
   */
  async fetchReadme(
    installationId: number,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<string | null> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      // Try common README filenames
      const readmeFiles = ['README.md', 'readme.md', 'README.MD', 'README', 'readme'];
      
      for (const filename of readmeFiles) {
        const file = await this.fetchFileContent(token, owner, repo, filename);
        if (file) {
          return file.content;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to fetch README', { owner, repo, error });
      return null;
    }
  }

  /**
   * Get package.json for dependency information
   */
  async fetchPackageJson(
    installationId: number,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<any | null> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      const file = await this.fetchFileContent(token, owner, repo, 'package.json');
      
      if (file) {
        const packageData = JSON.parse(file.content);
        return packageData;
      }
      
      return null;
    } catch (error) {
      logger.debug('No package.json found', { owner, repo });
      return null;
    }
  }
  
  /**
   * Fetch configuration files from the repository
   */
  async fetchConfigurationFiles(
    installationId: number,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<GitHubFile[]> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      const configFiles: GitHubFile[] = [];
      
      // List of common configuration files to look for
      const configPatterns = [
        // JavaScript/TypeScript
        'package.json',
        'tsconfig.json',
        'jsconfig.json',
        '.eslintrc.json',
        '.eslintrc.js',
        '.prettierrc',
        'webpack.config.js',
        'vite.config.js',
        'next.config.js',
        'nuxt.config.js',
        'babel.config.js',
        'jest.config.js',
        '.babelrc',
        
        // Python
        'requirements.txt',
        'setup.py',
        'setup.cfg',
        'pyproject.toml',
        'Pipfile',
        'poetry.lock',
        'tox.ini',
        '.flake8',
        'pytest.ini',
        
        // Docker
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        '.dockerignore',
        
        // CI/CD
        '.github/workflows/*.yml',
        '.github/workflows/*.yaml',
        '.gitlab-ci.yml',
        '.travis.yml',
        'Jenkinsfile',
        '.circleci/config.yml',
        
        // Environment
        '.env.example',
        '.env.sample',
        '.env.template',
        
        // Other
        'Makefile',
        '.editorconfig',
        '.gitignore',
        'LICENSE',
        'README.md',
        'CONTRIBUTING.md',
        'CHANGELOG.md'
      ];
      
      // Fetch each configuration file
      for (const pattern of configPatterns) {
        if (pattern.includes('*')) {
          // Handle wildcard patterns (e.g., .github/workflows/*.yml)
          const basePath = pattern.substring(0, pattern.lastIndexOf('/'));
          const extension = pattern.substring(pattern.lastIndexOf('.'));
          
          try {
            // Get files in the directory
            const dirResponse = await axios.get(
              `https://api.github.com/repos/${owner}/${repo}/contents/${basePath}`,
              {
                headers: {
                  Authorization: `token ${token}`,
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            );
            
            if (Array.isArray(dirResponse.data)) {
              for (const file of dirResponse.data) {
                if (file.type === 'file' && file.name.endsWith(extension)) {
                  const content = await this.fetchFileContent(token, owner, repo, file.path);
                  if (content) {
                    configFiles.push({
                      ...content,
                      language: this.detectLanguage(file.path)
                    });
                  }
                }
              }
            }
          } catch (error) {
            // Directory might not exist, continue
          }
        } else {
          // Single file
          const file = await this.fetchFileContent(token, owner, repo, pattern);
          if (file) {
            configFiles.push({
              ...file,
              language: this.detectLanguage(pattern)
            });
          }
        }
      }
      
      logger.info('Fetched configuration files', { 
        owner, 
        repo, 
        configFileCount: configFiles.length 
      });
      
      return configFiles;
    } catch (error) {
      logger.error('Failed to fetch configuration files', { owner, repo, error });
      return [];
    }
  }
  
  /**
   * Analyze dependencies from various dependency files
   */
  async analyzeDependencies(
    installationId: number,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<Record<string, any>> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      const dependencies: Record<string, any> = {};
      
      // Try to get JavaScript/TypeScript dependencies
      const packageJson = await this.fetchPackageJson(installationId, owner, repo, branch);
      if (packageJson) {
        dependencies.javascript = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          scripts: packageJson.scripts || {},
          engines: packageJson.engines || {}
        };
      }
      
      // Try to get Python dependencies
      const requirementsTxt = await this.fetchFileContent(token, owner, repo, 'requirements.txt');
      if (requirementsTxt) {
        dependencies.python = {
          requirements: requirementsTxt.content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
        };
      }
      
      // Try to get pyproject.toml
      const pyprojectToml = await this.fetchFileContent(token, owner, repo, 'pyproject.toml');
      if (pyprojectToml) {
        // Basic parsing of pyproject.toml (would need a proper TOML parser in production)
        dependencies.python = dependencies.python || {};
        dependencies.python.pyproject = pyprojectToml.content;
      }
      
      return dependencies;
    } catch (error) {
      logger.error('Failed to analyze dependencies', { owner, repo, error });
      return {};
    }
  }
}
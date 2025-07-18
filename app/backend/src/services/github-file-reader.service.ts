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
  ): Promise<Record<string, string> | null> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      const file = await this.fetchFileContent(token, owner, repo, 'package.json');
      
      if (file) {
        const packageData = JSON.parse(file.content);
        return {
          ...packageData.dependencies,
          ...packageData.devDependencies
        };
      }
      
      return null;
    } catch (error) {
      logger.debug('No package.json found', { owner, repo });
      return null;
    }
  }
}
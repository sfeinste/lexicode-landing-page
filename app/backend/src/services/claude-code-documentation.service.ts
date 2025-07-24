import { logger } from '@/shared/logger';
import simpleGit, { SimpleGit } from 'simple-git';
import * as tmp from 'tmp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { GitHubAppService } from '@/modules/auth/services/github-app-service';

export interface ClaudeCodeDocumentationConfig {
  repositoryUrl: string;
  installationId: string;
  branch?: string;
}

export interface ClaudeCodeDocumentationResult {
  content: string;
  files?: {
    path: string;
    content: string;
  }[];
  metadata?: {
    filesAnalyzed: number;
    generationTime: number;
  };
}

export class ClaudeCodeDocumentationService {
  private git: SimpleGit;
  private githubAppService: GitHubAppService;

  constructor() {
    this.git = simpleGit();
    this.githubAppService = new GitHubAppService();
  }

  /**
   * Generate documentation for an entire repository using Claude Code SDK
   */
  async generateRepositoryDocumentation(
    config: ClaudeCodeDocumentationConfig
  ): Promise<ClaudeCodeDocumentationResult> {
    const startTime = Date.now();
    let tmpDir: tmp.DirResult | null = null;

    logger.info('Starting Claude Code documentation generation', {
      repositoryUrl: config.repositoryUrl,
      branch: config.branch || 'main',
      installationId: config.installationId
    });

    try {
      // Create temporary directory for cloning
      tmpDir = tmp.dirSync({ unsafeCleanup: true });
      const repoPath = tmpDir.name;

      logger.info('Created temporary directory for repository clone', {
        tmpDir: repoPath
      });

      // Clone the repository with authentication
      logger.info('Starting repository clone operation');
      await this.cloneRepository(config, repoPath);

      // Verify the repository was cloned
      const repoExists = await fs.access(repoPath).then(() => true).catch(() => false);
      if (!repoExists) {
        throw new Error('Repository clone failed - directory does not exist');
      }
      
      // Check if .git directory exists
      const gitDirExists = await fs.access(path.join(repoPath, '.git')).then(() => true).catch(() => false);
      logger.info('Repository clone verification', {
        repoPath,
        repoExists,
        gitDirExists
      });

      // Generate documentation using Claude Code SDK
      logger.info('Repository cloned successfully, starting Claude Code SDK analysis', {
        repoPath
      });
      
      const prompt = `Generate comprehensive documentation for this codebase. Create a summary of the project including its purpose, architecture, main components, and how to get started. Format the output as markdown.`;

      // Use Claude Code to analyze the repository
      const messages: SDKMessage[] = [];
      let messageCount = 0;
      let currentTurn = 0;
      
      // Check if API key is available
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }
      
      logger.info('Starting Claude Code query', {
        maxTurns: 5,
        cwd: repoPath,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length
      });
      
      try {
        for await (const message of query({
          prompt: prompt,
          options: {
            maxTurns: 5,
            cwd: repoPath
          }
        })) {
          messageCount++;
          messages.push(message);
          
          // Log different message types
          if ((message as any).type === 'system' && (message as any).subtype === 'init') {
            logger.info('Claude Code initialized', {
              model: (message as any).model,
              tools: (message as any).tools,
              cwd: (message as any).cwd,
              apiKeySource: (message as any).apiKeySource
            });
          } else if ((message as any).type === 'system') {
            logger.info('Claude Code system message', {
              subtype: (message as any).subtype,
              message: message
            });
          } else if (message.type === 'user') {
            logger.info('Claude Code user message logged');
          } else if (message.type === 'assistant') {
            currentTurn++;
            logger.info(`Claude Code assistant message received (turn ${currentTurn}/5)`, {
              messageNumber: messageCount,
              contentLength: JSON.stringify(message.message.content).length
            });
          } else if (message.type === 'result') {
            logger.info('Claude Code analysis completed', {
              subtype: message.subtype,
              isError: message.is_error,
              numTurns: message.num_turns,
              durationMs: message.duration_ms,
              totalCostUsd: message.total_cost_usd,
              errorMessage: message.subtype !== 'success' ? (message as any).error : undefined
            });
            
            // If there's an error in the result, throw it
            if (message.is_error) {
              throw new Error(`Claude Code failed: ${message.subtype} - ${(message as any).error || 'Unknown error'}`);
            }
          }
        }
      } catch (queryError) {
        logger.error('Error during Claude Code query execution', {
          error: queryError instanceof Error ? queryError.message : 'Unknown error',
          stack: queryError instanceof Error ? queryError.stack : undefined,
          repoPath,
          messageCount
        });
        throw queryError;
      }

      // Extract the final documentation content from messages
      logger.info('Extracting documentation from messages', {
        totalMessages: messages.length
      });
      const response = this.extractDocumentationFromMessages(messages);
      
      logger.info('Documentation extracted', {
        documentationLength: response.length,
        documentationPreview: response.substring(0, 100) + '...'
      });

      // Read generated documentation files
      logger.info('Reading generated documentation files');
      const docsPath = path.join(repoPath, 'lexicode-docs');
      const documentationFiles = await this.readDocumentationFiles(docsPath);
      
      // Find summary.md content
      const summaryFile = documentationFiles.find(f => f.path === 'summary.md');
      const summaryContent = summaryFile?.content || response;

      // Count analyzed files
      logger.info('Counting files in repository');
      const filesAnalyzed = await this.countFiles(repoPath);

      const generationTime = Date.now() - startTime;
      logger.info('Claude Code documentation generation completed', {
        filesAnalyzed,
        generationTime,
        documentationFilesGenerated: documentationFiles.length
      });

      return {
        content: summaryContent,
        files: documentationFiles,
        metadata: {
          filesAnalyzed,
          generationTime
        }
      };

    } catch (error) {
      logger.error('Error generating documentation with Claude Code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to generate documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up temporary directory
      if (tmpDir) {
        try {
          logger.info('Cleaning up temporary directory', { tmpDir: tmpDir.name });
          tmpDir.removeCallback();
          logger.info('Temporary directory cleaned up successfully');
        } catch (cleanupError) {
          logger.warn('Failed to clean up temporary directory', {
            tmpDir: tmpDir.name,
            error: cleanupError
          });
        }
      }
    }
  }

  /**
   * Clone a repository with GitHub App authentication
   */
  private async cloneRepository(
    config: ClaudeCodeDocumentationConfig,
    targetPath: string
  ): Promise<void> {
    // Generate installation token for authentication
    const { token } = await this.githubAppService.generateInstallationToken(Number(config.installationId));

    // Parse repository URL to extract owner and repo
    const urlParts = config.repositoryUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!urlParts) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = urlParts;

    // Build authenticated clone URL
    const authenticatedUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

    // Clone the repository
    logger.info('Executing git clone', {
      owner,
      repo,
      branch: config.branch || 'main',
      targetPath
    });
    
    try {
      await this.git.clone(authenticatedUrl, targetPath, {
        '--depth': 1, // Shallow clone for performance
        '--branch': config.branch || 'main'
      });

      logger.info('Repository cloned successfully', {
        owner,
        repo,
        branch: config.branch || 'main',
        targetPath
      });
    } catch (cloneError) {
      logger.error('Git clone failed', {
        owner,
        repo,
        branch: config.branch || 'main',
        error: cloneError instanceof Error ? cloneError.message : 'Unknown error',
        stderr: (cloneError as any).stderr,
        stdout: (cloneError as any).stdout
      });
      throw new Error(`Failed to clone repository: ${cloneError instanceof Error ? cloneError.message : 'Unknown error'}`);
    }
  }

  /**
   * Count files in a directory recursively
   */
  private async countFiles(dirPath: string): Promise<number> {
    let count = 0;
    let directories = 0;

    async function walk(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          directories++;
          await walk(fullPath);
        } else if (entry.isFile()) {
          count++;
        }
      }
    }

    await walk(dirPath);
    logger.info('File count completed', {
      totalFiles: count,
      directoriesScanned: directories
    });
    return count;
  }

  /**
   * Extract documentation content from Claude Code SDK messages
   */
  private extractDocumentationFromMessages(messages: SDKMessage[]): string {
    logger.info('Starting documentation extraction from messages', {
      totalMessages: messages.length
    });
    
    // Log all message types for debugging
    messages.forEach((msg, index) => {
      logger.debug(`Message ${index + 1}:`, {
        type: msg.type,
        subtype: (msg as any).subtype,
        hasResult: 'result' in msg,
        contentType: msg.type === 'assistant' && 'message' in msg ? typeof (msg as any).message.content : undefined
      });
    });
    
    // First, check if there's a successful result message with documentation
    const resultMessage = messages.find(
      msg => msg.type === 'result' && msg.subtype === 'success' && 'result' in msg
    );
    
    if (resultMessage && resultMessage.type === 'result' && 'result' in resultMessage && resultMessage.result) {
      logger.info('Found result message with documentation', {
        resultLength: resultMessage.result.length
      });
      return resultMessage.result;
    }
    
    // If no result message, look for the last assistant message which likely contains the final documentation
    const assistantMessages = messages.filter((msg): msg is (SDKMessage & { type: 'assistant'; message: any }) => 
      msg.type === 'assistant' && 'message' in msg
    );
    
    if (assistantMessages.length > 0) {
      // Get the last assistant message
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      if (!lastAssistantMessage) {
        logger.warn('No assistant message found');
        return '';
      }
      
      logger.info('Using last assistant message for documentation', {
        totalAssistantMessages: assistantMessages.length
      });
      
      const content = lastAssistantMessage.message.content;
      if (typeof content === 'string') {
        return content;
      } else if (Array.isArray(content)) {
        // Extract text from content blocks
        const textParts = content
          .filter((block: any) => block.type === 'text' && block.text)
          .map((block: any) => block.text);
        return textParts.join('\n\n');
      }
    }
    
    // Fallback: concatenate all assistant messages (original behavior)
    logger.warn('No result or final assistant message found, concatenating all assistant messages');
    const documentationParts: string[] = [];
    
    for (const message of messages) {
      if (message.type === 'assistant' && message.message) {
        const content = message.message.content;
        if (typeof content === 'string') {
          documentationParts.push(content);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              documentationParts.push(block.text);
            }
          }
        }
      }
    }
    
    const finalDocumentation = documentationParts.join('\n\n');
    
    logger.info('Documentation extraction completed (fallback method)', {
      totalParts: documentationParts.length,
      finalLength: finalDocumentation.length
    });
    
    return finalDocumentation;
  }

  /**
   * Read documentation files from the generated docs folder
   */
  private async readDocumentationFiles(docsPath: string): Promise<{ path: string; content: string }[]> {
    const files: { path: string; content: string }[] = [];
    
    try {
      // Check if docs folder exists
      const exists = await fs.access(docsPath).then(() => true).catch(() => false);
      if (!exists) {
        logger.warn('Documentation folder not found', { docsPath });
        return files;
      }

      // Recursively read all markdown files
      async function walkDocs(currentPath: string, relativePath: string = '') {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relPath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            await walkDocs(fullPath, relPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({
                path: relPath,
                content
              });
              logger.debug('Read documentation file', { path: relPath, size: content.length });
            } catch (readError) {
              logger.error('Failed to read documentation file', { 
                path: relPath, 
                error: readError 
              });
            }
          }
        }
      }

      await walkDocs(docsPath);
      
      logger.info('Documentation files read successfully', {
        totalFiles: files.length,
        paths: files.map(f => f.path)
      });
      
    } catch (error) {
      logger.error('Error reading documentation files', { 
        docsPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return files;
  }
}
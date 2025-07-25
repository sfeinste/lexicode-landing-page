import { logger } from '@/shared/logger';
import simpleGit, { SimpleGit } from 'simple-git';
import * as tmp from 'tmp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { query, type SDKMessage, type SDKAssistantMessage } from '@anthropic-ai/claude-code';
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
    languages?: { [key: string]: number };
    totalLines?: number;
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
      
      const prompt = `Your task is to analyze this codebase and create comprehensive documentation following a hierarchical pattern that mirrors the source code structure.

STEP 1: Initial Setup
Execute these commands to create the base documentation structure:
\`\`\`bash
mkdir -p lexicode-docs
\`\`\`

STEP 2: Deep Codebase Analysis
- Use Glob "**/*.{ts,js,tsx,jsx,json,py,go,java,rb,rs,md}" to find ALL source files
- Use Read to examine package.json/requirements.txt/go.mod/Cargo.toml for dependencies
- Use Read to check README.md and any existing documentation
- Use Grep to identify:
  - API endpoints and routes
  - Core business logic modules
  - Authentication/authorization patterns
  - Data models and schemas
  - Configuration systems
  - Service integrations

STEP 3: Create Hierarchical Documentation Structure

You MUST create documentation at THREE levels:

LEVEL 1 - Repository Level (High Priority):
Create these files in lexicode-docs/ root:

1. lexicode-docs/README.md - Architecture overview containing:
   - System design and high-level architecture
   - Core concepts and domain models  
   - Technology stack decisions and rationale
   - Development workflow and contribution guidelines
   - Project structure overview with key directories

2. lexicode-docs/SETUP.md - Installation and setup:
   - Prerequisites and system requirements
   - Step-by-step installation instructions
   - Environment configuration details
   - Common setup issues and troubleshooting

3. lexicode-docs/API.md - API contracts:
   - All API endpoints with methods and paths
   - Request/response schemas with examples
   - Authentication requirements
   - Error codes and handling

LEVEL 2 - Module/Feature Level:
For each major functional area (auth, payments, users, etc.), create a folder and documentation:

Example: If you find authentication code, create:
\`\`\`bash
mkdir -p lexicode-docs/auth
\`\`\`
Then write: lexicode-docs/auth/README.md with:
- Module purpose and responsibilities
- Key interfaces and contracts
- Dependencies and interactions with other modules
- Configuration options
- Common patterns used

LEVEL 3 - Complex File Level:
For files with non-obvious business logic (>200 lines or complex algorithms), create targeted docs:

Example: For src/services/payment-processor.ts, create:
lexicode-docs/services/payment-processor.md with:
- Business logic explanation (the "why")
- Algorithm descriptions
- Edge cases and error handling
- Integration points

IMPORTANT GUIDELINES:
1. Mirror the source code structure - if code is in src/auth/, docs go in lexicode-docs/auth/
2. Use clear, descriptive filenames that match or relate to source files
3. Focus on the "WHY" and system interactions, not just "WHAT" the code does
4. Document only high-value areas - skip trivial utility files
5. For each module folder you create, include a README.md explaining that module
6. Use Bash mkdir -p to create nested directories as needed

Remember: CREATE the directory structure that mirrors the codebase, then populate it with meaningful documentation files!

PRIORITIZATION for large codebases:
- Focus on core business logic first (controllers, services, models)
- Skip test files unless they contain important documentation comments
- Limit file-level docs to files >500 lines or with complex algorithms
- Create module-level docs for ALL major features
- Prioritize documenting public APIs and interfaces
- Document configuration and environment setup thoroughly
- If you're approaching turn limits, ensure you've covered the most critical parts`;

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
        maxTurns: 20,
        cwd: repoPath,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length
      });
      
      // Save original working directory and environment
      const originalCwd = process.cwd();
      const originalHome = process.env.HOME;
      
      try {
        // Change to the repository directory to ensure Claude Code only sees this directory
        process.chdir(repoPath);
        logger.info('Changed working directory for Claude Code', {
          from: originalCwd,
          to: repoPath
        });
        
        // Set environment to restrict Claude Code access
        process.env.HOME = repoPath;
        
        for await (const message of query({
          prompt: prompt,
          options: {
            maxTurns: 100,
            cwd: repoPath,
            allowedTools: ["Read", "Grep", "Glob", "LS", "Write", "Bash"],
            customSystemPrompt: "You are a documentation generator creating hierarchical documentation that mirrors source code structure. Your PRIMARY task is to CREATE a comprehensive documentation tree. You MUST: 1) Create lexicode-docs directory and subdirectories matching the source structure using Bash mkdir -p commands, 2) Write documentation files at THREE levels: repository (README.md, SETUP.md, API.md), module (e.g., lexicode-docs/auth/README.md), and complex files (e.g., lexicode-docs/services/payment-processor.md). Focus on WHY and system interactions, not WHAT. Create AT LEAST 5-10 documentation files covering different levels. Each Write tool must specify the full path like 'lexicode-docs/auth/README.md'. Creating the hierarchical file structure is CRITICAL."
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
            const userMessage = message as any;
            logger.info('Claude Code user message logged', {
              hasToolResult: userMessage.message?.content?.some((c: any) => c.type === 'tool_result'),
              parentToolId: userMessage.parent_tool_use_id
            });
          } else if (message.type === 'assistant') {
            currentTurn++;
            const assistantMessage = message as SDKAssistantMessage;
            const assistantContent = assistantMessage.message.content as any;
            
            // Log tool usage
            if (Array.isArray(assistantContent)) {
              for (const block of assistantContent) {
                if ((block as any).type === 'tool_use') {
                  const toolName = (block as any).name;
                  const toolInput = (block as any).input;
                  logger.info('Claude Code using tool', {
                    tool: toolName,
                    toolId: (block as any).id,
                    turn: currentTurn,
                    input: toolName === 'Write' ? {
                      file_path: toolInput?.file_path,
                      contentLength: toolInput?.content?.length
                    } : toolName === 'Bash' ? {
                      command: toolInput?.command
                    } : undefined
                  });
                }
              }
            }
            
            let contentPreview: string;
            if (typeof assistantContent === 'string') {
              contentPreview = assistantContent.substring(0, 20000);
            } else {
              contentPreview = JSON.stringify(assistantContent).substring(0, 200000);
            }
              
            logger.info(`Claude Code assistant message received (turn ${currentTurn}/100)`, {
              messageNumber: messageCount,
              contentLength: JSON.stringify(assistantContent).length,
              contentType: typeof assistantContent,
              isArray: Array.isArray(assistantContent),
              contentPreview
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
      } finally {
        // Restore original working directory and environment
        try {
          process.chdir(originalCwd);
          if (originalHome !== undefined) {
            process.env.HOME = originalHome;
          }
          logger.info('Restored original working directory and environment', { 
            cwd: originalCwd,
            home: originalHome 
          });
        } catch (chdirError) {
          logger.error('Failed to restore working directory', { error: chdirError });
        }
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

      // Read the files created by Claude Code in the lexicode-docs folder
      const docsPath = path.join(repoPath, 'lexicode-docs');
      const documentationFiles: { path: string; content: string }[] = [];
      let summaryContent = '';
      
      // Log what Claude Code should have created
      logger.info('Checking for created documentation files', {
        expectedPath: docsPath,
        cwd: repoPath
      });
      
      try {
        // Check if lexicode-docs folder exists
        const docsFolderExists = await fs.access(docsPath).then(() => true).catch(() => false);
        
        if (docsFolderExists) {
          logger.info('Reading documentation files from lexicode-docs folder');
          
          // Recursively read all markdown files in the lexicode-docs folder
          async function readDocsRecursively(dirPath: string, baseDir: string = ''): Promise<void> {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dirPath, entry.name);
              const relativePath = baseDir ? `${baseDir}/${entry.name}` : entry.name;
              
              if (entry.isDirectory()) {
                // Recursively read subdirectories
                await readDocsRecursively(fullPath, relativePath);
              } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                
                // Store relative path without lexicode-docs prefix
                documentationFiles.push({
                  path: relativePath,
                  content: content
                });
                
                // Use README.md at root level as the main summary content
                if (relativePath === 'README.md') {
                  summaryContent = content;
                }
                // Fallback to summary.md if README.md doesn't exist
                else if (relativePath === 'summary.md' && !summaryContent) {
                  summaryContent = content;
                }
                
                logger.info('Read documentation file', {
                  file: relativePath,
                  contentLength: content.length
                });
              }
            }
          }
          
          await readDocsRecursively(docsPath);
          
          logger.info('Documentation files collected', {
            summaryLength: summaryContent.length,
            filesCount: documentationFiles.length,
            hasContent: !!summaryContent.trim(),
            files: documentationFiles.map(f => f.path)
          });
        } else {
          logger.warn('lexicode-docs folder not found, using Claude response as summary');
          summaryContent = response || '# Documentation Generation Failed\n\nThe documentation folder was not created.';
        }
      } catch (readError) {
        logger.error('Error reading documentation files', { error: readError });
        summaryContent = response || '# Documentation Generation Failed\n\nCould not read documentation files.';
      }
      
      // If no summary was found, use a default message
      if (!summaryContent) {
        summaryContent = '# Documentation Generation Failed\n\nNo README.md or summary.md file was created in the lexicode-docs folder.';
      }

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
          generationTime,
          languages: {},
          totalLines: 0
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
          //tmpDir.removeCallback();
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
    
    // Collect all assistant message content
    const documentationParts: string[] = [];
    let hasContent = false;
    
    for (const message of messages) {
      if (message.type === 'assistant' && 'message' in message) {
        const content = (message as any).message.content;
        if (typeof content === 'string' && content.trim()) {
          documentationParts.push(content);
          hasContent = true;
          logger.debug('Added assistant message content', { 
            length: content.length,
            preview: content.substring(0, 100) 
          });
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text && block.text.trim()) {
              documentationParts.push(block.text);
              hasContent = true;
              logger.debug('Added assistant message block', { 
                length: block.text.length,
                preview: block.text.substring(0, 100) 
              });
            }
          }
        }
      }
    }
    
    // Check for result message - this contains the final output
    const resultMessage = messages.find(
      msg => msg.type === 'result' && msg.subtype === 'success'
    );
    
    if (resultMessage) {
      const result = (resultMessage as any).result;
      if (result && typeof result === 'string' && result.trim()) {
        logger.info('Found result message with final output', {
          resultLength: result.length,
          preview: result.substring(0, 200)
        });
        // Use the result as the primary documentation
        return result;
      }
    }
    
    if (!hasContent) {
      logger.error('No documentation content found in any messages');
      return '# Documentation Generation Failed\n\nNo documentation content was generated.';
    }
    
    // Join all documentation parts
    const finalDocumentation = documentationParts.join('\n\n');
    
    logger.info('Documentation extraction completed', {
      totalParts: documentationParts.length,
      finalLength: finalDocumentation.length,
      preview: finalDocumentation.substring(0, 200) + '...'
    });
    
    return finalDocumentation;
  }

}
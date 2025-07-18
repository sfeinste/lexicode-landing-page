import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { AnthropicService } from '@/services/anthropic.service';
import { GitHubFileReaderService } from '@/services/github-file-reader.service';
import { CodeChunkingService } from '@/services/code-chunking.service';
import { PromptTemplates, CodeContext } from '@/services/prompt-templates';

export interface DocumentationProject {
  id: string;
  repositoryId: string;
  name: string;
  description?: string;
  branch: string;
  config: any;
  status: string;
  totalFiles: number;
  documentedFiles: number;
  coveragePercentage: number;
  lastGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DocumentationGeneration {
  id: string;
  projectId: string;
  status: string;
  triggerType: string;
  inputData?: any;
  outputData?: any;
  errorData?: any;
  filesProcessed: number;
  filesFailed: number;
  processingTimeSeconds?: number;
  startedAt: Date | undefined;
  completedAt?: Date;
  createdAt: Date;
}

export interface DocumentationFile {
  id: string;
  projectId: string;
  generationId?: string;
  filePath: string;
  fileType?: string;
  language?: string;
  linesOfCode?: number;
  originalContent?: string;
  generatedDocumentation?: string;
  metadata?: any;
  s3Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentationService {
  private anthropicService: AnthropicService;
  private githubFileReader: GitHubFileReaderService;
  private codeChunking: CodeChunkingService;

  constructor() {
    this.anthropicService = new AnthropicService();
    this.githubFileReader = new GitHubFileReaderService();
    this.codeChunking = new CodeChunkingService();
  }
  async createProject(data: any): Promise<DocumentationProject> {
    // TODO: Implement create project
    logger.info('DocumentationService: createProject called');
    throw new Error('Not implemented');
  }

  async getUserProjects(userId: string): Promise<DocumentationProject[]> {
    // TODO: Implement get user projects
    logger.info('DocumentationService: getUserProjects called');
    throw new Error('Not implemented');
  }

  async getProject(projectId: string): Promise<DocumentationProject | null> {
    // TODO: Implement get project
    logger.info('DocumentationService: getProject called');
    throw new Error('Not implemented');
  }

  async updateProject(projectId: string, data: Partial<DocumentationProject>): Promise<DocumentationProject> {
    // TODO: Implement update project
    logger.info('DocumentationService: updateProject called');
    throw new Error('Not implemented');
  }

  async deleteProject(projectId: string): Promise<void> {
    // TODO: Implement delete project
    logger.info('DocumentationService: deleteProject called');
    throw new Error('Not implemented');
  }

  async getProjectFiles(projectId: string): Promise<DocumentationFile[]> {
    // TODO: Implement get project files
    logger.info('DocumentationService: getProjectFiles called');
    throw new Error('Not implemented');
  }

  async getProjectGenerations(projectId: string): Promise<DocumentationGeneration[]> {
    // TODO: Implement get project generations
    logger.info('DocumentationService: getProjectGenerations called');
    throw new Error('Not implemented');
  }

  async generateDocumentation(repositoryId: string, userId: string): Promise<DocumentationGeneration> {
    logger.info('DocumentationService: generateDocumentation called', { repositoryId, userId });
    
    const startTime = Date.now();
    let generation: DocumentationGeneration | null = null;
    
    try {
      // Get repository details
      const { data: repository, error: repoError } = await supabaseAdmin
        .from('repository_access')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (repoError || !repository) {
        throw new Error('Repository not found or access denied');
      }

      // Get GitHub installation
      const { data: installation, error: installError } = await supabaseAdmin
        .from('github_installations')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (installError || !installation) {
        throw new Error('GitHub installation not found');
      }

      // Create documentation generation record
      const { data: newGeneration, error: genError } = await supabaseAdmin
        .from('documentation_generations')
        .insert({
          repository_id: repositoryId,
          user_id: userId,
          status: 'processing',
          trigger_type: 'manual',
          files_processed: 0,
          files_failed: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (genError || !newGeneration) {
        throw new Error('Failed to create generation record');
      }
      
      generation = {
        id: newGeneration.id,
        projectId: '',
        status: newGeneration.status,
        triggerType: newGeneration.trigger_type,
        filesProcessed: newGeneration.files_processed,
        filesFailed: newGeneration.files_failed,
        startedAt: newGeneration.started_at ? new Date(newGeneration.started_at) : undefined,
        createdAt: new Date(newGeneration.created_at)
      };

      // Extract owner and name from repo_full_name (format: owner/name)
      const [owner, name] = repository.repo_full_name.split('/');
      const branch = repository.default_branch || 'main';
      
      // Fetch repository files
      logger.info('Fetching repository files', { 
        owner,
        name,
        branch,
        repo_full_name: repository.repo_full_name
      });
      
      const files = await this.githubFileReader.fetchRepositoryFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      logger.info('Files fetched', { fileCount: files.length });

      // Fetch README and dependencies
      const readme = await this.githubFileReader.fetchReadme(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      const dependencies = await this.githubFileReader.fetchPackageJson(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      // Create code context
      const codeContext: CodeContext = {
        repositoryName: repository.repo_full_name,
        language: repository.language || 'unknown',
        files: files.map(f => {
          const file: { path: string; content: string; language?: string } = {
            path: f.path,
            content: f.content
          };
          if (f.language) {
            file.language = f.language;
          }
          return file;
        })
      };
      
      if (dependencies) {
        codeContext.dependencies = dependencies;
      }
      
      if (readme) {
        codeContext.readme = readme;
      }

      // Check if we can process in a single request
      let documentation = '';
      let totalCost = 0;
      
      if (this.codeChunking.canProcessInSingleRequest(files)) {
        // Process all files in one request
        logger.info('Processing all files in single request');
        
        const prompt = PromptTemplates.generateDocumentationPrompt(codeContext);
        const response = await this.anthropicService.generateDocumentation(prompt);
        
        documentation = response.content;
        totalCost = response.cost;
      } else {
        // Process in chunks
        logger.info('Processing files in chunks');
        
        const chunks = this.codeChunking.chunkFiles(files);
        const chunkResults: string[] = [];
        
        for (const chunk of chunks) {
          logger.info(`Processing chunk ${chunk.id}`, { 
            fileCount: chunk.files.length,
            tokenEstimate: chunk.tokenEstimate 
          });
          
          const chunkContext: CodeContext = {
            ...codeContext,
            files: chunk.files.map(f => {
              const file: { path: string; content: string; language?: string } = {
                path: f.path,
                content: f.content
              };
              if (f.language) {
                file.language = f.language;
              }
              return file;
            })
          };
          
          const prompt = PromptTemplates.generateDocumentationPrompt(chunkContext);
          const response = await this.anthropicService.generateDocumentation(prompt);
          
          chunkResults.push(response.content);
          totalCost += response.cost;
        }
        
        // Combine chunk results
        documentation = chunkResults.join('\n\n---\n\n');
      }

      // Store documentation
      const { error: docError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: documentation,
          generation_id: generation!.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (docError) {
        throw new Error('Failed to store documentation');
      }

      // Update generation record
      const processingTime = (Date.now() - startTime) / 1000;
      
      const { error: updateError } = await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'completed',
          files_processed: files.length,
          processing_time_seconds: processingTime,
          completed_at: new Date().toISOString(),
          output_data: {
            total_files: files.length,
            total_cost: totalCost,
            documentation_length: documentation.length
          }
        })
        .eq('id', generation!.id);
        
      if (updateError) {
        logger.error('Failed to update generation record', { error: updateError });
      }

      logger.info('Documentation generation completed', {
        repositoryId,
        generationId: generation!.id,
        filesProcessed: files.length,
        processingTime,
        totalCost
      });

      return {
        id: generation!.id,
        projectId: generation!.projectId,
        status: 'completed',
        triggerType: generation!.triggerType,
        filesProcessed: files.length,
        filesFailed: generation!.filesFailed,
        processingTimeSeconds: processingTime,
        startedAt: generation!.startedAt,
        completedAt: new Date(),
        createdAt: generation!.createdAt
      };
      
    } catch (error) {
      logger.error('Documentation generation failed', { repositoryId, error });
      
      // Update generation record with error
      if (generation) {
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_data: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          })
          .eq('id', generation.id);
      }
      
      throw error;
    }
  }

  async getDocumentation(repositoryId: string, userId: string): Promise<any> {
    logger.info('DocumentationService: getDocumentation called', { repositoryId, userId });
    
    try {
      const { data: documentation, error } = await supabaseAdmin
        .from('documentation')
        .select('*')
        .eq('repository_id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        logger.error('Failed to get documentation', { error });
        return null;
      }
      
      return documentation;
    } catch (error) {
      logger.error('Failed to get documentation', { repositoryId, error });
      throw error;
    }
  }

  async getAllDocumentation(userId: string): Promise<any[]> {
    logger.info('DocumentationService: getAllDocumentation called', { userId });
    
    try {
      // First get all documentation for the user
      const { data: documentation, error: docError } = await supabaseAdmin
        .from('documentation')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      if (docError) {
        logger.error('Failed to get all documentation', { error: docError });
        return [];
      }
      
      if (!documentation || documentation.length === 0) {
        logger.info('No documentation found for user', { userId });
        return [];
      }
      
      logger.info('Found documentation entries', { 
        userId, 
        count: documentation.length,
        documentationIds: documentation.map(d => d.id)
      });
      
      // Get repository details for each documentation
      const documentationWithRepos = await Promise.all(
        documentation.map(async (doc) => {
          const { data: repo, error: repoError } = await supabaseAdmin
            .from('repository_access')
            .select('id, repo_full_name, repo_name, repo_owner, language, default_branch')
            .eq('id', doc.repository_id)
            .single();
            
          if (repoError || !repo) {
            logger.warn('Repository not found for documentation', { 
              documentationId: doc.id, 
              repositoryId: doc.repository_id 
            });
          }
          
          return {
            ...doc,
            repository: repo || null
          };
        })
      );
      
      return documentationWithRepos;
    } catch (error) {
      logger.error('Failed to get all documentation', { userId, error });
      throw error;
    }
  }

  async searchDocumentation(query: string, filters?: any): Promise<DocumentationFile[]> {
    // TODO: Implement search documentation
    logger.info('DocumentationService: searchDocumentation called');
    throw new Error('Not implemented');
  }

  async exportDocumentation(projectId: string, format: string): Promise<Buffer> {
    // TODO: Implement export documentation
    logger.info('DocumentationService: exportDocumentation called');
    throw new Error('Not implemented');
  }
}
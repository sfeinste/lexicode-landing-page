import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { AnthropicService } from '@/services/anthropic.service';
import { GitHubFileReaderService } from '@/services/github-file-reader.service';
import { CodeChunkingService } from '@/services/code-chunking.service';
import { PromptTemplates, CodeContext } from '@/services/prompt-templates';
import { CodeContextExtractionService } from '@/services/code-context-extraction.service';
import { FileDocumentationService, FileContext } from '@/services/file-documentation.service';
import { queueService, FileDocumentationJob } from '@/services/queueService';
import { v4 as uuidv4 } from 'uuid';
import { 
  DocumentationFile as DocFile, 
  DocumentationSummary, 
  FileDocumentationResult,
  RepositoryDocumentationResult 
} from '../types';

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
  private codeContextExtraction: CodeContextExtractionService;
  private fileDocumentation: FileDocumentationService;

  constructor() {
    this.anthropicService = new AnthropicService();
    this.githubFileReader = new GitHubFileReaderService();
    this.codeChunking = new CodeChunkingService();
    this.codeContextExtraction = new CodeContextExtractionService();
    this.fileDocumentation = new FileDocumentationService();
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
    logger.info('DocumentationService: generateDocumentation called - redirecting to file-based generation', { repositoryId, userId });
    
    // Always use file-based generation now
    const result = await this.generateFileBasedDocumentation(repositoryId, userId);
    
    // Convert the result to match the expected return type
    return {
      id: result.generation_id,
      projectId: '',
      status: 'completed',
      triggerType: 'manual',
      filesProcessed: result.files.length,
      filesFailed: 0,
      processingTimeSeconds: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date()
    };
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

  async getRepositoryInfo(repositoryId: string, userId: string): Promise<any> {
    logger.info('DocumentationService: getRepositoryInfo called', { repositoryId, userId });
    
    try {
      const { data: repository, error } = await supabaseAdmin
        .from('repository_access')
        .select('*')
        .eq('id', repositoryId)
        .eq('user_id', userId)
        .single();
        
      if (error || !repository) {
        logger.error('Repository not found or access denied', { error });
        return null;
      }
      
      return repository;
    } catch (error) {
      logger.error('Failed to get repository info', { repositoryId, error });
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

  /**
   * Generate file-based documentation for a repository
   */
  async generateFileBasedDocumentation(repositoryId: string, userId: string, jobId?: string): Promise<RepositoryDocumentationResult> {
    logger.info('DocumentationService: generateFileBasedDocumentation called', { repositoryId, userId });
    
    // Generate jobId if not provided
    if (!jobId) {
      jobId = uuidv4();
    }
    
    const startTime = Date.now();
    let generation: any = null;
    
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
          job_id: jobId,
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
      
      generation = newGeneration;
      
      // Create an empty documentation record immediately so frontend knows documentation exists
      logger.info('Creating empty documentation record for immediate availability');
      const { error: initialDocError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: `# ${repository.repo_full_name}\n\n*Documentation is being generated. Please check the Files tab to see individual file documentation as it becomes available.*`,
          generation_id: generation.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (initialDocError) {
        logger.error('Failed to create initial documentation record', { error: initialDocError });
        // Don't throw - continue with generation
      }

      // Create an empty summary immediately so frontend can show the repository
      logger.info('Creating empty documentation summary for immediate availability');
      const { error: initialSummaryError } = await supabaseAdmin
        .from('documentation_summaries')
        .upsert({
          repository_id: repositoryId,
          generation_id: generation.id,
          content: `# ${repository.repo_full_name}\n\n*Documentation is being generated. Please refresh in a few moments to see the content.*`,
          metadata: {
            total_files: 0,
            languages: {},
            total_lines: 0,
            documentation_coverage: 0
          }
        }, {
          onConflict: 'repository_id,generation_id'
        });
        
      if (initialSummaryError) {
        logger.error('Failed to create initial documentation summary', { error: initialSummaryError });
        // Don't throw - continue with generation
      }

      // Extract owner and name from repo_full_name
      const [owner, name] = repository.repo_full_name.split('/');
      const branch = repository.default_branch || 'main';
      
      // Fetch repository files
      logger.info('Fetching repository files', { owner, name, branch });
      
      const files = await this.githubFileReader.fetchRepositoryFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      // Fetch configuration files
      const configFiles = await this.githubFileReader.fetchConfigurationFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Fetch package.json for project context
      const packageJson = await this.githubFileReader.fetchPackageJson(
        installation.github_installation_id,
        owner,
        name,
        branch
      );
      
      // Combine all files and deduplicate by path
      const fileMap = new Map();
      [...files, ...configFiles].forEach(file => {
        fileMap.set(file.path, file);
      });
      const allFiles = Array.from(fileMap.values());
      
      logger.info('Files fetched', { 
        fileCount: allFiles.length,
        regularFiles: files.length,
        configFiles: configFiles.length,
        duplicatesRemoved: files.length + configFiles.length - allFiles.length
      });

      // Detect project type
      const projectType = PromptTemplates.detectProjectType({
        repositoryName: repository.repo_full_name,
        language: repository.language || 'unknown',
        files: allFiles,
        packageJson
      } as CodeContext);

      // Prepare file contexts
      const fileContexts: FileContext[] = allFiles.map(file => ({
        filePath: file.path,
        content: file.content,
        language: file.language,
        projectContext: {
          repositoryName: repository.repo_full_name,
          projectType,
          dependencies: packageJson ? {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
          } : undefined
        }
      }));

      // Queue file documentation jobs instead of processing synchronously
      logger.info('Queueing documentation jobs for individual files', { 
        fileCount: fileContexts.length,
        firstFile: fileContexts[0]?.filePath 
      });
      
      // Queue all file documentation jobs
      const fileJobs: FileDocumentationJob[] = [];
      for (const fileContext of fileContexts) {
        const fileJobId = uuidv4();
        const fileJob: FileDocumentationJob = {
          fileJobId,
          jobId,
          userId,
          repositoryId,
          filePath: fileContext.filePath,
          fileName: fileContext.filePath.split('/').pop() || '',
          fileExtension: fileContext.filePath.split('.').pop() || '',
          repositoryName: repository.repo_full_name
        };
        
        fileJobs.push(fileJob);
        
        // Publish job to queue
        await queueService.publishFileDocumentationJob(fileJob);
      }
      
      logger.info('File documentation jobs queued', {
        jobCount: fileJobs.length,
        jobId
      });
      
      // Update generation status to indicate files are being processed
      await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'processing',
          output_data: {
            files_queued: fileJobs.length,
            project_type: projectType
          }
        })
        .eq('id', generation.id);
      
      // The actual file processing will happen asynchronously in the file worker
      // For now, we'll skip the synchronous processing
      const fileDocumentations: FileDocumentationResult[] = [];
      let processedFiles = 0;
      let totalLinesProcessed = 0;
      const languageCount: { [key: string]: number } = {};
      
      // Skip the callback processing since files will be processed async
      const onFileCompleted = async (result: FileDocumentationResult, index: number, total: number) => {
        const fileInsert = {
          repository_id: repositoryId,
          generation_id: generation.id,
          file_path: result.file_path,
          file_type: result.metadata.file_type,
          language: result.metadata.language,
          lines_of_code: result.metadata.lines_of_code,
          generated_documentation: result.documentation,
          metadata: result.metadata
        };
        
        // Save the file immediately
        const { error: fileInsertError } = await supabaseAdmin
          .from('documentation_files')
          .insert(fileInsert);
          
        if (fileInsertError) {
          logger.error('Failed to insert file documentation immediately', { 
            error: fileInsertError,
            filePath: result.file_path 
          });
          // Don't throw - continue with other files
        } else {
          logger.info('File documentation saved immediately', {
            filePath: result.file_path,
            progress: `${index + 1}/${total}`
          });
          
          // Update tracking variables
          processedFiles++;
          totalLinesProcessed += result.metadata.lines_of_code || 0;
          if (result.metadata.language) {
            languageCount[result.metadata.language] = (languageCount[result.metadata.language] || 0) + 1;
          }
          
          // Update summary metadata incrementally
          const updatedMetadata = {
            total_files: allFiles.length,
            languages: languageCount,
            total_lines: totalLinesProcessed,
            documentation_coverage: (processedFiles / allFiles.length) * 100
          };
          
          await supabaseAdmin
            .from('documentation_summaries')
            .update({
              metadata: updatedMetadata,
              updated_at: new Date().toISOString()
            })
            .eq('repository_id', repositoryId)
            .eq('generation_id', generation.id);
        }
        
        // Update generation progress
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            files_processed: index + 1,
            output_data: {
              current_file: index + 1,
              total_files: total,
              last_processed_file: result.file_path
            }
          })
          .eq('id', generation.id);
      };
      
      // Skip synchronous generation - files will be processed by the worker
      // const generatedDocs = await this.fileDocumentation.generateBatchFileDocumentation(
      //   fileContexts,
      //   onFileCompleted
      // );
      // 
      // fileDocumentations.push(...generatedDocs);
      
      logger.info('File documentation jobs have been queued', { 
        jobsQueued: fileJobs.length 
      });
      
      // Since file processing is async, we'll skip summary generation here
      // The summary will be generated after all files are processed by the worker
      
      // For now, return a partial result indicating processing has started
      const partialMetadata = {
        total_files: allFiles.length,
        languages: this.calculateLanguageDistribution(allFiles),
        total_lines: 0, // Will be updated as files are processed
        documentation_coverage: 0, // Will be updated as files are processed
        files_queued: fileJobs.length
      };

      // Update the placeholder summary to indicate processing is in progress
      logger.info('Setting documentation summary to processing state');
      const { error: summaryError } = await supabaseAdmin
        .from('documentation_summaries')
        .upsert({
          repository_id: repositoryId,
          generation_id: generation.id,
          content: 'Documentation generation in progress. Files are being processed asynchronously.',
          metadata: partialMetadata,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,generation_id'
        });
        
      if (summaryError) {
        logger.error('Failed to update documentation summary', { error: summaryError });
        throw new Error('Failed to update documentation summary');
      }
      
      logger.info('Documentation summary updated successfully', {
        repositoryId,
        generationId: generation.id
      });
      
      // Update the documentation record to indicate processing state
      logger.info('Updating documentation record to processing state');
      const { error: docUpdateError } = await supabaseAdmin
        .from('documentation')
        .upsert({
          repository_id: repositoryId,
          user_id: userId,
          content: 'Documentation generation in progress. Files are being processed asynchronously.',
          generation_id: generation.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'repository_id,user_id'
        });
        
      if (docUpdateError) {
        logger.error('Failed to update documentation record', { error: docUpdateError });
        // Don't throw - continue processing
      }
      
      // Update generation record to indicate jobs have been queued
      const processingTime = (Date.now() - startTime) / 1000;
      await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'processing',
          files_processed: 0,
          processing_time_seconds: processingTime,
          output_data: {
            total_files: allFiles.length,
            files_queued: fileJobs.length,
            metadata: partialMetadata
          }
        })
        .eq('id', generation.id);

      logger.info('File documentation jobs queued successfully', {
        repositoryId,
        generationId: generation.id,
        filesQueued: fileJobs.length,
        processingTime
      });

      // Return partial result indicating processing has started
      return {
        repository_id: repositoryId,
        generation_id: generation.id,
        summary: 'Documentation generation in progress',
        files: [], // Files will be populated by the worker
        metadata: partialMetadata
      };
      
    } catch (error) {
      logger.error('File-based documentation generation failed', { repositoryId, error });
      
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

  /**
   * Get file-based documentation for a repository
   */
  async getFileDocumentation(repositoryId: string, userId: string): Promise<DocFile[]> {
    logger.info('Getting file documentation', { repositoryId, userId });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest generation (regardless of status so we can see files as they're being generated)
    const { data: latestGeneration } = await supabaseAdmin
      .from('documentation_generations')
      .select('id')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (!latestGeneration) {
      return [];
    }
    
    // Get file documentation
    const { data: files, error } = await supabaseAdmin
      .from('documentation_files')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('generation_id', latestGeneration.id)
      .order('file_path');
      
    if (error) {
      logger.error('Failed to get file documentation', { error });
      throw error;
    }
    
    return files.map(file => ({
      id: file.id,
      repository_id: file.repository_id,
      generation_id: file.generation_id,
      file_path: file.file_path,
      file_type: file.file_type,
      language: file.language,
      lines_of_code: file.lines_of_code,
      generated_documentation: file.generated_documentation,
      metadata: file.metadata,
      created_at: new Date(file.created_at),
      updated_at: new Date(file.updated_at)
    }));
  }

  /**
   * Get documentation summary for a repository
   */
  async getDocumentationSummary(repositoryId: string, userId: string): Promise<DocumentationSummary | null> {
    logger.info('Getting documentation summary', { repositoryId, userId });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest summary
    const { data: summary, error } = await supabaseAdmin
      .from('documentation_summaries')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !summary) {
      return null;
    }
    
    return {
      id: summary.id,
      repository_id: summary.repository_id,
      generation_id: summary.generation_id,
      content: summary.content,
      metadata: summary.metadata,
      created_at: new Date(summary.created_at),
      updated_at: new Date(summary.updated_at)
    };
  }

  /**
   * Get specific file documentation
   */
  async getFileDocumentationByPath(repositoryId: string, userId: string, filePath: string): Promise<DocFile | null> {
    logger.info('Getting file documentation by path', { repositoryId, userId, filePath });
    
    // Verify user has access
    const { data: access } = await supabaseAdmin
      .from('repository_access')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();
      
    if (!access) {
      throw new Error('Repository not found or access denied');
    }
    
    // Get the latest generation (regardless of status so we can see files as they're being generated)
    const { data: latestGeneration } = await supabaseAdmin
      .from('documentation_generations')
      .select('id')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (!latestGeneration) {
      return null;
    }
    
    // Get specific file documentation
    const { data: file, error } = await supabaseAdmin
      .from('documentation_files')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('generation_id', latestGeneration.id)
      .eq('file_path', filePath)
      .single();
      
    if (error || !file) {
      return null;
    }
    
    return {
      id: file.id,
      repository_id: file.repository_id,
      generation_id: file.generation_id,
      file_path: file.file_path,
      file_type: file.file_type,
      language: file.language,
      lines_of_code: file.lines_of_code,
      generated_documentation: file.generated_documentation,
      metadata: file.metadata,
      created_at: new Date(file.created_at),
      updated_at: new Date(file.updated_at)
    };
  }

  private calculateLanguageDistribution(files: any[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    files.forEach(file => {
      const lang = file.language || 'unknown';
      distribution[lang] = (distribution[lang] || 0) + 1;
    });
    
    return distribution;
  }
}
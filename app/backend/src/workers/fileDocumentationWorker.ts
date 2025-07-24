import { logger } from '@/shared/logger';
import { queueService, FileDocumentationJob } from '@/services/queueService';
import { supabaseAdmin } from '@/lib/supabase';
import { FileDocumentationService } from '@/services/file-documentation.service';
import { GitHubFileReaderService } from '@/services/github-file-reader.service';
import { PromptTemplates } from '@/services/prompt-templates';
import { createClient } from 'redis';

class FileDocumentationWorker {
  private fileDocumentation: FileDocumentationService;
  private githubFileReader: GitHubFileReaderService;
  private isRunning = false;
  private redisClient: ReturnType<typeof createClient>;

  constructor() {
    this.fileDocumentation = new FileDocumentationService();
    this.githubFileReader = new GitHubFileReaderService();
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  }

  async start(): Promise<void> {
    try {
      await this.redisClient.connect();
      logger.info('Connected to Redis for file progress tracking');
      
      await queueService.connect();
      this.isRunning = true;
      
      logger.info('File documentation worker started');
      
      await queueService.consumeFileDocumentationJobs(async (job) => {
        await this.processFileJob(job);
      });
      
    } catch (error) {
      logger.error('Failed to start file documentation worker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await queueService.disconnect();
    await this.redisClient.quit();
    logger.info('File documentation worker stopped');
  }

  private async processFileJob(job: FileDocumentationJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing file documentation job', {
        fileJobId: job.fileJobId,
        jobId: job.jobId,
        filePath: job.filePath
      });

      // Get repository and installation details
      const { data: repository, error: repoError } = await supabaseAdmin
        .from('repository_access')
        .select('*, github_installations!inner(*)')
        .eq('id', job.repositoryId)
        .eq('user_id', job.userId)
        .single();

      if (repoError || !repository) {
        throw new Error('Repository not found or access denied');
      }

      const installation = repository.github_installations;
      const [owner, name] = repository.repo_full_name.split('/');
      const branch = repository.default_branch || 'main';

      // Get generation record
      const { data: generation, error: genError } = await supabaseAdmin
        .from('documentation_generations')
        .select('*')
        .eq('job_id', job.jobId)
        .single();

      if (genError || !generation) {
        throw new Error('Generation record not found');
      }

      // Fetch all files but filter for the specific file we need
      const allFiles = await this.githubFileReader.fetchRepositoryFiles(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      const fileData = allFiles.find(f => f.path === job.filePath);
      if (!fileData) {
        throw new Error(`Failed to fetch file: ${job.filePath}`);
      }

      // Fetch package.json for project context
      const packageJson = await this.githubFileReader.fetchPackageJson(
        installation.github_installation_id,
        owner,
        name,
        branch
      );

      // Detect project type
      const projectType = PromptTemplates.detectProjectType({
        repositoryName: repository.repo_full_name,
        language: repository.language || 'unknown',
        files: [{ path: job.filePath, content: fileData.content, language: fileData.language }],
        packageJson
      } as any);

      // Generate documentation for the file
      const fileContext = {
        filePath: job.filePath,
        content: fileData.content,
        language: fileData.language,
        projectContext: {
          repositoryName: repository.repo_full_name,
          projectType,
          dependencies: packageJson ? {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
          } : undefined
        }
      };

      const result = await this.fileDocumentation.generateFileDocumentation(fileContext);

      // Save the file documentation
      const fileInsert = {
        repository_id: job.repositoryId,
        generation_id: generation.id,
        file_path: result.file_path,
        file_type: result.metadata.file_type,
        language: result.metadata.language,
        lines_of_code: result.metadata.lines_of_code,
        generated_documentation: result.documentation,
        metadata: result.metadata
      };

      const { error: insertError } = await supabaseAdmin
        .from('documentation_files')
        .insert(fileInsert);

      if (insertError) {
        throw new Error(`Failed to save file documentation: ${insertError.message}`);
      }

      logger.info('File documentation saved', {
        fileJobId: job.fileJobId,
        filePath: job.filePath,
        linesOfCode: result.metadata.lines_of_code
      });

      // Update progress in Redis
      await this.updateProgress(job.jobId, generation.id);

      // Check if all files have been processed
      await this.checkAndFinalizeGeneration(job.jobId, generation.id, job.repositoryId, job.userId);

    } catch (error) {
      logger.error('Error processing file documentation job:', error, {
        fileJobId: job.fileJobId,
        filePath: job.filePath
      });
      
      // Update generation with error if this is a critical failure
      await supabaseAdmin
        .from('documentation_generations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('job_id', job.jobId);
      
      throw error;
    }
  }

  private async updateProgress(jobId: string, generationId: string): Promise<void> {
    // Get current progress
    const { data: generation } = await supabaseAdmin
      .from('documentation_generations')
      .select('files_processed, output_data')
      .eq('id', generationId)
      .single();

    if (generation) {
      const filesProcessed = (generation.files_processed || 0) + 1;
      const totalFiles = generation.output_data?.files_queued || 0;

      // Update generation progress
      await supabaseAdmin
        .from('documentation_generations')
        .update({
          files_processed: filesProcessed
        })
        .eq('id', generationId);

      // Update Redis progress
      const progress = {
        jobId,
        status: 'processing' as const,
        currentFile: filesProcessed,
        totalFiles
      };

      await this.redisClient.setEx(
        `job:progress:${jobId}`,
        3600, // 1 hour expiry
        JSON.stringify(progress)
      );

      // Publish progress update
      await queueService.publishProgress(jobId, progress);
    }
  }

  private async checkAndFinalizeGeneration(
    jobId: string, 
    generationId: string, 
    repositoryId: string,
    userId: string
  ): Promise<void> {
    // Check if all files have been processed
    const { data: generation } = await supabaseAdmin
      .from('documentation_generations')
      .select('files_processed, output_data')
      .eq('id', generationId)
      .single();

    if (!generation) return;

    const filesProcessed = generation.files_processed || 0;
    const totalFiles = generation.output_data?.files_queued || 0;

    if (filesProcessed >= totalFiles && totalFiles > 0) {
      logger.info('All files processed, generating final summary', {
        jobId,
        filesProcessed,
        totalFiles
      });

      // Get all processed files
      const { data: files } = await supabaseAdmin
        .from('documentation_files')
        .select('*')
        .eq('generation_id', generationId);

      if (!files || files.length === 0) {
        logger.error('No files found for summary generation');
        return;
      }

      // Calculate metadata
      const languageCount: { [key: string]: number } = {};
      let totalLines = 0;

      files.forEach(file => {
        if (file.language) {
          languageCount[file.language] = (languageCount[file.language] || 0) + 1;
        }
        totalLines += file.lines_of_code || 0;
      });

      const metadata = {
        total_files: totalFiles,
        languages: languageCount,
        total_lines: totalLines,
        documentation_coverage: (filesProcessed / totalFiles) * 100
      };

      // Generate repository summary
      try {
        const { data: repository } = await supabaseAdmin
          .from('repository_access')
          .select('repo_full_name')
          .eq('id', repositoryId)
          .single();

        const fileDocumentations = files.map(file => ({
          file_path: file.file_path,
          documentation: file.generated_documentation,
          metadata: file.metadata
        }));

        const summary = await this.fileDocumentation.generateRepositorySummary(
          repository?.repo_full_name || '',
          files.map(f => ({ path: f.file_path, content: '', language: f.language })),
          fileDocumentations
        );

        // Update documentation summary
        await supabaseAdmin
          .from('documentation_summaries')
          .update({
            content: summary,
            metadata,
            updated_at: new Date().toISOString()
          })
          .eq('repository_id', repositoryId)
          .eq('generation_id', generationId);

        // Update main documentation record
        await supabaseAdmin
          .from('documentation')
          .update({
            content: summary,
            updated_at: new Date().toISOString()
          })
          .eq('repository_id', repositoryId)
          .eq('user_id', userId);

        // Mark generation as completed
        const processingTime = (Date.now() - (new Date(generation.output_data?.started_at || Date.now())).getTime()) / 1000;
        
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            status: 'completed',
            processing_time_seconds: processingTime,
            completed_at: new Date().toISOString(),
            output_data: {
              ...generation.output_data,
              total_files: totalFiles,
              documented_files: filesProcessed,
              metadata
            }
          })
          .eq('id', generationId);

        // Update Redis progress
        const finalProgress = {
          jobId,
          status: 'completed' as const,
          currentFile: filesProcessed,
          totalFiles,
          completedAt: new Date()
        };

        await this.redisClient.setEx(
          `job:progress:${jobId}`,
          3600, // 1 hour expiry
          JSON.stringify(finalProgress)
        );

        // Publish final progress
        await queueService.publishProgress(jobId, finalProgress);

        logger.info('Documentation generation completed', {
          jobId,
          generationId,
          filesProcessed,
          processingTime
        });

      } catch (error) {
        logger.error('Error generating summary:', error);
        
        await supabaseAdmin
          .from('documentation_generations')
          .update({
            status: 'failed',
            error_message: 'Failed to generate summary',
            completed_at: new Date().toISOString()
          })
          .eq('id', generationId);
      }
    }
  }
}

// Create worker instance
const worker = new FileDocumentationWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

// Start the worker
worker.start().catch(error => {
  logger.error('Failed to start file documentation worker:', error);
  process.exit(1);
});

export { FileDocumentationWorker };
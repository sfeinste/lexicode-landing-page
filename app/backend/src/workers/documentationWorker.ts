import { queueService, DocumentationJob, JobProgress } from '../services/queueService';
import { DocumentationService } from '../modules/documentation/services/documentation-service';
import { FileDocumentationService } from '../services/file-documentation.service';
import { logger } from '@/shared/logger';
import { createClient } from 'redis';
import { supabaseAdmin } from '@/lib/supabase';

interface ProgressData {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentFile: number;
  totalFiles: number;
  error?: string;
  completedAt?: Date;
}

class DocumentationWorker {
  private documentationService: DocumentationService;
  private fileDocumentationService: FileDocumentationService;
  private redisClient: ReturnType<typeof createClient>;

  constructor() {
    this.documentationService = new DocumentationService();
    this.fileDocumentationService = new FileDocumentationService();
    
    // Initialize Redis client for progress tracking
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  }

  async start(): Promise<void> {
    try {
      // Connect to Redis
      await this.redisClient.connect();
      logger.info('Connected to Redis for progress tracking');
      
      // Connect to RabbitMQ
      await queueService.connect();
      logger.info('Documentation worker connected to RabbitMQ');
      
      // Start consuming jobs
      await queueService.consumeDocumentationJobs(this.processJob.bind(this));
      logger.info('Documentation worker started consuming jobs');
    } catch (error) {
      logger.error('Failed to start documentation worker:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    await queueService.disconnect();
    await this.redisClient.quit();
    logger.info('Documentation worker stopped');
  }

  private async processJob(job: DocumentationJob): Promise<void> {
    logger.info(`Processing documentation job: ${job.jobId}`);
    
    try {
      // Update progress: starting
      await this.updateProgress(job.jobId, {
        jobId: job.jobId,
        status: 'processing',
        currentFile: 0,
        totalFiles: 0
      });

      // Always process file-based documentation
      await this.processFileBasedDocumentation(job);

      // Update progress: completed
      await this.updateProgress(job.jobId, {
        jobId: job.jobId,
        status: 'completed',
        currentFile: 0,
        totalFiles: 0,
        completedAt: new Date()
      });

      logger.info(`Completed documentation job: ${job.jobId}`);
    } catch (error) {
      logger.error(`Failed to process documentation job ${job.jobId}:`, error);
      
      // Update progress: failed
      await this.updateProgress(job.jobId, {
        jobId: job.jobId,
        status: 'failed',
        currentFile: 0,
        totalFiles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }


  private async processFileBasedDocumentation(job: DocumentationJob): Promise<void> {
    // Start a background task to monitor progress from the database
    const progressInterval = setInterval(async () => {
      try {
        // Query the documentation_generations table for progress
        const { data: generation } = await supabaseAdmin
          .from('documentation_generations')
          .select('files_processed, output_data')
          .eq('repository_id', job.repositoryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (generation && generation.output_data) {
          const currentFile = generation.output_data.current_file || generation.files_processed || 0;
          const totalFiles = generation.output_data.total_files || 0;
          
          await this.updateProgress(job.jobId, {
            jobId: job.jobId,
            status: 'processing',
            currentFile,
            totalFiles
          });
        }
      } catch (error) {
        logger.error('Error checking progress from database:', error);
      }
    }, 2000); // Check every 2 seconds
    
    try {
      // Call the service method based on the selected method
      let result;
      if (job.method === 'claude-code') {
        logger.info('Using Claude Code SDK for documentation generation');
        result = await this.documentationService.generateClaudeCodeDocumentation(
          job.repositoryId,
          job.userId,
          job.jobId
        );
      } else {
        logger.info('Using file-by-file method for documentation generation');
        result = await this.documentationService.generateFileBasedDocumentation(
          job.repositoryId,
          job.userId,
          job.jobId
        );
      }
      
      // Clear the interval
      clearInterval(progressInterval);
      
      // Final progress update
      const totalFiles = result.files.length;
      await this.updateProgress(job.jobId, {
        jobId: job.jobId,
        status: 'processing',
        currentFile: totalFiles,
        totalFiles: totalFiles
      });
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  private async updateProgress(jobId: string, progress: ProgressData): Promise<void> {
    try {
      // Store progress in Redis with 1 hour expiry
      await this.redisClient.setEx(
        `progress:${jobId}`,
        3600,
        JSON.stringify(progress)
      );

      // Publish progress update via RabbitMQ
      await queueService.publishProgress(jobId, progress as JobProgress);
    } catch (error) {
      logger.error(`Failed to update progress for job ${jobId}:`, error);
    }
  }
}

// Export singleton instance
export const documentationWorker = new DocumentationWorker();

// Start worker if this file is run directly
if (require.main === module) {
  documentationWorker.start().catch((error) => {
    logger.error('Failed to start documentation worker:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await documentationWorker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await documentationWorker.stop();
    process.exit(0);
  });
}
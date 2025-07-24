import { Request, Response } from 'express';
import { DocumentationService } from '../services/documentation-service';
import { logger } from '@/shared/logger';
import { queueService, DocumentationJob } from '../../../services/queueService';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';

export class DocumentationController {
  private documentationService: DocumentationService;
  private redisClient: ReturnType<typeof createClient>;

  constructor() {
    this.documentationService = new DocumentationService();
    
    // Initialize Redis client for progress tracking
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redisClient.on('error', (err) => logger.error('Redis Client Error in Controller', err));
    this.redisClient.connect().catch(err => logger.error('Failed to connect to Redis in Controller', err));
  }

  async generateDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id; // From auth middleware
      
      logger.info('Generate documentation request', { repositoryId, userId });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      // Get repository info to include in job
      const repositoryInfo = await this.documentationService.getRepositoryInfo(repositoryId, userId);
      if (!repositoryInfo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }
      
      // Create job and enqueue it - always use file-based generation
      const jobId = uuidv4();
      const job: DocumentationJob = {
        jobId,
        userId,
        repositoryId,
        repositoryName: repositoryInfo.name,
        generateFiles: true  // Always generate file-based documentation
      };
      
      await queueService.publishDocumentationJob(job);
      
      res.status(202).json({
        message: 'Documentation generation queued',
        jobId,
        status: 'pending'
      });
    } catch (error) {
      logger.error('Generate documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  async getDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id; // From auth middleware
      
      logger.info('Get documentation request', { repositoryId, userId });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      const documentation = await this.documentationService.getDocumentation(
        repositoryId,
        userId
      );
      
      if (!documentation) {
        res.status(404).json({ error: 'Documentation not found' });
        return;
      }
      
      res.status(200).json(documentation);
    } catch (error) {
      logger.error('Get documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  async getAllDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id; // From auth middleware
      
      logger.info('Get all documentation request', { userId });
      
      const documentation = await this.documentationService.getAllDocumentation(userId);
      
      logger.info('Returning documentation', { 
        userId, 
        documentationCount: documentation.length 
      });
      
      res.status(200).json(documentation);
    } catch (error) {
      logger.error('Get all documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement get projects
      logger.info('Get projects');
      res.status(501).json({ message: 'Get projects not implemented yet' });
    } catch (error) {
      logger.error('Get projects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProject(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement get project
      logger.info('Get project');
      res.status(501).json({ message: 'Get project not implemented yet' });
    } catch (error) {
      logger.error('Get project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement update project
      logger.info('Update project');
      res.status(501).json({ message: 'Update project not implemented yet' });
    } catch (error) {
      logger.error('Update project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement delete project
      logger.info('Delete project');
      res.status(501).json({ message: 'Delete project not implemented yet' });
    } catch (error) {
      logger.error('Delete project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjectFiles(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement get project files
      logger.info('Get project files');
      res.status(501).json({ message: 'Get project files not implemented yet' });
    } catch (error) {
      logger.error('Get project files error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getGenerations(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement get generations
      logger.info('Get generations');
      res.status(501).json({ message: 'Get generations not implemented yet' });
    } catch (error) {
      logger.error('Get generations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async regenerateDocumentation(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement regenerate documentation
      logger.info('Regenerate documentation');
      res.status(501).json({ message: 'Regenerate documentation not implemented yet' });
    } catch (error) {
      logger.error('Regenerate documentation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async downloadDocumentation(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement download documentation
      logger.info('Download documentation');
      res.status(501).json({ message: 'Download documentation not implemented yet' });
    } catch (error) {
      logger.error('Download documentation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async exportDocumentation(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement export documentation
      logger.info('Export documentation');
      res.status(501).json({ message: 'Export documentation not implemented yet' });
    } catch (error) {
      logger.error('Export documentation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async searchDocumentation(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement search documentation
      logger.info('Search documentation');
      res.status(501).json({ message: 'Search documentation not implemented yet' });
    } catch (error) {
      logger.error('Search documentation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate file-based documentation for a repository
   */
  async generateFileBasedDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id;
      
      logger.info('Generate file-based documentation request', { repositoryId, userId });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      // Get repository info to include in job
      const repositoryInfo = await this.documentationService.getRepositoryInfo(repositoryId, userId);
      if (!repositoryInfo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }
      
      // Create job and enqueue it
      const jobId = uuidv4();
      const job: DocumentationJob = {
        jobId,
        userId,
        repositoryId,
        repositoryName: repositoryInfo.name,
        generateFiles: true
      };
      
      await queueService.publishDocumentationJob(job);
      
      res.status(202).json({
        message: 'File-based documentation generation queued',
        jobId,
        status: 'pending'
      });
    } catch (error) {
      logger.error('Generate file-based documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  /**
   * Generate documentation using Claude Code SDK
   */
  async generateClaudeCodeDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id;
      const method  = 'claude-code'
      
      logger.info('Generate documentation request with method selection', { repositoryId, userId, method });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      // Get repository info to include in job
      const repositoryInfo = await this.documentationService.getRepositoryInfo(repositoryId, userId);
      if (!repositoryInfo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }
      
      // Create job and enqueue it
      const jobId = uuidv4();
      const job: DocumentationJob = {
        jobId,
        userId,
        repositoryId,
        repositoryName: repositoryInfo.name,
        generateFiles: true,
        method: method || 'file-by-file' // Default to file-by-file for backward compatibility
      };
      
      await queueService.publishDocumentationJob(job);
      
      res.status(202).json({
        message: `Documentation generation queued (${method || 'file-by-file'} method)`,
        jobId,
        status: 'pending',
        method: method || 'file-by-file'
      });
    } catch (error) {
      logger.error('Generate documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  /**
   * Get all file documentation for a repository
   */
  async getFileDocumentation(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id;
      
      logger.info('Get file documentation request', { repositoryId, userId });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      const files = await this.documentationService.getFileDocumentation(
        repositoryId,
        userId
      );
      
      res.status(200).json({
        repository_id: repositoryId,
        files: files.map(file => ({
          file_path: file.file_path,
          file_type: file.file_type,
          language: file.language,
          lines_of_code: file.lines_of_code,
          has_documentation: !!file.generated_documentation
        })),
        total_files: files.length
      });
    } catch (error) {
      logger.error('Get file documentation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  /**
   * Get documentation for a specific file
   */
  async getFileDocumentationByPath(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id;
      
      // Extract file path from the URL (everything after /files/)
      const filePath = req.params[0]; // This gets the wildcard part
      
      logger.info('Get file documentation by path request', { repositoryId, userId, filePath });
      
      if (!repositoryId || !filePath) {
        res.status(400).json({ error: 'Repository ID and file path are required' });
        return;
      }
      
      const fileDoc = await this.documentationService.getFileDocumentationByPath(
        repositoryId,
        userId,
        filePath
      );
      
      if (!fileDoc) {
        res.status(404).json({ error: 'File documentation not found' });
        return;
      }
      
      res.status(200).json({
        file_path: fileDoc.file_path,
        file_type: fileDoc.file_type,
        language: fileDoc.language,
        lines_of_code: fileDoc.lines_of_code,
        documentation: fileDoc.generated_documentation,
        metadata: fileDoc.metadata,
        created_at: fileDoc.created_at,
        updated_at: fileDoc.updated_at
      });
    } catch (error) {
      logger.error('Get file documentation by path error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  /**
   * Get documentation summary for a repository
   */
  async getDocumentationSummary(req: Request, res: Response): Promise<void> {
    try {
      const { repositoryId } = req.params;
      const userId = (req as any).user.id;
      
      logger.info('Get documentation summary request', { repositoryId, userId });
      
      if (!repositoryId) {
        res.status(400).json({ error: 'Repository ID is required' });
        return;
      }
      
      const summary = await this.documentationService.getDocumentationSummary(
        repositoryId,
        userId
      );
      
      if (!summary) {
        res.status(404).json({ error: 'Documentation summary not found' });
        return;
      }
      
      res.status(200).json({
        repository_id: summary.repository_id,
        content: summary.content,
        metadata: summary.metadata,
        created_at: summary.created_at,
        updated_at: summary.updated_at
      });
    } catch (error) {
      logger.error('Get documentation summary error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  /**
   * Get job progress
   */
  async getJobProgress(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = (req as any).user.id;
      
      logger.info('Get job progress request', { jobId, userId });
      
      if (!jobId) {
        res.status(400).json({ error: 'Job ID is required' });
        return;
      }
      
      // Get progress from Redis
      const progressData = await this.redisClient.get(`progress:${jobId}`);
      
      if (!progressData) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      
      const progress = JSON.parse(progressData);
      
      res.status(200).json(progress);
    } catch (error) {
      logger.error('Get job progress error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
}
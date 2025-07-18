import { Request, Response } from 'express';
import { DocumentationService } from '../services/documentation-service';
import { logger } from '@/shared/logger';

export class DocumentationController {
  private documentationService: DocumentationService;

  constructor() {
    this.documentationService = new DocumentationService();
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
      
      // Start documentation generation
      const generation = await this.documentationService.generateDocumentation(
        repositoryId,
        userId
      );
      
      res.status(200).json({
        message: 'Documentation generation started',
        generation
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
      
      // Start file-based documentation generation
      const result = await this.documentationService.generateFileBasedDocumentation(
        repositoryId,
        userId
      );
      
      res.status(200).json({
        message: 'File-based documentation generation completed',
        result: {
          repository_id: result.repository_id,
          generation_id: result.generation_id,
          files_documented: result.files.length,
          metadata: result.metadata
        }
      });
    } catch (error) {
      logger.error('Generate file-based documentation error:', error);
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
}
import { RepositoryService } from './repository-service';
import { logger } from '@/shared/logger';

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RepositoryService', () => {
  let repositoryService: RepositoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    repositoryService = new RepositoryService();
  });

  describe('getUserRepositories', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.getUserRepositories('user-123'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getUserRepositories called');
    });
  });

  describe('syncUserRepositories', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.syncUserRepositories('user-123'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: syncUserRepositories called');
    });
  });

  describe('getRepository', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.getRepository('repo-123'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getRepository called');
    });
  });

  describe('updateRepository', () => {
    it('should throw not implemented error', async () => {
      const updateData = { name: 'new-name' };
      
      await expect(repositoryService.updateRepository('repo-123', updateData))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: updateRepository called');
    });
  });

  describe('deleteRepository', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.deleteRepository('repo-123'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: deleteRepository called');
    });
  });

  describe('getRepositoryBranches', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.getRepositoryBranches('repo-123'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getRepositoryBranches called');
    });
  });

  describe('getRepositoryFiles', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.getRepositoryFiles('repo-123', 'main'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getRepositoryFiles called');
    });

    it('should throw not implemented error with path parameter', async () => {
      await expect(repositoryService.getRepositoryFiles('repo-123', 'main', 'src'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getRepositoryFiles called');
    });
  });

  describe('getRepositoryContent', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.getRepositoryContent('repo-123', 'main', 'README.md'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: getRepositoryContent called');
    });
  });

  describe('createWebhook', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.createWebhook('repo-123', 'https://example.com/webhook'))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: createWebhook called');
    });
  });

  describe('deleteWebhook', () => {
    it('should throw not implemented error', async () => {
      await expect(repositoryService.deleteWebhook('repo-123', 12345))
        .rejects.toThrow('Not implemented');
      
      expect(logger.info).toHaveBeenCalledWith('RepositoryService: deleteWebhook called');
    });
  });
});
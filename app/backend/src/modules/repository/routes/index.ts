import { Router } from 'express';
import { RepositoryController } from '../controllers/repository-controller';
import { authMiddleware } from '@/modules/auth/middleware/auth-middleware';

const router = Router();
const repositoryController = new RepositoryController();

// All repository routes require authentication
router.use(authMiddleware);

// Repository management routes
router.get('/', repositoryController.getRepositories.bind(repositoryController));
router.post('/sync', repositoryController.syncRepositories.bind(repositoryController));
router.get('/:id', repositoryController.getRepository.bind(repositoryController));
router.put('/:id', repositoryController.updateRepository.bind(repositoryController));
router.delete('/:id', repositoryController.deleteRepository.bind(repositoryController));

// Repository content routes
router.get('/:id/branches', repositoryController.getBranches.bind(repositoryController));
router.get('/:id/files', repositoryController.getFiles.bind(repositoryController));
router.get('/:id/content/*', repositoryController.getContent.bind(repositoryController));

// Webhook routes
router.post('/:id/webhook', repositoryController.createWebhook.bind(repositoryController));
router.delete('/:id/webhook', repositoryController.deleteWebhook.bind(repositoryController));

export { router as repositoryRoutes };
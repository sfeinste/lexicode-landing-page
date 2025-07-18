import { Router } from 'express';
import { DocumentationController } from '../controllers/documentation-controller';
import { authMiddleware } from '@/modules/auth/middleware/auth-middleware';

const router = Router();
const documentationController = new DocumentationController();

// All documentation routes require authentication
router.use(authMiddleware);

// Documentation generation routes
router.get('/', documentationController.getAllDocumentation.bind(documentationController));
router.post('/generate/:repositoryId', documentationController.generateDocumentation.bind(documentationController));
router.get('/:repositoryId', documentationController.getDocumentation.bind(documentationController));

// File-based documentation routes
router.post('/generate-files/:repositoryId', documentationController.generateFileBasedDocumentation.bind(documentationController));
router.get('/:repositoryId/files', documentationController.getFileDocumentation.bind(documentationController));
router.get('/:repositoryId/files/*', documentationController.getFileDocumentationByPath.bind(documentationController));
router.get('/:repositoryId/summary', documentationController.getDocumentationSummary.bind(documentationController));

// Legacy/future routes (keeping for compatibility)
router.get('/projects', documentationController.getProjects.bind(documentationController));
router.get('/projects/:id', documentationController.getProject.bind(documentationController));
router.put('/projects/:id', documentationController.updateProject.bind(documentationController));
router.delete('/projects/:id', documentationController.deleteProject.bind(documentationController));

// Documentation content routes
router.get('/projects/:id/files', documentationController.getProjectFiles.bind(documentationController));
router.get('/projects/:id/generations', documentationController.getGenerations.bind(documentationController));
router.post('/projects/:id/regenerate', documentationController.regenerateDocumentation.bind(documentationController));

// Export routes
router.get('/projects/:id/download', documentationController.downloadDocumentation.bind(documentationController));
router.get('/projects/:id/export/:format', documentationController.exportDocumentation.bind(documentationController));

// Search routes
router.get('/search', documentationController.searchDocumentation.bind(documentationController));

export { router as documentationRoutes };
import { Router } from 'express';
import { authController, authValidation } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth-middleware';
import githubAppRoutes from './github-app-routes';

const router = Router();

// Public routes
router.post('/register', authValidation.register, authController.register.bind(authController));
router.post('/login', authValidation.login, authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));

// GitHub OAuth routes (legacy)
router.get('/github', authController.githubAuth.bind(authController));
router.get('/github/callback', authController.githubCallback.bind(authController));

// GitHub App routes
router.use('/github-app', githubAppRoutes);

// Protected routes
router.use(authMiddleware);
router.get('/me', authController.getCurrentUser.bind(authController));
router.put('/profile', authController.updateProfile.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.delete('/account', authController.deleteAccount.bind(authController));

export { router as authRoutes };
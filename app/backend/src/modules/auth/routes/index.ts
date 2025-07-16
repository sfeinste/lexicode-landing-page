import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

// GitHub OAuth routes
router.get('/github', authController.githubAuth.bind(authController));
router.get('/github/callback', authController.githubCallback.bind(authController));

// Protected routes
router.use(authMiddleware);
router.get('/me', authController.getCurrentUser.bind(authController));
router.put('/profile', authController.updateProfile.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.delete('/account', authController.deleteAccount.bind(authController));

export { router as authRoutes };
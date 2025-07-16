import { Request, Response } from 'express';
import { authService } from '../services/auth-service';
import { logger } from '@/shared/logger';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { body, validationResult } from 'express-validator';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Registration request received', { 
        email: req.body.email,
        hasUsername: !!req.body.username,
        hasFullName: !!req.body.fullName 
      });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Registration validation failed', { errors: errors.array() });
        res.status(400).json({ 
          error: {
            message: 'Validation failed',
            details: errors.array(),
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { email, password, username, fullName } = req.body;
      
      logger.info('Calling auth service for registration', { email });
      
      const result = await authService.register({
        email,
        password,
        username,
        fullName
      });

      logger.info('Registration completed successfully', { 
        userId: result.user.id,
        email: result.user.email 
      });
      
      res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.error('Registration controller error:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        details: error
      });
      
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Registration failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { details: error })
        }
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          error: {
            message: 'Validation failed',
            details: errors.array(),
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { email, password } = req.body;
      
      const result = await authService.login(email, password);

      logger.info('User logged in successfully:', result.user.id);
      
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Login failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({ 
          error: {
            message: 'Refresh token is required',
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully for user:', result.user.id);
      
      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Token refresh failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async githubAuth(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.loginWithGitHub();
      
      logger.info('GitHub OAuth URL generated');
      
      res.json({
        url: result.url
      });
    } catch (error: any) {
      logger.error('GitHub OAuth error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'GitHub OAuth failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async githubCallback(req: Request, res: Response): Promise<void> {
    try {
      // Supabase handles the callback internally and redirects to the frontend
      // This endpoint might not be needed with Supabase's built-in OAuth flow
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success`);
    } catch (error: any) {
      logger.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
    }
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: {
            message: 'Not authenticated',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      logger.info('Get current user:', req.user.id);
      
      res.json({
        user: req.user
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      res.status(500).json({ 
        error: {
          message: 'Failed to get current user',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: {
            message: 'Not authenticated',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { username, fullName, avatarUrl } = req.body;
      
      const updatedUser = await authService.updateUser(req.user.id, {
        username,
        fullName,
        avatarUrl
      });

      logger.info('Profile updated for user:', req.user.id);
      
      res.json({
        user: updatedUser
      });
    } catch (error: any) {
      logger.error('Profile update error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Profile update failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await authService.logout();
      
      logger.info('User logged out successfully');
      
      res.json({
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Logout failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: {
            message: 'Not authenticated',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await authService.deleteUser(req.user.id);
      
      logger.info('Account deleted for user:', req.user.id);
      
      res.json({
        message: 'Account deleted successfully'
      });
    } catch (error: any) {
      logger.error('Account deletion error:', error);
      res.status(error.statusCode || 500).json({ 
        error: {
          message: error.message || 'Account deletion failed',
          statusCode: error.statusCode || 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

// Validation rules
export const authValidation = {
  register: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('username').optional().isAlphanumeric().isLength({ min: 3, max: 20 }),
    body('fullName').optional().isLength({ min: 1, max: 100 })
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ]
};

export const authController = new AuthController();
import { Request, Response, NextFunction } from 'express';
import { authService, User } from '../services/auth-service';
import { logger } from '@/shared/logger';
import { supabase } from '@/lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: {
          message: 'No token provided',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      logger.error('Token validation failed:', error);
      res.status(401).json({ 
        error: {
          message: 'Invalid or expired token',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Get full user details
    const user = await authService.findUserById(data.user.id);
    
    if (!user) {
      res.status(401).json({ 
        error: {
          message: 'User not found',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    logger.info('Authenticated user:', user.id);
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: {
        message: 'Authentication error',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Optional middleware - allows requests to proceed without authentication
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    // Try to verify the token
    const { data, error } = await supabase.auth.getUser(token);
    
    if (!error && data.user) {
      const user = await authService.findUserById(data.user.id);
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    
    // Continue regardless of authentication status
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Continue without authentication on error
    next();
  }
};
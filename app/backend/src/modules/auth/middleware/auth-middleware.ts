import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { logger } from '@/shared/logger';

export interface AuthenticatedRequest extends Request {
  user?: any; // TODO: Define proper user type
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // TODO: Implement token validation
    logger.info('Auth middleware: validating token');
    
    // For now, just pass through - will implement when AuthService is ready
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
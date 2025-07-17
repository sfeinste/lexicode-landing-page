import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/logger';

/**
 * Middleware to capture raw body for webhook signature verification
 * This should be applied before JSON parsing middleware for webhook endpoints
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.originalUrl.includes('/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk) => {
      data += chunk;
    });
    
    req.on('end', () => {
      (req as any).rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch (error) {
        logger.error('Failed to parse webhook JSON', { error });
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * Middleware to handle webhook-specific headers and logging
 */
export const webhookHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const githubEvent = req.headers['x-github-event'];
  const githubDelivery = req.headers['x-github-delivery'];
  const githubSignature = req.headers['x-hub-signature-256'];

  if (req.originalUrl.includes('/webhook')) {
    logger.info('Webhook request received', {
      event: githubEvent,
      delivery: githubDelivery,
      hasSignature: !!githubSignature,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    });

    // Add CORS headers for webhook endpoints
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256');
  }

  next();
};
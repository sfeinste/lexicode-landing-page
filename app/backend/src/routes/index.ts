import { Express } from 'express';
import { authRoutes } from '@/modules/auth/routes';
import { repositoryRoutes } from '@/modules/repository/routes';
import { documentationRoutes } from '@/modules/documentation/routes';
import { billingRoutes } from '@/modules/billing/routes';

export const setupRoutes = (app: Express): void => {
  // API version prefix
  const apiPrefix = '/api/v1';

  // Module routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/repositories`, repositoryRoutes);
  app.use(`${apiPrefix}/documentation`, documentationRoutes);
  app.use(`${apiPrefix}/billing`, billingRoutes);

  // Catch-all route for undefined endpoints
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        message: 'Endpoint not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      }
    });
  });
};
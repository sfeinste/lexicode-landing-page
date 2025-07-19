import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { logger } from '@/shared/logger';
import { errorHandler } from '@/middleware/error-handler';
import { requestLogger } from '@/middleware/request-logger';
import { rawBodyMiddleware, webhookHeadersMiddleware } from '@/middleware/webhook-middleware';
import { setupRoutes } from '@/routes';
import { queueService } from './services/queueService';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Webhook middleware (must come before body parsing)
app.use(webhookHeadersMiddleware);
app.use(rawBodyMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// API routes
setupRoutes(app);

// Error handling middleware
app.use(errorHandler);

const PORT = config.port || 3001;

// Initialize queue service
queueService.connect()
  .then(() => {
    logger.info('✅ Queue service connected');
  })
  .catch(err => {
    logger.error('❌ Failed to connect to queue service:', err);
  });

app.listen(PORT, () => {
  logger.info(`🚀 Lexicode Backend Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await queueService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await queueService.disconnect();
  process.exit(0);
});

export default app;
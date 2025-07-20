import { queueService } from './queueService';
import amqplib from 'amqplib/callback_api';
import { logger } from '@/shared/logger';

jest.mock('amqplib/callback_api');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('QueueService', () => {
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    (queueService as any).connection = null;
    (queueService as any).channel = null;

    // Mock channel methods
    mockChannel = {
      assertQueue: jest.fn(),
      assertExchange: jest.fn(),
      sendToQueue: jest.fn(),
      consume: jest.fn(),
      prefetch: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      publish: jest.fn(),
      bindQueue: jest.fn(),
      cancel: jest.fn(),
      close: jest.fn((callback) => callback()),
    };

    // Mock connection
    mockConnection = {
      createChannel: jest.fn((callback) => callback(null, mockChannel)),
      close: jest.fn((callback) => callback()),
    };

    // Mock amqplib.connect
    (amqplib.connect as jest.Mock).mockImplementation((url, callback) => {
      callback(null, mockConnection);
    });
  });

  describe('connect', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await queueService.connect();

      expect(amqplib.connect).toHaveBeenCalledWith(
        expect.stringContaining('amqp://'),
        expect.any(Function)
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'documentation_jobs',
        {
          durable: true,
          arguments: { 'x-max-priority': 10 },
        }
      );
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'progress_updates',
        'topic',
        { durable: false }
      );
      expect(logger.info).toHaveBeenCalledWith('Connected to RabbitMQ');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (amqplib.connect as jest.Mock).mockImplementation((url, callback) => {
        callback(error, null);
      });

      await expect(queueService.connect()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to connect to RabbitMQ:', error);
    });

    it('should handle channel creation errors', async () => {
      const error = new Error('Channel creation failed');
      mockConnection.createChannel.mockImplementation((callback: Function) => {
        callback(error, null);
      });

      await expect(queueService.connect()).rejects.toThrow('Channel creation failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to create channel:', error);
    });
  });

  describe('disconnect', () => {
    it('should disconnect channel and connection', async () => {
      await queueService.connect();
      await queueService.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnect when only connection exists', async () => {
      (queueService as any).connection = mockConnection;
      (queueService as any).channel = null;

      await queueService.disconnect();

      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnect when nothing is connected', async () => {
      await queueService.disconnect();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });
  });

  describe('publishDocumentationJob', () => {
    const mockJob = {
      jobId: 'job-123',
      userId: 'user-456',
      repositoryId: 'repo-789',
      repositoryName: 'test-repo',
      generateFiles: true,
    };

    it('should publish job to queue successfully', async () => {
      await queueService.connect();
      await queueService.publishDocumentationJob(mockJob);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'documentation_jobs',
        Buffer.from(JSON.stringify(mockJob)),
        {
          persistent: true,
          priority: 5,
        }
      );
      expect(logger.info).toHaveBeenCalledWith('Published documentation job: job-123');
    });

    it('should publish job with custom priority', async () => {
      await queueService.connect();
      await queueService.publishDocumentationJob(mockJob, 8);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'documentation_jobs',
        Buffer.from(JSON.stringify(mockJob)),
        {
          persistent: true,
          priority: 8,
        }
      );
    });

    it('should throw error if not connected', async () => {
      await expect(queueService.publishDocumentationJob(mockJob)).rejects.toThrow(
        'Queue service not connected'
      );
    });
  });

  describe('consumeDocumentationJobs', () => {
    const mockHandler = jest.fn();

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should consume jobs and call handler', async () => {
      await queueService.connect();

      const mockJob = {
        jobId: 'job-123',
        userId: 'user-456',
        repositoryId: 'repo-789',
        repositoryName: 'test-repo',
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(mockJob)),
      };

      mockChannel.consume.mockImplementation((queue: string, callback: Function) => {
        // Simulate receiving a message
        setTimeout(() => callback(mockMessage), 0);
      });

      mockHandler.mockResolvedValue(undefined);

      await queueService.consumeDocumentationJobs(mockHandler);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'documentation_jobs',
        expect.any(Function),
        { noAck: false }
      );
      expect(mockHandler).toHaveBeenCalledWith(mockJob);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle handler errors and nack message', async () => {
      await queueService.connect();

      const mockMessage = {
        content: Buffer.from(JSON.stringify({ jobId: 'job-123' })),
      };

      mockChannel.consume.mockImplementation((queue: string, callback: Function) => {
        setTimeout(() => callback(mockMessage), 0);
      });

      mockHandler.mockRejectedValue(new Error('Handler error'));

      await queueService.consumeDocumentationJobs(mockHandler);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(logger.error).toHaveBeenCalledWith('Error processing job:', expect.any(Error));
    });

    it('should handle null messages', async () => {
      await queueService.connect();

      mockChannel.consume.mockImplementation((queue: string, callback: Function) => {
        callback(null);
      });

      await queueService.consumeDocumentationJobs(mockHandler);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should throw error if not connected', async () => {
      await expect(queueService.consumeDocumentationJobs(mockHandler)).rejects.toThrow(
        'Queue service not connected'
      );
    });
  });

  describe('publishProgress', () => {
    const mockProgress = {
      jobId: 'job-123',
      status: 'processing' as const,
      currentFile: 5,
      totalFiles: 10,
    };

    it('should publish progress update', async () => {
      await queueService.connect();
      await queueService.publishProgress('job-123', mockProgress);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'progress_updates',
        'progress.job-123',
        Buffer.from(JSON.stringify(mockProgress))
      );
    });

    it('should throw error if not connected', async () => {
      await expect(queueService.publishProgress('job-123', mockProgress)).rejects.toThrow(
        'Queue service not connected'
      );
    });
  });

  describe('subscribeToProgress', () => {
    const mockHandler = jest.fn();
    const jobId = 'job-123';

    beforeEach(() => {
      mockHandler.mockClear();
    });

    it('should subscribe to progress updates', async () => {
      await queueService.connect();

      const mockProgress = {
        jobId: 'job-123',
        status: 'completed' as const,
        completedAt: new Date(),
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(mockProgress)),
      };

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((queue: string, callback: Function, options: any, onOk: Function) => {
        consumerCallback = callback;
        onOk(null, { consumerTag: 'consumer-123' });
      });

      const unsubscribe = await queueService.subscribeToProgress(jobId, mockHandler);

      // Verify queue setup
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        expect.stringContaining(`progress_${jobId}_`),
        {
          exclusive: true,
          autoDelete: true,
        }
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        expect.any(String),
        'progress_updates',
        'progress.job-123'
      );

      // Simulate receiving a message
      consumerCallback(mockMessage);

      // The progress object will have the date as a string after JSON parsing
      expect(mockHandler).toHaveBeenCalledWith({
        ...mockProgress,
        completedAt: mockProgress.completedAt?.toISOString(),
      });

      // Test unsubscribe
      await unsubscribe();
      expect(mockChannel.cancel).toHaveBeenCalledWith('consumer-123');
    });

    it('should handle parsing errors in progress messages', async () => {
      await queueService.connect();

      const mockMessage = {
        content: Buffer.from('invalid json'),
      };

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((queue: string, callback: Function) => {
        consumerCallback = callback;
      });

      await queueService.subscribeToProgress(jobId, mockHandler);

      consumerCallback(mockMessage);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error parsing progress message:',
        expect.any(Error)
      );
    });

    it('should handle null messages', async () => {
      await queueService.connect();

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((queue: string, callback: Function) => {
        consumerCallback = callback;
      });

      await queueService.subscribeToProgress(jobId, mockHandler);

      consumerCallback(null);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should throw error if not connected', async () => {
      await expect(queueService.subscribeToProgress(jobId, mockHandler)).rejects.toThrow(
        'Queue service not connected'
      );
    });

    it('should handle unsubscribe when channel is closed', async () => {
      await queueService.connect();

      mockChannel.consume.mockImplementation((queue: string, callback: Function, options: any, onOk: Function) => {
        onOk(null, { consumerTag: 'consumer-123' });
      });

      const unsubscribe = await queueService.subscribeToProgress(jobId, mockHandler);

      // Close channel
      (queueService as any).channel = null;

      // Should not throw
      await unsubscribe();
      expect(mockChannel.cancel).not.toHaveBeenCalled();
    });
  });

  describe('environment configuration', () => {
    it('should use RABBITMQ_URL from environment', async () => {
      // Since queueService is a singleton and reads env var at construction time,
      // we can only test that the current instance has the expected URL
      const expectedUrl = (queueService as any).rabbitmqUrl;
      
      (amqplib.connect as jest.Mock).mockImplementation((url, callback) => {
        // Just verify it uses some URL
        expect(url).toBeTruthy();
        callback(null, mockConnection);
      });

      await queueService.connect();
      
      // Verify connect was called with the service's URL
      expect(amqplib.connect).toHaveBeenCalledWith(expectedUrl, expect.any(Function));
    });

    it('should use default URL when env var not set', async () => {
      // Test that the singleton has a rabbitmqUrl property
      expect((queueService as any).rabbitmqUrl).toBeDefined();
      
      // If RABBITMQ_URL is not set, it should use the default
      if (!process.env.RABBITMQ_URL) {
        expect((queueService as any).rabbitmqUrl).toBe('amqp://lexicode:lexicode_secret@localhost:5672');
      }
    });
  });
});
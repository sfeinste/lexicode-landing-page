import amqplib from 'amqplib/callback_api';
import { logger } from '@/shared/logger';

export interface DocumentationJob {
  jobId: string;
  userId: string;
  repositoryId: string;
  repositoryName: string;
  generateFiles?: boolean;
}

export interface FileDocumentationJob {
  fileJobId: string;
  jobId: string;
  userId: string;
  repositoryId: string;
  filePath: string;
  fileContent?: string;
  fileName: string;
  fileExtension: string;
  repositoryName: string;
}

export interface JobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentFile?: number;
  totalFiles?: number;
  error?: string;
  completedAt?: Date;
}

class QueueService {
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;
  private readonly rabbitmqUrl: string;
  private readonly documentationQueue = 'documentation_jobs';
  private readonly fileDocumentationQueue = 'file_documentation_jobs';
  private readonly progressExchange = 'progress_updates';

  constructor() {
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://lexicode:lexicode_secret@localhost:5672';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      amqplib.connect(this.rabbitmqUrl, (error, connection) => {
        if (error) {
          logger.error('Failed to connect to RabbitMQ:', error);
          return reject(error);
        }

        this.connection = connection;

        connection.createChannel((channelError, channel) => {
          if (channelError) {
            logger.error('Failed to create channel:', channelError);
            return reject(channelError);
          }

          this.channel = channel;

          // Assert queues
          channel.assertQueue(this.documentationQueue, {
            durable: true,
            arguments: {
              'x-max-priority': 10
            }
          });

          channel.assertQueue(this.fileDocumentationQueue, {
            durable: true,
            arguments: {
              'x-max-priority': 10
            }
          });

          // Assert exchange
          channel.assertExchange(this.progressExchange, 'topic', { durable: false });

          logger.info('Connected to RabbitMQ');
          resolve();
        });
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.channel) {
        this.channel.close(() => {
          if (this.connection) {
            this.connection.close(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else if (this.connection) {
        this.connection.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async publishDocumentationJob(job: DocumentationJob, priority: number = 5): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    const message = Buffer.from(JSON.stringify(job));
    
    this.channel.sendToQueue(this.documentationQueue, message, {
      persistent: true,
      priority
    });

    logger.info(`Published documentation job: ${job.jobId}`);
  }

  async consumeDocumentationJobs(
    handler: (job: DocumentationJob) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    this.channel.prefetch(1);

    this.channel.consume(
      this.documentationQueue,
      async (msg) => {
        if (!msg) return;

        try {
          const job = JSON.parse(msg.content.toString()) as DocumentationJob;
          logger.info(`Processing documentation job: ${job.jobId}`);
          
          await handler(job);
          
          if (this.channel) {
            this.channel.ack(msg);
          }
        } catch (error) {
          logger.error('Error processing job:', error);
          if (this.channel) {
            this.channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );
  }

  async publishFileDocumentationJob(job: FileDocumentationJob, priority: number = 5): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    const message = Buffer.from(JSON.stringify(job));
    
    this.channel.sendToQueue(this.fileDocumentationQueue, message, {
      persistent: true,
      priority
    });

    logger.info(`Published file documentation job: ${job.fileJobId} for file: ${job.filePath}`);
  }

  async consumeFileDocumentationJobs(
    handler: (job: FileDocumentationJob) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    this.channel.prefetch(1);

    this.channel.consume(
      this.fileDocumentationQueue,
      async (msg) => {
        if (!msg) return;

        try {
          const job = JSON.parse(msg.content.toString()) as FileDocumentationJob;
          logger.info(`Processing file documentation job: ${job.fileJobId} for file: ${job.filePath}`);
          
          await handler(job);
          
          if (this.channel) {
            this.channel.ack(msg);
          }
        } catch (error) {
          logger.error('Error processing file job:', error);
          if (this.channel) {
            this.channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );
  }

  async publishProgress(jobId: string, progress: JobProgress): Promise<void> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    const routingKey = `progress.${jobId}`;
    const message = Buffer.from(JSON.stringify(progress));

    this.channel.publish(this.progressExchange, routingKey, message);
  }

  async subscribeToProgress(
    jobId: string,
    handler: (progress: JobProgress) => void
  ): Promise<() => Promise<void>> {
    if (!this.channel) {
      throw new Error('Queue service not connected');
    }

    const queueName = `progress_${jobId}_${Date.now()}`;
    const routingKey = `progress.${jobId}`;

    this.channel.assertQueue(queueName, {
      exclusive: true,
      autoDelete: true
    });

    this.channel.bindQueue(queueName, this.progressExchange, routingKey);

    let consumerTag: string = '';
    
    this.channel.consume(
      queueName,
      (msg) => {
        if (!msg) return;
        
        try {
          const progress = JSON.parse(msg.content.toString()) as JobProgress;
          handler(progress);
        } catch (error) {
          logger.error('Error parsing progress message:', error);
        }
      },
      { noAck: true },
      (error, ok) => {
        if (!error && ok) {
          consumerTag = ok.consumerTag;
        }
      }
    );

    return async () => {
      if (this.channel && consumerTag) {
        this.channel.cancel(consumerTag);
      }
    };
  }
}

export const queueService = new QueueService();
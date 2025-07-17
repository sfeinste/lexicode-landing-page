import { Request, Response } from 'express';
import { GitHubService } from '../services/github-service';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';

export class GitHubAppController {
  private githubService: GitHubService;

  constructor() {
    this.githubService = new GitHubService();
  }

  /**
   * Initiate GitHub App installation
   */
  async initiateInstallation(req: Request, res: Response): Promise<void> {
    try {
      const installationUrl = await this.githubService.getGitHubAppInstallUrl();
      
      res.json({
        success: true,
        data: {
          installationUrl,
          message: 'Please install the GitHub App to connect your repositories',
        },
      });
    } catch (error) {
      logger.error('Failed to initiate GitHub App installation', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate GitHub App installation',
      });
    }
  }

  /**
   * Handle GitHub OAuth callback (when user authorization is enabled during installation)
   */
  async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, installation_id } = req.query;

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Authorization code is required',
        });
        return;
      }

      logger.info('GitHub OAuth callback received', {
        hasCode: !!code,
        state,
        installationId: installation_id,
      });

      // Exchange the authorization code for a user access token
      // For now, we'll just acknowledge the callback
      // In a full implementation, you'd exchange the code for tokens here

      res.json({
        success: true,
        data: {
          message: 'GitHub OAuth callback received successfully',
          code: code ? '***' : null,
          state,
          installationId: installation_id,
        },
      });
    } catch (error) {
      logger.error('Failed to handle OAuth callback', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to handle OAuth callback',
      });
    }
  }

  /**
   * Handle GitHub App installation callback
   */
  async handleInstallationCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { installation_id, setup_action } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!installation_id) {
        res.status(400).json({
          success: false,
          error: 'Installation ID is required',
        });
        return;
      }

      logger.info('GitHub App installation callback received', {
        userId,
        installationId: installation_id,
        setupAction: setup_action,
      });

      // For now, just acknowledge the callback
      // The actual installation handling will be done via webhooks
      res.json({
        success: true,
        data: {
          message: 'GitHub App installation callback received successfully',
          installationId: installation_id,
          setupAction: setup_action,
        },
      });
    } catch (error) {
      logger.error('Failed to handle installation callback', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to handle installation callback',
      });
    }
  }

  /**
   * Get user's GitHub App installations
   */
  async getUserInstallations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const installations = await this.githubService.getUserInstallations(userId);

      res.json({
        success: true,
        data: {
          installations,
          count: installations.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get user installations', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get user installations',
      });
    }
  }

  /**
   * Get user's accessible repositories from GitHub App
   */
  async getUserRepositories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { status, search, page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      const filters = {
        status: status as string,
        search: search as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const repositories = await this.githubService.getUserRepositoriesFromApp(userId, filters);

      res.json({
        success: true,
        data: {
          repositories,
          count: repositories.length,
          page: filters.page,
          limit: filters.limit,
        },
      });
    } catch (error) {
      logger.error('Failed to get user repositories', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get user repositories',
      });
    }
  }

  /**
   * Get repositories for a specific installation
   */
  async getInstallationRepositories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { installationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!installationId) {
        res.status(400).json({
          success: false,
          error: 'Installation ID is required',
        });
        return;
      }

      const repositories = await this.githubService.getInstallationRepositories(
        parseInt(installationId, 10)
      );

      res.json({
        success: true,
        data: {
          repositories,
          count: repositories.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get installation repositories', { 
        installationId: req.params.installationId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get installation repositories',
      });
    }
  }

  /**
   * Grant access to specific repositories
   */
  async grantRepositoryAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { repositories } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      if (!repositories || !Array.isArray(repositories)) {
        res.status(400).json({
          success: false,
          error: 'Repositories array is required',
        });
        return;
      }

      logger.info('Granting repository access', {
        userId,
        repositoryCount: repositories.length,
      });

      // For each repository, find the appropriate installation and grant access
      const results = [];
      
      for (const repoRequest of repositories) {
        try {
          const { githubRepoId } = repoRequest;
          
          // Get all user installations to find which one contains this repo
          const installations = await this.githubService.getUserInstallations(userId);
          
          for (const installation of installations) {
            try {
              // Get repositories for this installation
              const installationRepos = await this.githubService.getInstallationRepositories(
                installation.github_installation_id
              );
              
              // Check if this repo belongs to this installation
              const repo = installationRepos.find(r => r.id === githubRepoId);
              
              if (repo) {
                // Store repository access
                const { data, error } = await supabaseAdmin
                  .from('repository_access')
                  .upsert({
                    user_id: userId,
                    github_installation_id: installation.id,
                    github_repo_id: repo.id,
                    repo_full_name: repo.full_name,
                    repo_name: repo.name,
                    repo_owner: repo.full_name.split('/')[0],
                    is_private: repo.private,
                    default_branch: repo.default_branch,
                    language: repo.language,
                    access_granted_at: new Date().toISOString(),
                    access_status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }, {
                    onConflict: 'user_id,github_repo_id'
                  });

                if (error) {
                  throw error;
                }

                results.push({
                  githubRepoId,
                  status: 'granted',
                  repoName: repo.full_name,
                });
                break; // Found the repo, no need to check other installations
              }
            } catch (error) {
              logger.error('Error checking installation repositories', {
                installationId: installation.github_installation_id,
                error,
              });
            }
          }
        } catch (error) {
          logger.error('Failed to grant access to repository', {
            githubRepoId: repoRequest.githubRepoId,
            error,
          });
          results.push({
            githubRepoId: repoRequest.githubRepoId,
            status: 'error',
            error: 'Failed to grant access',
          });
        }
      }

      res.json({
        success: true,
        data: {
          message: 'Repository access processed',
          results,
        },
      });

    } catch (error) {
      logger.error('Failed to grant repository access', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to grant repository access',
      });
    }
  }

  /**
   * Revoke access to a specific repository
   */
  async revokeRepositoryAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { repositoryId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
        });
        return;
      }

      logger.info('Revoking repository access', {
        userId,
        repositoryId,
      });

      // Update repository access status to revoked
      const { error } = await supabaseAdmin
        .from('repository_access')
        .update({
          access_status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', repositoryId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Log the revocation
      await supabaseAdmin
        .from('repository_access_audit')
        .insert({
          repository_access_id: repositoryId,
          user_id: userId,
          action: 'revoked',
          details: { reason: 'user_request' },
          created_at: new Date().toISOString(),
        });

      res.json({
        success: true,
        data: {
          message: 'Repository access revoked successfully',
        },
      });

    } catch (error) {
      logger.error('Failed to revoke repository access', { repositoryId: req.params.repositoryId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke repository access',
      });
    }
  }

  /**
   * Handle GitHub App webhooks
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;
      const delivery = req.headers['x-github-delivery'] as string;
      const payload = req.body;

      logger.info('GitHub webhook received', {
        event,
        delivery,
        action: payload.action,
      });

      // Verify webhook signature
      const githubAppService = this.githubService['githubAppService'];
      const isValidSignature = githubAppService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );

      if (!isValidSignature) {
        logger.warn('Invalid webhook signature', { delivery, event });
        res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
        });
        return;
      }

      // Handle different webhook events
      await this.processWebhookEvent(event, payload);

      res.json({
        success: true,
        data: {
          message: 'Webhook processed successfully',
          event,
          delivery,
        },
      });
    } catch (error) {
      logger.error('Failed to handle webhook', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to handle webhook',
      });
    }
  }

  /**
   * Process specific webhook events
   */
  private async processWebhookEvent(event: string, payload: any): Promise<void> {
    try {
      switch (event) {
        case 'installation':
          await this.handleInstallationEvent(payload);
          break;
        case 'installation_repositories':
          await this.handleInstallationRepositoriesEvent(payload);
          break;
        case 'push':
          await this.handlePushEvent(payload);
          break;
        case 'pull_request':
          await this.handlePullRequestEvent(payload);
          break;
        default:
          logger.info('Unhandled webhook event', { event, action: payload.action });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', { event, error });
      throw error;
    }
  }

  /**
   * Handle installation webhook events
   */
  private async handleInstallationEvent(payload: any): Promise<void> {
    const { action, installation, repositories, sender } = payload;

    logger.info('Processing installation event', {
      action,
      installationId: installation?.id,
      account: installation?.account?.login,
      repositoriesCount: repositories?.length || 0,
    });

    // For installation events, we need to map to a user
    // The problem: webhooks don't contain your app's user ID
    // Solution: We'll store the installation temporarily and associate it when the user returns
    
    if (action === 'created' && installation) {
      try {
        // Store the installation with a temporary marker
        // We'll update this when the user returns from OAuth callback
        const installationData = {
          github_installation_id: installation.id,
          github_account_id: installation.account.id,
          github_account_login: installation.account.login,
          permissions: installation.permissions || {},
          // Use a special marker user_id that we'll update later
          user_id: '00000000-0000-0000-0000-000000000000', // Temporary placeholder
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        logger.info('Storing temporary installation', {
          installationId: installation.id,
          account: installation.account.login,
        });

        // Store in database temporarily
        // This will be updated when user completes OAuth flow
      } catch (error) {
        logger.error('Failed to store installation', { error });
      }
    }
  }

  /**
   * Handle installation repositories webhook events
   */
  private async handleInstallationRepositoriesEvent(payload: any): Promise<void> {
    const { action, installation, repositories_added, repositories_removed } = payload;

    logger.info('Processing installation repositories event', {
      action,
      installationId: installation?.id,
      addedCount: repositories_added?.length || 0,
      removedCount: repositories_removed?.length || 0,
    });

    // Handle repository additions/removals
    // This would update the repository_access table
  }

  /**
   * Handle push webhook events
   */
  private async handlePushEvent(payload: any): Promise<void> {
    const { repository, installation, pusher, commits } = payload;

    logger.info('Processing push event', {
      repository: repository?.full_name,
      installationId: installation?.id,
      pusher: pusher?.name,
      commitsCount: commits?.length || 0,
    });

    // Trigger documentation update for the repository
    // This would queue a documentation generation job
  }

  /**
   * Handle pull request webhook events
   */
  private async handlePullRequestEvent(payload: any): Promise<void> {
    const { action, pull_request, repository, installation } = payload;

    logger.info('Processing pull request event', {
      action,
      repository: repository?.full_name,
      installationId: installation?.id,
      prNumber: pull_request?.number,
    });

    // Handle PR events for documentation updates
    // This could trigger documentation previews or updates
  }
}
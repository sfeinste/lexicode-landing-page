import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '@/config';
import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';
import { GitHubAppService } from '../services/github-app-service';

export class GitHubOAuthController {
  private githubAppService: GitHubAppService;

  constructor() {
    this.githubAppService = new GitHubAppService();
  }

  /**
   * Exchange GitHub OAuth code for access token and store installation
   */
  async exchangeCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, installation_id, state } = req.body;
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Authorization required',
        });
        return;
      }

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Authorization code is required',
        });
        return;
      }

      // Get the user from the auth token
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
        });
        return;
      }

      logger.info('Processing GitHub OAuth code exchange', {
        userId: user.id,
        installationId: installation_id,
        hasCode: !!code,
      });

      // Exchange code for access token
      try {
        // For GitHub Apps, we need to get the client ID and secret from the app
        // You'll need to add these to your environment variables
        const clientId = process.env.GITHUB_APP_CLIENT_ID || '';
        const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET || '';

        if (!clientId || !clientSecret) {
          logger.error('GitHub App OAuth credentials not configured');
          res.status(500).json({
            success: false,
            error: 'GitHub App OAuth not properly configured',
          });
          return;
        }

        const tokenResponse = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
          },
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        const { access_token, error, error_description } = tokenResponse.data;

        if (error) {
          logger.error('GitHub OAuth error', { error, error_description });
          res.status(400).json({
            success: false,
            error: error_description || error,
          });
          return;
        }

        // Get user's GitHub profile
        const userResponse = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `token ${access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        const githubUser = userResponse.data;

        // If we have an installation_id, associate it with this user
        if (installation_id) {
          logger.info('Associating installation with user', {
            userId: user.id,
            installationId: installation_id,
            githubUserId: githubUser.id,
          });

          // Get the installation details
          const installation = await this.githubAppService.getInstallation(parseInt(installation_id));

          // Store the installation associated with this user
          await this.githubAppService.handleInstallationCallback(user.id, {
            installation,
            repositories: installation.repositories,
          });
        }

        res.json({
          success: true,
          data: {
            message: 'GitHub authorization successful',
            githubUser: {
              id: githubUser.id,
              login: githubUser.login,
              name: githubUser.name,
              avatar_url: githubUser.avatar_url,
            },
            hasInstallation: !!installation_id,
          },
        });

      } catch (error) {
        logger.error('Failed to exchange OAuth code', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to complete GitHub authorization',
        });
      }
    } catch (error) {
      logger.error('OAuth code exchange error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
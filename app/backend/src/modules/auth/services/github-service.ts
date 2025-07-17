import axios from 'axios';
import { logger } from '@/shared/logger';
import { config } from '@/config';
import { GitHubAppService } from './github-app-service';

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  fork: boolean;
  default_branch: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  updated_at: string;
  pushed_at: string;
}

export class GitHubService {
  private githubAppService: GitHubAppService;

  constructor() {
    this.githubAppService = new GitHubAppService();
  }

  // Legacy OAuth methods (keeping for backward compatibility)
  async getAuthUrl(state: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to exchange code for token', { error });
      throw new Error('Failed to exchange code for token');
    }
  }

  async getUserProfile(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Lexicode-App/1.0',
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get user profile', { error });
      throw new Error('Failed to get user profile');
    }
  }

  // GitHub App methods (new implementation)
  async getGitHubAppInstallUrl(): Promise<string> {
    if (!config.githubApp.appId) {
      throw new Error('GitHub App not configured');
    }

    // GitHub Apps MUST use the app slug/name, not the numeric ID
    // The format is: https://github.com/apps/APP-NAME/installations/new
    if (!config.githubApp.appSlug) {
      throw new Error('GitHub App slug is required for installation URL. Please set GITHUB_APP_SLUG in your environment variables.');
    }

    return `https://github.com/apps/${config.githubApp.appSlug}/installations/new`;
  }

  async getUserRepositories(accessToken: string): Promise<GitHubRepository[]> {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Lexicode-App/1.0',
        },
        params: {
          visibility: 'all',
          sort: 'updated',
          per_page: 100,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get user repositories', { error });
      throw new Error('Failed to get user repositories');
    }
  }

  async getRepositoryContent(installationId: number, owner: string, repo: string, path: string = ''): Promise<any> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get repository content', { owner, repo, path, error });
      throw new Error('Failed to get repository content');
    }
  }

  async getRepositoryStructure(installationId: number, owner: string, repo: string): Promise<any> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get repository structure', { owner, repo, error });
      throw new Error('Failed to get repository structure');
    }
  }

  async createWebhook(installationId: number, owner: string, repo: string, webhookUrl: string): Promise<any> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      const response = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: config.githubApp.webhookSecret,
          },
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to create webhook', { owner, repo, error });
      throw new Error('Failed to create webhook');
    }
  }

  async deleteWebhook(installationId: number, owner: string, repo: string, webhookId: number): Promise<void> {
    try {
      const { token } = await this.githubAppService.generateInstallationToken(installationId);
      
      await axios.delete(
        `https://api.github.com/repos/${owner}/${repo}/hooks/${webhookId}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      logger.info('Webhook deleted successfully', { owner, repo, webhookId });
    } catch (error) {
      logger.error('Failed to delete webhook', { owner, repo, webhookId, error });
      throw new Error('Failed to delete webhook');
    }
  }

  // GitHub App delegation methods
  async getUserInstallations(userId: string): Promise<any[]> {
    return this.githubAppService.getUserInstallations(userId);
  }

  async getUserRepositoriesFromApp(userId: string, filters?: any): Promise<any[]> {
    return this.githubAppService.getUserRepositories(userId, filters);
  }

  async handleInstallationCallback(userId: string, payload: any): Promise<void> {
    return this.githubAppService.handleInstallationCallback(userId, payload);
  }

  async getInstallationRepositories(installationId: number): Promise<GitHubRepository[]> {
    return this.githubAppService.getInstallationRepositories(installationId);
  }
}
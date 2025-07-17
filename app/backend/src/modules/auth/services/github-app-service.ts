import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/shared/logger';
import { supabaseAdmin } from '@/lib/supabase';

export interface GitHubAppInstallation {
  id: number;
  account: {
    id: number;
    login: string;
    type: string;
  };
  permissions: Record<string, string>;
  events: string[];
  repository_selection: 'all' | 'selected';
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
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

export interface InstallationToken {
  token: string;
  expires_at: string;
  permissions: Record<string, string>;
}

export class GitHubAppService {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.appId = config.githubApp.appId;
    this.privateKey = config.githubApp.privateKey;
    this.webhookSecret = config.githubApp.webhookSecret;

    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App configuration is missing. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY');
    }
  }

  /**
   * Generate JWT for GitHub App authentication
   */
  async generateAppJWT(): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now - 60, // Issued 60 seconds in the past to account for clock drift
        exp: now + 600, // Expires in 10 minutes
        iss: this.appId, // GitHub App ID
      };

      // Ensure private key is properly formatted
      const privateKeyFormatted = this.privateKey.replace(/\\n/g, '\n');
      
      return jwt.sign(payload, privateKeyFormatted, { algorithm: 'RS256' });
    } catch (error) {
      logger.error('Failed to generate GitHub App JWT', { error });
      throw new Error('Failed to generate GitHub App JWT');
    }
  }

  /**
   * Generate installation access token
   */
  async generateInstallationToken(installationId: number): Promise<InstallationToken> {
    try {
      const appJWT = await this.generateAppJWT();
      
      const response = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      logger.info('Generated installation token', { 
        installationId, 
        expiresAt: response.data.expires_at 
      });

      return {
        token: response.data.token,
        expires_at: response.data.expires_at,
        permissions: response.data.permissions || {},
      };
    } catch (error) {
      logger.error('Failed to generate installation token', { installationId, error });
      throw new Error(`Failed to generate installation token: ${error}`);
    }
  }

  /**
   * Get GitHub App installation details
   */
  async getInstallation(installationId: number): Promise<GitHubAppInstallation> {
    try {
      const appJWT = await this.generateAppJWT();
      
      const response = await axios.get(
        `https://api.github.com/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get installation', { installationId, error });
      throw new Error(`Failed to get installation: ${error}`);
    }
  }

  /**
   * Get repositories for an installation
   */
  async getInstallationRepositories(installationId: number): Promise<GitHubRepository[]> {
    try {
      const { token } = await this.generateInstallationToken(installationId);
      
      const response = await axios.get(
        'https://api.github.com/installation/repositories',
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      return response.data.repositories || [];
    } catch (error) {
      logger.error('Failed to get installation repositories', { installationId, error });
      throw new Error(`Failed to get installation repositories: ${error}`);
    }
  }

  /**
   * Handle GitHub App installation callback
   */
  async handleInstallationCallback(userId: string, payload: any): Promise<void> {
    try {
      const { installation, repositories } = payload;
      
      if (!installation) {
        throw new Error('Invalid installation payload');
      }

      logger.info('Processing installation callback', { 
        userId, 
        installationId: installation.id,
        accountLogin: installation.account?.login 
      });

      // Store installation in database
      await this.storeInstallation(userId, installation);

      // If repositories are provided, store repository access
      if (repositories && Array.isArray(repositories)) {
        await this.storeRepositoryAccess(userId, installation.id, repositories);
      }

      logger.info('Installation callback processed successfully', { 
        userId, 
        installationId: installation.id 
      });
    } catch (error) {
      logger.error('Failed to handle installation callback', { userId, error });
      throw error;
    }
  }

  /**
   * Store GitHub installation in database
   */
  private async storeInstallation(userId: string, installation: any): Promise<void> {
    try {
      const installationData = {
        user_id: userId,
        github_installation_id: installation.id,
        github_account_id: installation.account.id,
        github_account_login: installation.account.login,
        permissions: installation.permissions || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('github_installations')
        .upsert(installationData, { 
          onConflict: 'user_id,github_installation_id' 
        });

      if (error) {
        throw error;
      }

      logger.info('Stored GitHub installation', { 
        userId, 
        installationId: installation.id 
      });
    } catch (error) {
      logger.error('Failed to store installation', { userId, installationId: installation.id, error });
      throw error;
    }
  }

  /**
   * Store repository access in database
   */
  private async storeRepositoryAccess(userId: string, installationId: number, repositories: any[]): Promise<void> {
    try {
      // Get the installation record
      const { data: installation, error: installationError } = await supabaseAdmin
        .from('github_installations')
        .select('id')
        .eq('user_id', userId)
        .eq('github_installation_id', installationId)
        .single();

      if (installationError || !installation) {
        throw new Error('Installation not found');
      }

      // Prepare repository access data
      const repositoryAccessData = repositories.map(repo => ({
        user_id: userId,
        github_installation_id: installation.id,
        github_repo_id: repo.id,
        repo_full_name: repo.full_name,
        repo_name: repo.name,
        repo_owner: repo.full_name.split('/')[0],
        is_private: repo.private,
        default_branch: repo.default_branch || 'main',
        language: repo.language,
        access_granted_at: new Date().toISOString(),
        access_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin
        .from('repository_access')
        .upsert(repositoryAccessData, { 
          onConflict: 'user_id,github_repo_id' 
        });

      if (error) {
        throw error;
      }

      logger.info('Stored repository access', { 
        userId, 
        installationId, 
        repositoryCount: repositories.length 
      });
    } catch (error) {
      logger.error('Failed to store repository access', { userId, installationId, error });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Failed to verify webhook signature', { error });
      return false;
    }
  }

  /**
   * Encrypt token for database storage
   */
  encryptToken(token: string): string {
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT secret not configured');
      }

      const cipher = crypto.createCipher('aes-256-cbc', config.jwt.secret);
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt token', { error });
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt token from database storage
   */
  decryptToken(encryptedToken: string): string {
    try {
      if (!config.jwt.secret) {
        throw new Error('JWT secret not configured');
      }

      const decipher = crypto.createDecipher('aes-256-cbc', config.jwt.secret);
      let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt token', { error });
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Get user's GitHub installations
   */
  async getUserInstallations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('github_installations')
        .select(`
          id,
          github_installation_id,
          github_account_id,
          github_account_login,
          permissions,
          created_at,
          updated_at
        `)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user installations', { userId, error });
      throw error;
    }
  }

  /**
   * Get user's accessible repositories
   */
  async getUserRepositories(userId: string, filters: any = {}): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('repository_access')
        .select(`
          id,
          github_repo_id,
          repo_full_name,
          repo_name,
          repo_owner,
          is_private,
          default_branch,
          language,
          access_granted_at,
          last_accessed_at,
          access_status,
          created_at,
          updated_at
        `)
        .eq('user_id', userId);

      if (filters.status) {
        query = query.eq('access_status', filters.status);
      }

      if (filters.search) {
        query = query.ilike('repo_full_name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get user repositories', { userId, error });
      throw error;
    }
  }
}
import { api } from './api';

export interface GitHubInstallation {
  id: string;
  github_installation_id: number;
  github_account_id: number;
  github_account_login: string;
  permissions: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: string;
  github_repo_id: number;
  repo_full_name: string;
  repo_name: string;
  repo_owner: string;
  is_private: boolean;
  default_branch: string;
  language?: string;
  access_granted_at: string;
  last_accessed_at?: string;
  access_status: 'active' | 'suspended' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface GitHubInstallationResponse {
  success: boolean;
  data: {
    installationUrl: string;
    message: string;
  };
}

export interface GitHubInstallationsResponse {
  success: boolean;
  data: {
    installations: GitHubInstallation[];
    count: number;
  };
}

export interface GitHubRepositoriesResponse {
  success: boolean;
  data: {
    repositories: GitHubRepository[];
    count: number;
    page: number;
    limit: number;
  };
}

export class GitHubService {
  /**
   * Get GitHub App installation URL
   */
  async getInstallationUrl(): Promise<string> {
    try {
      const response = await api.get<GitHubInstallationResponse>('/api/v1/auth/github-app/install');
      return response.data.data.installationUrl;
    } catch (error) {
      console.error('Failed to get GitHub installation URL:', error);
      throw new Error('Failed to initiate GitHub App installation');
    }
  }

  /**
   * Get user's GitHub installations
   */
  async getInstallations(): Promise<GitHubInstallation[]> {
    try {
      const response = await api.get<GitHubInstallationsResponse>('/api/v1/auth/github-app/installations');
      return response.data.data.installations;
    } catch (error) {
      console.error('Failed to get GitHub installations:', error);
      throw new Error('Failed to get GitHub installations');
    }
  }

  /**
   * Get user's accessible repositories
   */
  async getRepositories(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<GitHubRepository[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await api.get<GitHubRepositoriesResponse>(
        `/api/v1/auth/github-app/repositories?${params.toString()}`
      );
      return response.data.data.repositories;
    } catch (error) {
      console.error('Failed to get GitHub repositories:', error);
      throw new Error('Failed to get GitHub repositories');
    }
  }

  /**
   * Get repositories for a specific installation
   */
  async getInstallationRepositories(installationId: string): Promise<GitHubRepository[]> {
    try {
      const response = await api.get<GitHubRepositoriesResponse>(
        `/api/v1/auth/github-app/installations/${installationId}/repositories`
      );
      return response.data.data.repositories;
    } catch (error) {
      console.error('Failed to get installation repositories:', error);
      throw new Error('Failed to get installation repositories');
    }
  }

  /**
   * Check if user has any GitHub installations
   */
  async hasInstallations(): Promise<boolean> {
    try {
      const installations = await this.getInstallations();
      return installations.length > 0;
    } catch (error) {
      // If there's an error, assume no installations
      return false;
    }
  }

  /**
   * Get repository count
   */
  async getRepositoryCount(): Promise<number> {
    try {
      // In a real implementation, you'd want the API to return total count separately
      const repositories = await this.getRepositories();
      return repositories.length;
    } catch (error) {
      return 0;
    }
  }
}

export const githubService = new GitHubService();
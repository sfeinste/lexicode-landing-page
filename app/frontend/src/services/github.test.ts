import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubService } from './github';
import { api } from './api';

// Mock the api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn()
  }
}));

const mockedApi = api as any;

describe('GitHubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstallationUrl', () => {
    it('should return installation URL on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          installationUrl: 'https://github.com/apps/test-app/installations/new',
          message: 'Installation URL generated'
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.getInstallationUrl();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/auth/github-app/install');
      expect(result).toBe(mockResponse.data.installationUrl);
    });

    it('should throw error on failure', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      await expect(githubService.getInstallationUrl())
        .rejects.toThrow('Failed to initiate GitHub App installation');
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get GitHub installation URL:',
        expect.any(Error)
      );
    });
  });

  describe('getInstallations', () => {
    it('should return installations array on success', async () => {
      const mockInstallations = [
        {
          id: '1',
          github_installation_id: 12345,
          github_account_id: 67890,
          github_account_login: 'test-user',
          permissions: { contents: 'read', metadata: 'read' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];
      const mockResponse = {
        success: true,
        data: {
          installations: mockInstallations,
          count: 1
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.getInstallations();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/auth/github-app/installations');
      expect(result).toEqual(mockInstallations);
    });

    it('should throw error on failure', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      await expect(githubService.getInstallations())
        .rejects.toThrow('Failed to get GitHub installations');
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get GitHub installations:',
        expect.any(Error)
      );
    });
  });

  describe('getRepositories', () => {
    const mockRepositories = [
      {
        id: '1',
        github_repo_id: 123,
        repo_full_name: 'user/repo1',
        repo_name: 'repo1',
        repo_owner: 'user',
        is_private: false,
        default_branch: 'main',
        language: 'TypeScript',
        access_granted_at: '2024-01-01T00:00:00Z',
        access_status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should return repositories without filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          repositories: mockRepositories,
          count: 1,
          page: 1,
          limit: 10
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.getRepositories();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/auth/github-app/repositories?');
      expect(result).toEqual(mockRepositories);
    });

    it('should return repositories with filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          repositories: mockRepositories,
          count: 1,
          page: 2,
          limit: 20
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const filters = {
        status: 'active',
        search: 'test',
        page: 2,
        limit: 20
      };

      const result = await githubService.getRepositories(filters);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/auth/github-app/repositories?status=active&search=test&page=2&limit=20'
      );
      expect(result).toEqual(mockRepositories);
    });

    it('should handle partial filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          repositories: mockRepositories,
          count: 1,
          page: 1,
          limit: 10
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const filters = {
        search: 'test'
      };

      await githubService.getRepositories(filters);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/auth/github-app/repositories?search=test'
      );
    });

    it('should throw error on failure', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      await expect(githubService.getRepositories())
        .rejects.toThrow('Failed to get GitHub repositories');
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get GitHub repositories:',
        expect.any(Error)
      );
    });
  });

  describe('getInstallationRepositories', () => {
    const mockRepositories = [
      {
        id: '1',
        github_repo_id: 123,
        repo_full_name: 'user/repo1',
        repo_name: 'repo1',
        repo_owner: 'user',
        is_private: false,
        default_branch: 'main',
        access_granted_at: '2024-01-01T00:00:00Z',
        access_status: 'active' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should return repositories for specific installation', async () => {
      const mockResponse = {
        success: true,
        data: {
          repositories: mockRepositories,
          count: 1,
          page: 1,
          limit: 10
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.getInstallationRepositories('install-123');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/auth/github-app/installations/install-123/repositories'
      );
      expect(result).toEqual(mockRepositories);
    });

    it('should throw error on failure', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      await expect(githubService.getInstallationRepositories('install-123'))
        .rejects.toThrow('Failed to get installation repositories');
      
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get installation repositories:',
        expect.any(Error)
      );
    });
  });

  describe('hasInstallations', () => {
    it('should return true when installations exist', async () => {
      const mockInstallations = [
        {
          id: '1',
          github_installation_id: 12345,
          github_account_id: 67890,
          github_account_login: 'test-user',
          permissions: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];
      const mockResponse = {
        success: true,
        data: {
          installations: mockInstallations,
          count: 1
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.hasInstallations();

      expect(result).toBe(true);
    });

    it('should return false when no installations exist', async () => {
      const mockResponse = {
        success: true,
        data: {
          installations: [],
          count: 0
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.hasInstallations();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      const result = await githubService.hasInstallations();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getRepositoryCount', () => {
    it('should return repository count', async () => {
      const mockRepositories = [
        { id: '1', repo_name: 'repo1' },
        { id: '2', repo_name: 'repo2' },
        { id: '3', repo_name: 'repo3' }
      ];
      const mockResponse = {
        success: true,
        data: {
          repositories: mockRepositories,
          count: 3,
          page: 1,
          limit: 10
        }
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await githubService.getRepositoryCount();

      expect(result).toBe(3);
    });

    it('should return 0 on error', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));

      const result = await githubService.getRepositoryCount();

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
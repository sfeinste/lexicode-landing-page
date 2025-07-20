import axios from 'axios';
import { GitHubService } from './github-service';
import { GitHubAppService } from './github-app-service';
import { logger } from '@/shared/logger';
import { config } from '@/config';

jest.mock('axios');
jest.mock('./github-app-service');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('@/config', () => ({
  config: {
    github: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/auth/github/callback',
    },
    githubApp: {
      appId: 'test-app-id',
      appSlug: 'test-app-slug',
      webhookSecret: 'test-webhook-secret',
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceKey: 'test-service-key',
    },
  },
}));

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockGitHubAppService: jest.Mocked<GitHubAppService>;

  const mockGitHubUser = {
    id: 123456,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/testuser.png',
    bio: 'Test bio',
    location: 'Test Location',
    company: 'Test Company',
    blog: 'https://testblog.com',
    public_repos: 10,
    followers: 100,
    following: 50,
  };

  const mockRepository = {
    id: 789012,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    description: 'Test repository',
    private: false,
    fork: false,
    default_branch: 'main',
    language: 'TypeScript',
    stargazers_count: 42,
    forks_count: 5,
    size: 1024,
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = axios as jest.Mocked<typeof axios>;
    
    // Create a mock instance of GitHubAppService
    mockGitHubAppService = {
      generateInstallationToken: jest.fn(),
      getInstallationRepositories: jest.fn(),
      getUserInstallations: jest.fn(),
      getUserRepositories: jest.fn(),
      handleInstallationCallback: jest.fn(),
    } as any;

    (GitHubAppService as jest.MockedClass<typeof GitHubAppService>).mockImplementation(() => mockGitHubAppService);
    
    githubService = new GitHubService();
  });

  describe('getAuthUrl', () => {
    it('should generate correct OAuth URL', async () => {
      const state = 'random-state-123';
      const result = await githubService.getAuthUrl(state);

      const expectedUrl = new URL('https://github.com/login/oauth/authorize');
      expectedUrl.searchParams.append('client_id', 'test-client-id');
      expectedUrl.searchParams.append('redirect_uri', 'http://localhost:3000/auth/github/callback');
      expectedUrl.searchParams.append('scope', 'read:user user:email');
      expectedUrl.searchParams.append('state', state);

      expect(result).toBe(expectedUrl.toString());
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for access token', async () => {
      const mockResponse = {
        data: { access_token: 'github-access-token-123' },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await githubService.exchangeCodeForToken('auth-code-123');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'auth-code-123',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      expect(result).toBe('github-access-token-123');
    });

    it('should throw error on failure', async () => {
      const axiosError = new Error('Network error');
      mockAxios.post.mockRejectedValue(axiosError);

      await expect(githubService.exchangeCodeForToken('auth-code-123'))
        .rejects.toThrow('Failed to exchange code for token');

      expect(logger.error).toHaveBeenCalledWith('Failed to exchange code for token', { error: axiosError });
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      mockAxios.get.mockResolvedValue({ data: mockGitHubUser });

      const result = await githubService.getUserProfile('github-access-token-123');

      expect(mockAxios.get).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          Authorization: 'token github-access-token-123',
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Lexicode-App/1.0',
        },
      });

      expect(result).toEqual(mockGitHubUser);
    });

    it('should handle API errors', async () => {
      const apiError = new Error('Unauthorized');
      mockAxios.get.mockRejectedValue(apiError);

      await expect(githubService.getUserProfile('invalid-token'))
        .rejects.toThrow('Failed to get user profile');

      expect(logger.error).toHaveBeenCalledWith('Failed to get user profile', { error: apiError });
    });
  });

  describe('getGitHubAppInstallUrl', () => {
    it('should generate installation URL', async () => {
      const result = await githubService.getGitHubAppInstallUrl();
      expect(result).toBe('https://github.com/apps/test-app-slug/installations/new');
    });

    it('should throw error when app not configured', async () => {
      (config as any).githubApp.appId = null;

      await expect(githubService.getGitHubAppInstallUrl())
        .rejects.toThrow('GitHub App not configured');
    });

    it('should throw error when app slug not configured', async () => {
      (config as any).githubApp.appId = 'test-app-id';
      (config as any).githubApp.appSlug = null;

      await expect(githubService.getGitHubAppInstallUrl())
        .rejects.toThrow('GitHub App slug is required for installation URL');
    });
  });

  describe('getUserRepositories', () => {
    it('should fetch user repositories', async () => {
      const mockRepos = [mockRepository];
      mockAxios.get.mockResolvedValue({ data: mockRepos });

      const result = await githubService.getUserRepositories('github-token');

      expect(mockAxios.get).toHaveBeenCalledWith('https://api.github.com/user/repos', {
        headers: {
          Authorization: 'token github-token',
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Lexicode-App/1.0',
        },
        params: {
          visibility: 'all',
          sort: 'updated',
          per_page: 100,
        },
      });

      expect(result).toEqual(mockRepos);
    });

    it('should handle API errors', async () => {
      const apiError = new Error('Rate limit exceeded');
      mockAxios.get.mockRejectedValue(apiError);

      await expect(githubService.getUserRepositories('github-token'))
        .rejects.toThrow('Failed to get user repositories');

      expect(logger.error).toHaveBeenCalledWith('Failed to get user repositories', { error: apiError });
    });
  });

  describe('getRepositoryContent', () => {
    it('should fetch repository content', async () => {
      const mockContent = { type: 'file', content: 'base64content' };
      const mockToken = { token: 'installation-token-123' };
      
      mockGitHubAppService.generateInstallationToken.mockResolvedValue(mockToken as any);
      mockAxios.get.mockResolvedValue({ data: mockContent });

      const result = await githubService.getRepositoryContent(12345, 'testuser', 'test-repo', 'README.md');

      expect(mockGitHubAppService.generateInstallationToken).toHaveBeenCalledWith(12345);
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/testuser/test-repo/contents/README.md',
        {
          headers: {
            Authorization: 'token installation-token-123',
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      expect(result).toEqual(mockContent);
    });
  });

  describe('createWebhook', () => {
    it('should create webhook successfully', async () => {
      const mockWebhook = { id: 123, active: true };
      const mockToken = { token: 'installation-token-123' };
      
      mockGitHubAppService.generateInstallationToken.mockResolvedValue(mockToken as any);
      mockAxios.post.mockResolvedValue({ data: mockWebhook });

      const result = await githubService.createWebhook(12345, 'testuser', 'test-repo', 'https://example.com/webhook');

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.github.com/repos/testuser/test-repo/hooks',
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            url: 'https://example.com/webhook',
            content_type: 'json',
            secret: 'test-webhook-secret',
          },
        },
        {
          headers: {
            Authorization: 'token installation-token-123',
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lexicode-App/1.0',
          },
        }
      );

      expect(result).toEqual(mockWebhook);
    });
  });

  describe('delegation methods', () => {
    it('should delegate getUserInstallations to GitHubAppService', async () => {
      const mockInstallations = [{ id: 12345 }];
      mockGitHubAppService.getUserInstallations.mockResolvedValue(mockInstallations);

      const result = await githubService.getUserInstallations('user-123');

      expect(mockGitHubAppService.getUserInstallations).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockInstallations);
    });

    it('should delegate getUserRepositoriesFromApp to GitHubAppService', async () => {
      const mockRepos = [mockRepository];
      mockGitHubAppService.getUserRepositories.mockResolvedValue(mockRepos);

      const result = await githubService.getUserRepositoriesFromApp('user-123', { type: 'owner' });

      expect(mockGitHubAppService.getUserRepositories).toHaveBeenCalledWith('user-123', { type: 'owner' });
      expect(result).toEqual(mockRepos);
    });

    it('should delegate handleInstallationCallback to GitHubAppService', async () => {
      const mockPayload = { installation_id: 12345 };
      
      await githubService.handleInstallationCallback('user-123', mockPayload);

      expect(mockGitHubAppService.handleInstallationCallback).toHaveBeenCalledWith('user-123', mockPayload);
    });

    it('should delegate getInstallationRepositories to GitHubAppService', async () => {
      const mockRepos = [mockRepository];
      mockGitHubAppService.getInstallationRepositories.mockResolvedValue(mockRepos as any);

      const result = await githubService.getInstallationRepositories(12345);

      expect(mockGitHubAppService.getInstallationRepositories).toHaveBeenCalledWith(12345);
      expect(result).toEqual(mockRepos);
    });
  });
});
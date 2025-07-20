import { AuthService } from './auth-service';
import { logger } from '@/shared/logger';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { createError } from '@/middleware/error-handler';

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
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      refreshSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  },
}));

jest.mock('@/middleware/error-handler', () => ({
  createError: jest.fn((message: string, statusCode: number = 500) => {
    const error: any = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  }),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockSupabaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      github_profile: { login: 'testuser' },
      subscription_tier: 'premium',
    },
    email_confirmed_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  const mockSession = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      username: 'testuser',
      fullName: 'Test User',
    };

    it('should successfully register a new user', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: mockSession },
        error: null,
      });

      const result = await authService.register(registerData);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            username: registerData.username,
            full_name: registerData.fullName,
            subscription_tier: 'free',
          },
        },
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          fullName: 'Test User',
          subscriptionTier: 'premium',
        }),
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'User registered successfully',
        expect.objectContaining({ userId: 'user-123' })
      );
    });

    it('should handle email already registered error', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'User already registered', status: 400, code: 'user_already_exists' },
      });

      await expect(authService.register(registerData)).rejects.toThrow('Email already registered');
      expect(createError).toHaveBeenCalledWith('Email already registered', 409);
    });

    it('should handle password validation error', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Password should be at least 6 characters', status: 400 },
      });

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed: Password should be at least 6 characters');
      expect(createError).toHaveBeenCalledWith('Registration failed: Password should be at least 6 characters', 400);
    });

    it('should handle invalid email format error', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid email format', status: 400 },
      });

      await expect(authService.register(registerData)).rejects.toThrow('Invalid email format');
      expect(createError).toHaveBeenCalledWith('Invalid email format', 400);
    });

    it('should handle missing user data in response', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: mockSession },
        error: null,
      });

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed: No user data returned');
      expect(createError).toHaveBeenCalledWith('Registration failed: No user data returned', 500);
    });

    it('should handle email confirmation required', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: null },
        error: null,
      });

      await expect(authService.register(registerData)).rejects.toThrow('Registration successful but email confirmation required');
      expect(createError).toHaveBeenCalledWith('Registration successful but email confirmation required', 200);
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Network error');
      (supabase.auth.signUp as jest.Mock).mockRejectedValue(unexpectedError);

      await expect(authService.register(registerData)).rejects.toThrow('Unexpected error during registration');
      expect(createError).toHaveBeenCalledWith('Unexpected error during registration', 500);
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: mockSession },
        error: null,
      });

      const result = await authService.login('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
        }),
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      expect(logger.info).toHaveBeenCalledWith('User logged in successfully:', 'user-123');
    });

    it('should handle login error', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid credentials', status: 401 },
      });

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
      expect(createError).toHaveBeenCalledWith('Invalid credentials', 401);
    });

    it('should handle missing user or session', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow('Login failed');
      expect(createError).toHaveBeenCalledWith('Login failed', 401);
    });
  });

  describe('loginWithGitHub', () => {
    it('should generate GitHub OAuth URL', async () => {
      const mockUrl = 'https://github.com/oauth/authorize?...';
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: mockUrl, provider: 'github' },
        error: null,
      });

      const result = await authService.loginWithGitHub();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });

      expect(result).toEqual({ url: mockUrl });
    });

    it('should handle OAuth error', async () => {
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'OAuth configuration error', status: 400 },
      });

      await expect(authService.loginWithGitHub()).rejects.toThrow('OAuth configuration error');
      expect(createError).toHaveBeenCalledWith('OAuth configuration error', 400);
    });

    it('should handle missing URL', async () => {
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: null },
        error: null,
      });

      await expect(authService.loginWithGitHub()).rejects.toThrow('Failed to generate GitHub login URL');
      expect(createError).toHaveBeenCalledWith('Failed to generate GitHub login URL', 500);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser, session: mockSession },
        error: null,
      });

      const result = await authService.refreshToken('old-refresh-token');

      expect(supabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'old-refresh-token',
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
        }),
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });
    });

    it('should handle refresh error', async () => {
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid refresh token', status: 401 },
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
      expect(createError).toHaveBeenCalledWith('Invalid refresh token', 401);
    });
  });

  describe('validateToken', () => {
    it('should successfully validate token', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      const result = await authService.validateToken('valid-token');

      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
      }));
    });

    it('should handle invalid token', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid token', status: 401 },
      });

      await expect(authService.validateToken('invalid-token')).rejects.toThrow('Invalid token');
      expect(createError).toHaveBeenCalledWith('Invalid token', 401);
    });

    it('should handle missing user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(authService.validateToken('token')).rejects.toThrow('User not found');
      expect(createError).toHaveBeenCalledWith('User not found', 401);
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      const result = await authService.findUserById('user-123');

      expect(supabaseAdmin.auth.admin.getUserById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
      }));
    });

    it('should return null on error', async () => {
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'User not found' },
      });

      const result = await authService.findUserById('user-123');
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.findUserById('user-123');
      expect(result).toBeNull();
    });

    it('should handle exceptions and return null', async () => {
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await authService.findUserById('user-123');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Find user service error:', expect.any(Error));
    });
  });

  describe('updateUser', () => {
    const updateData = {
      username: 'newusername',
      fullName: 'New Name',
      avatarUrl: 'https://example.com/new-avatar.jpg',
      subscriptionTier: 'enterprise',
    };

    it('should successfully update user', async () => {
      const updatedUser = { ...mockSupabaseUser, user_metadata: { ...mockSupabaseUser.user_metadata, ...updateData } };
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        data: { user: updatedUser },
        error: null,
      });

      const result = await authService.updateUser('user-123', updateData);

      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        user_metadata: {
          username: 'newusername',
          full_name: 'New Name',
          avatar_url: 'https://example.com/new-avatar.jpg',
          subscription_tier: 'enterprise',
        },
      });

      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
      }));
    });

    it('should handle update error', async () => {
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Update failed', status: 400 },
      });

      await expect(authService.updateUser('user-123', updateData)).rejects.toThrow('Update failed');
      expect(createError).toHaveBeenCalledWith('Update failed', 400);
    });

    it('should handle missing user in response', async () => {
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(authService.updateUser('user-123', updateData)).rejects.toThrow('User update failed');
      expect(createError).toHaveBeenCalledWith('User update failed', 500);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user', async () => {
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: null,
      });

      await authService.deleteUser('user-123');

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
      expect(logger.info).toHaveBeenCalledWith('User deleted successfully:', 'user-123');
    });

    it('should handle delete error', async () => {
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: { message: 'Delete failed', status: 400 },
      });

      await expect(authService.deleteUser('user-123')).rejects.toThrow('Delete failed');
      expect(createError).toHaveBeenCalledWith('Delete failed', 400);
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await authService.logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User logged out successfully');
    });

    it('should handle logout error', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Logout failed', status: 400 },
      });

      await expect(authService.logout()).rejects.toThrow('Logout failed');
      expect(createError).toHaveBeenCalledWith('Logout failed', 400);
    });
  });

  describe('mapSupabaseUserToUser', () => {
    it('should map user with all fields', async () => {
      // This is tested indirectly through other methods, but we can test edge cases
      const userWithMinimalData = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        email_confirmed_at: null,
        user_metadata: {},
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: userWithMinimalData, session: mockSession },
        error: null,
      });

      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        githubProfile: undefined,
        emailVerifiedAt: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        isActive: true,
        subscriptionTier: 'free',
      });
    });
  });
});
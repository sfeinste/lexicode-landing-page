import { logger } from '@/shared/logger';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createError } from '@/middleware/error-handler';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  githubProfile?: any;
  emailVerifiedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionTier: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private mapSupabaseUserToUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      username: supabaseUser.user_metadata?.username,
      fullName: supabaseUser.user_metadata?.full_name,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      githubProfile: supabaseUser.user_metadata?.github_profile,
      emailVerifiedAt: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : undefined,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
      isActive: true,
      subscriptionTier: supabaseUser.user_metadata?.subscription_tier || 'free',
    };
  }

  async register(userData: {
    email: string;
    password: string;
    username?: string;
    fullName?: string;
  }): Promise<AuthResult> {
    try {
      logger.info('Starting registration process', { email: userData.email });
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            full_name: userData.fullName,
            subscription_tier: 'free',
          },
        },
      });

      if (error) {
        logger.error('Supabase registration error:', {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error
        });
        
        // Provide more specific error messages based on Supabase error codes
        if (error.message.includes('already registered')) {
          throw createError('Email already registered', 409);
        } else if (error.message.includes('password')) {
          throw createError('Password does not meet requirements', 400);
        } else if (error.message.includes('email')) {
          throw createError('Invalid email format', 400);
        }
        
        throw createError(`Registration failed: ${error.message}`, error.status || 400);
      }

      if (!data.user) {
        logger.error('Registration response missing user data', { data });
        throw createError('Registration failed: No user data returned', 500);
      }

      if (!data.session) {
        logger.warn('Registration successful but no session created', { userId: data.user.id });
        // This might happen if email confirmation is required
        throw createError('Registration successful but email confirmation required', 200);
      }

      logger.info('User registered successfully', { 
        userId: data.user.id,
        email: data.user.email,
        hasSession: !!data.session 
      });

      return {
        user: this.mapSupabaseUserToUser(data.user),
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error: any) {
      logger.error('Registration service error:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack
      });
      
      // Re-throw if it's already our custom error
      if (error.statusCode) {
        throw error;
      }
      
      // Otherwise wrap it
      throw createError('Unexpected error during registration', 500);
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Login error:', error);
        throw createError(error.message, 401);
      }

      if (!data.user || !data.session) {
        throw createError('Login failed', 401);
      }

      logger.info('User logged in successfully:', data.user.id);

      return {
        user: this.mapSupabaseUserToUser(data.user),
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  }

  async loginWithGitHub(): Promise<{ url: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
        },
      });

      if (error) {
        logger.error('GitHub login error:', error);
        throw createError(error.message, 400);
      }

      if (!data.url) {
        throw createError('Failed to generate GitHub login URL', 500);
      }

      return { url: data.url };
    } catch (error) {
      logger.error('GitHub login service error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        logger.error('Token refresh error:', error);
        throw createError(error.message, 401);
      }

      if (!data.user || !data.session) {
        throw createError('Token refresh failed', 401);
      }

      logger.info('Token refreshed successfully for user:', data.user.id);

      return {
        user: this.mapSupabaseUserToUser(data.user),
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('Token refresh service error:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error) {
        logger.error('Token validation error:', error);
        throw createError('Invalid token', 401);
      }

      if (!data.user) {
        throw createError('User not found', 401);
      }

      return this.mapSupabaseUserToUser(data.user);
    } catch (error) {
      logger.error('Token validation service error:', error);
      throw error;
    }
  }

  async findUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error) {
        logger.error('Find user error:', error);
        return null;
      }

      if (!data.user) {
        return null;
      }

      return this.mapSupabaseUserToUser(data.user);
    } catch (error) {
      logger.error('Find user service error:', error);
      return null;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            username: userData.username,
            full_name: userData.fullName,
            avatar_url: userData.avatarUrl,
            subscription_tier: userData.subscriptionTier,
          },
        }
      );

      if (error) {
        logger.error('Update user error:', error);
        throw createError(error.message, 400);
      }

      if (!data.user) {
        throw createError('User update failed', 500);
      }

      logger.info('User updated successfully:', userId);

      return this.mapSupabaseUserToUser(data.user);
    } catch (error) {
      logger.error('Update user service error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        logger.error('Delete user error:', error);
        throw createError(error.message, 400);
      }

      logger.info('User deleted successfully:', userId);
    } catch (error) {
      logger.error('Delete user service error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('Logout error:', error);
        throw createError(error.message, 400);
      }

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout service error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
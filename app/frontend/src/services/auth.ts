import axios from 'axios';
import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionTier: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
  username?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private baseURL = `${API_BASE_URL}/api/v1/auth`;

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${this.baseURL}/register`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Registration failed');
    }
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${this.baseURL}/login`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Login failed');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${this.baseURL}/refresh`, {
        refreshToken
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Token refresh failed');
    }
  }

  async getCurrentUser(accessToken: string): Promise<{ user: User }> {
    try {
      const response = await api.get<{ user: User }>(`/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get current user');
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      await api.post(`/api/v1/auth/logout`, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      // Logout errors are typically not critical
      console.warn('Logout request failed:', error);
    }
  }

  async githubAuth(): Promise<{ url: string }> {
    try {
      const response = await axios.get<{ url: string }>(`${this.baseURL}/github`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('GitHub authentication failed');
    }
  }
}

export const authService = new AuthService();
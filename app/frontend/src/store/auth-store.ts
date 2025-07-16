import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User, RegisterData } from '@/services/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          });
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(userData);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          });
        }
      },

      logout: async () => {
        const { accessToken } = get();
        if (accessToken) {
          await authService.logout(accessToken);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        try {
          const response = await authService.refreshToken(refreshToken);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true
          });
        } catch (error) {
          // If refresh fails, clear auth state
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: 'Session expired'
          });
          throw error;
        }
      },

      initializeAuth: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken || !refreshToken) {
          return;
        }

        try {
          // Try to get current user with existing token
          const response = await authService.getCurrentUser(accessToken);
          set({
            user: response.user,
            isAuthenticated: true
          });
        } catch (error) {
          // If token is invalid, try to refresh
          try {
            await get().refreshAuth();
          } catch (refreshError) {
            // If refresh fails, clear auth state
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              error: null
            });
          }
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
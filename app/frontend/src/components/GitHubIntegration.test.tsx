import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitHubIntegration } from './GitHubIntegration';

// Mock the useGitHub hook
vi.mock('@/hooks/useGitHub', () => ({
  useGitHub: vi.fn(),
}));

import { useGitHub } from '@/hooks/useGitHub';

describe('GitHubIntegration', () => {
  const mockOnInstallationComplete = vi.fn();
  const mockInitiateInstallation = vi.fn();
  const mockCheckInstallationStatus = vi.fn();
  const mockGetRepositoryCount = vi.fn();
  const mockClearError = vi.fn();

  const defaultMockUseGitHub = {
    installations: [],
    repositories: [],
    isLoading: false,
    error: null,
    initiateInstallation: mockInitiateInstallation,
    checkInstallationStatus: mockCheckInstallationStatus,
    getRepositoryCount: mockGetRepositoryCount,
    clearError: mockClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGitHub as any).mockReturnValue(defaultMockUseGitHub);
  });

  describe('when not connected to GitHub', () => {
    it('should render connect GitHub UI', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<GitHubIntegration />);
      
      expect(screen.getByText('Connect GitHub')).toBeInTheDocument();
      expect(screen.getByText('Connect your GitHub account to access your repositories')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect with github/i })).toBeInTheDocument();
    });

    it('should display feature list', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<GitHubIntegration />);
      
      expect(screen.getByText('Secure access to your repositories')).toBeInTheDocument();
      expect(screen.getByText('Automatic documentation generation')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates via webhooks')).toBeInTheDocument();
    });

    it('should handle connect button click', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<GitHubIntegration />);
      
      const connectButton = screen.getByRole('button', { name: /connect with github/i });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
        expect(mockInitiateInstallation).toHaveBeenCalled();
      });
    });

    it('should show loading state when connecting', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      (useGitHub as any).mockReturnValue({
        ...defaultMockUseGitHub,
        isLoading: true,
      });
      
      render(<GitHubIntegration />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should display error message when error occurs', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      const errorMessage = 'Failed to connect to GitHub';
      (useGitHub as any).mockReturnValue({
        ...defaultMockUseGitHub,
        error: errorMessage,
      });
      
      render(<GitHubIntegration />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('when connected to GitHub', () => {
    it('should show connected status', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(5);
      
      render(<GitHubIntegration />);
      
      await waitFor(() => {
        expect(screen.getByText('GitHub Connected')).toBeInTheDocument();
        expect(screen.getByText('5 repositories accessible')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should show singular repository text for 1 repository', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(1);
      
      render(<GitHubIntegration />);
      
      await waitFor(() => {
        expect(screen.getByText('1 repository accessible')).toBeInTheDocument();
      });
    });

    it('should call onInstallationComplete when connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(3);
      
      render(<GitHubIntegration onInstallationComplete={mockOnInstallationComplete} />);
      
      await waitFor(() => {
        expect(mockOnInstallationComplete).toHaveBeenCalled();
      });
    });
  });

  describe('status checking on mount', () => {
    it('should check installation status on mount', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<GitHubIntegration />);
      
      await waitFor(() => {
        expect(mockCheckInstallationStatus).toHaveBeenCalled();
      });
    });

    it('should get repository count when installations exist', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(10);
      
      render(<GitHubIntegration />);
      
      await waitFor(() => {
        expect(mockGetRepositoryCount).toHaveBeenCalled();
      });
    });
  });
});
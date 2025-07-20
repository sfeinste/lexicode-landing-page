import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

// Mock the hooks and components
vi.mock('@/hooks/useGitHub', () => ({
  useGitHub: vi.fn(),
}));

vi.mock('@/components/GitHubIntegration', () => ({
  GitHubIntegration: ({ onInstallationComplete }: any) => (
    <div data-testid="github-integration">
      <button onClick={onInstallationComplete}>Complete Installation</button>
    </div>
  ),
}));

vi.mock('@/components/RepositoryManager', () => ({
  RepositoryManager: ({ onClose }: any) => (
    <div data-testid="repository-manager">
      <button onClick={onClose}>Close Manager</button>
    </div>
  ),
}));

import { useGitHub } from '@/hooks/useGitHub';

describe('DashboardPage', () => {
  const mockGetRepositoryCount = vi.fn();
  const mockCheckInstallationStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGitHub as any).mockReturnValue({
      getRepositoryCount: mockGetRepositoryCount,
      checkInstallationStatus: mockCheckInstallationStatus,
    });
  });

  describe('Welcome Section', () => {
    it('should render welcome message', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      mockGetRepositoryCount.mockResolvedValue(0);
      
      render(<DashboardPage />);
      
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByText("Here's what's happening with your repositories and documentation.")).toBeInTheDocument();
    });
  });

  describe('Stats Cards', () => {
    it('should display all stats cards', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(5);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Connected Repositories')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Documentation Projects')).toBeInTheDocument();
      expect(screen.getByText('Generations This Month')).toBeInTheDocument();
      expect(screen.getByText('Coverage Score')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 0 repositories when not connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      mockGetRepositoryCount.mockResolvedValue(0);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        const repoCount = screen.getAllByText('0')[0];
        expect(repoCount).toBeInTheDocument();
      });
    });

    it('should have proper icons for each stat', () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      mockGetRepositoryCount.mockResolvedValue(0);
      
      const { container } = render(<DashboardPage />);
      
      // Check for SVG icons in stat cards
      const statCards = container.querySelectorAll('.bg-white.rounded-lg.shadow.p-6');
      let svgCount = 0;
      statCards.forEach(card => {
        const svg = card.querySelector('svg');
        if (svg) svgCount++;
      });
      expect(svgCount).toBeGreaterThanOrEqual(4); // At least 4 stat cards with icons
    });
  });

  describe('Recent Activity Section', () => {
    it('should show no repositories connected message when not connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No repositories connected')).toBeInTheDocument();
        expect(screen.getByText('Connect your first repository to get started')).toBeInTheDocument();
      });
    });

    it('should show no recent activity message when connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(3);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
        expect(screen.getByText('Repository activity will appear here')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should show Connect Repository when not connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Connect Repository')).toBeInTheDocument();
        expect(screen.getByText('Link your GitHub repository to start generating documentation')).toBeInTheDocument();
      });
    });

    it('should show Manage Repositories when connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(2);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Manage Repositories')).toBeInTheDocument();
        expect(screen.getByText('View and manage your connected GitHub repositories')).toBeInTheDocument();
      });
    });

    it('should disable Generate Documentation button when not connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Documentation').closest('button');
        expect(generateButton).toBeDisabled();
        expect(screen.getByText('Connect a repository first to enable documentation generation')).toBeInTheDocument();
      });
    });

    it('should enable Generate Documentation button when connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(1);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        const generateButton = screen.getByText('Generate Documentation').closest('button');
        expect(generateButton).not.toBeDisabled();
        expect(screen.getByText('Create comprehensive documentation for your codebase')).toBeInTheDocument();
      });
    });
  });

  describe('GitHub Integration Flow', () => {
    it('should show GitHub integration when clicking Connect Repository without connection', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        const connectButton = screen.getByText('Connect Repository').closest('button');
        fireEvent.click(connectButton!);
      });
      
      expect(screen.getByTestId('github-integration')).toBeInTheDocument();
      expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
    });

    it('should show Repository Manager when clicking Manage Repositories with connection', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(2);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        const manageButton = screen.getByText('Manage Repositories').closest('button');
        fireEvent.click(manageButton!);
      });
      
      expect(screen.getByTestId('repository-manager')).toBeInTheDocument();
    });

    it('should handle installation complete', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      mockGetRepositoryCount.mockResolvedValueOnce(0).mockResolvedValueOnce(3);
      
      render(<DashboardPage />);
      
      // Open GitHub integration
      await waitFor(() => {
        const connectButton = screen.getByText('Connect Repository').closest('button');
        fireEvent.click(connectButton!);
      });
      
      // Complete installation
      const completeButton = screen.getByText('Complete Installation');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('github-integration')).not.toBeInTheDocument();
        expect(mockGetRepositoryCount).toHaveBeenCalled();
      });
    });

    it('should refresh repository count after closing repository manager', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
      
      render(<DashboardPage />);
      
      // Open repository manager
      await waitFor(() => {
        const manageButton = screen.getByText('Manage Repositories').closest('button');
        fireEvent.click(manageButton!);
      });
      
      // Close repository manager
      const closeButton = screen.getByText('Close Manager');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('repository-manager')).not.toBeInTheDocument();
        expect(mockGetRepositoryCount).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Initial Load', () => {
    it('should check installation status on mount', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(1);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(mockCheckInstallationStatus).toHaveBeenCalled();
      });
    });

    it('should load repository count when connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(true);
      mockGetRepositoryCount.mockResolvedValue(5);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(mockGetRepositoryCount).toHaveBeenCalled();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should not load repository count when not connected', async () => {
      mockCheckInstallationStatus.mockResolvedValue(false);
      
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(mockCheckInstallationStatus).toHaveBeenCalled();
      });
      
      expect(mockGetRepositoryCount).not.toHaveBeenCalled();
    });
  });
});
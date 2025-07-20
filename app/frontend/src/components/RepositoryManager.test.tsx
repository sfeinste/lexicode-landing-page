import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RepositoryManager } from './RepositoryManager';
import { api } from '@/services/api';

vi.mock('@/services/api');

const mockApi = api as any;

const mockInstallations = {
  data: {
    data: {
      installations: [
        { id: 1, github_installation_id: '12345' }
      ]
    }
  }
};

const mockRepositories = {
  data: {
    data: {
      repositories: [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'user/test-repo',
          description: 'Test repository',
          private: false,
          language: 'JavaScript',
          stargazers_count: 10,
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'private-repo',
          full_name: 'user/private-repo',
          description: 'Private test repository',
          private: true,
          language: 'TypeScript',
          stargazers_count: 5,
          updated_at: '2024-01-02T00:00:00Z'
        }
      ]
    }
  }
};

const mockConnectedRepos = {
  data: {
    data: {
      repositories: [
        {
          id: 'abc123',
          github_repo_id: 1,
          repo_full_name: 'user/test-repo',
          access_status: 'active'
        }
      ]
    }
  }
};

describe('RepositoryManager', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/api/v1/auth/github-app/installations') {
        return Promise.resolve(mockInstallations);
      }
      if (url === '/api/v1/auth/github-app/repositories') {
        return Promise.resolve(mockConnectedRepos);
      }
      if (url.includes('/installations/12345/repositories')) {
        return Promise.resolve(mockRepositories);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('renders loading state initially', () => {
    render(<RepositoryManager onClose={mockOnClose} />);
    expect(screen.getByText('Loading repositories...')).toBeInTheDocument();
  });

  it('renders repository list after loading', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Repository Access')).toBeInTheDocument();
    });

    expect(screen.getByText('user/test-repo')).toBeInTheDocument();
    expect(screen.getByText('user/private-repo')).toBeInTheDocument();
    expect(screen.getByText('Test repository')).toBeInTheDocument();
  });

  it('shows connected repositories as selected', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      const testRepoElement = screen.getByText('user/test-repo').closest('div[class*="border"]');
      expect(testRepoElement).toHaveClass('border-blue-500');
    });
  });

  it('handles search functionality', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user/test-repo')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search repositories...');
    fireEvent.change(searchInput, { target: { value: 'private' } });

    expect(screen.queryByText('user/test-repo')).not.toBeInTheDocument();
    expect(screen.getByText('user/private-repo')).toBeInTheDocument();
  });

  it('toggles repository selection', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user/private-repo')).toBeInTheDocument();
    });

    const privateRepoElement = screen.getByText('user/private-repo').closest('div[class*="border"]');
    fireEvent.click(privateRepoElement!);

    expect(privateRepoElement).toHaveClass('border-blue-500');
  });

  it('saves changes when Save button is clicked', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true } });

    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user/private-repo')).toBeInTheDocument();
    });

    const privateRepoElement = screen.getByText('user/private-repo').closest('div[class*="border"]');
    fireEvent.click(privateRepoElement!);

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/github-app/repositories/access', {
        repositories: [{
          githubRepoId: 2,
          installationId: 'auto'
        }]
      });
    });
  });

  it('closes modal on Cancel button click', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Repository Access')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal on X button click', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Repository Access')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays error message on API failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('API Error'));

    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load repositories. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows correct repository count', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('1 repository selected')).toBeInTheDocument();
    });

    const privateRepoElement = screen.getByText('user/private-repo').closest('div[class*="border"]');
    fireEvent.click(privateRepoElement!);

    expect(screen.getByText('2 repositories selected')).toBeInTheDocument();
  });

  it('disables Save button when no changes made', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      expect(saveButton).toBeDisabled();
    });
  });

  it('shows private/public icons correctly', async () => {
    render(<RepositoryManager onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('user/test-repo')).toBeInTheDocument();
    });

    const publicRepoContainer = screen.getByText('user/test-repo').closest('div');
    const privateRepoContainer = screen.getByText('user/private-repo').closest('div');

    expect(publicRepoContainer?.querySelector('svg')).toBeTruthy();
    expect(privateRepoContainer?.querySelector('svg')).toBeTruthy();
  });
});
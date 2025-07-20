import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationPage } from './DocumentationPage';

// Mock API service
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { api } from '@/services/api';

describe('DocumentationPage', () => {
  const mockDocumentation = [
    {
      id: '1',
      repository_id: 'repo1',
      content: 'Documentation content 1',
      generation_id: 'gen1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      repository: {
        id: 'repo1',
        repo_full_name: 'user/repo1',
        repo_name: 'repo1',
        repo_owner: 'user',
        language: 'TypeScript',
        default_branch: 'main',
      },
    },
    {
      id: '2',
      repository_id: 'repo2',
      content: 'Documentation content 2',
      generation_id: 'gen2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      repository: {
        id: 'repo2',
        repo_full_name: 'user/repo2',
        repo_name: 'repo2',
        repo_owner: 'user',
        language: 'Python',
        default_branch: 'master',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDocumentationPage = () => {
    return render(
      <MemoryRouter>
        <DocumentationPage />
      </MemoryRouter>
    );
  };

  describe('Page Header', () => {
    it('should render page title and description', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      
      renderDocumentationPage();
      
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('View and manage your generated documentation')).toBeInTheDocument();
    });

    it('should render generate documentation button', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      
      renderDocumentationPage();
      
      const generateButton = screen.getByRole('button', { name: /generate documentation/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should navigate to repositories when generate button clicked', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      
      renderDocumentationPage();
      
      const generateButton = screen.getByRole('button', { name: /generate documentation/i });
      fireEvent.click(generateButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/repositories');
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search documentation by repository name, language...');
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should filter documentation by repository name', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation by repository name, language...');
      fireEvent.change(searchInput, { target: { value: 'repo1' } });
      
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
      expect(screen.queryByText('user/repo2')).not.toBeInTheDocument();
    });

    it('should filter documentation by language', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation by repository name, language...');
      fireEvent.change(searchInput, { target: { value: 'python' } });
      
      expect(screen.queryByText('TypeScript')).not.toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search documentation by repository name, language...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('No documentation found matching your search')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });
  });

  describe('Documentation List', () => {
    it('should show loading state initially', () => {
      (api.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderDocumentationPage();
      
      // Check for animate-spin class anywhere in the document
      const spinningElement = document.querySelector('.animate-spin');
      expect(spinningElement).toBeTruthy();
      expect(spinningElement).toBeInTheDocument();
    });

    it('should display documentation items', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('master')).toBeInTheDocument();
      });
    });

    it('should show empty state when no documentation', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('No documentation generated yet')).toBeInTheDocument();
        expect(screen.getByText('Generate documentation for your repositories to get started')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /generate your first documentation/i })).toBeInTheDocument();
      });
    });

    it('should handle API errors', async () => {
      (api.get as any).mockRejectedValue(new Error('API Error'));
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load documentation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry loading on error', async () => {
      (api.get as any).mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load documentation')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
      });
    });
  });

  describe('Documentation Item Display', () => {
    it('should display repository information correctly', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        // Check repository names
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
        
        // Check languages with colors
        const typeScriptElement = screen.getByText('TypeScript');
        expect(typeScriptElement).toBeInTheDocument();
        
        // Check branches
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('master')).toBeInTheDocument();
        
        // Check status badges
        const statusBadges = screen.getAllByText('Generated');
        expect(statusBadges).toHaveLength(2);
      });
    });

    it('should format update times correctly', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Updated 2 hours ago/)).toBeInTheDocument();
        expect(screen.getByText(/Updated 1 day ago/)).toBeInTheDocument();
      });
    });

    it('should display documentation size', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const sizeElements = screen.getAllByText(/Documentation size:/);
        expect(sizeElements).toHaveLength(2);
      });
    });
  });

  describe('Documentation Actions', () => {
    it('should have view and github buttons for each item', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /view/i });
        const githubLinks = screen.getAllByRole('link', { name: /github/i });
        
        expect(viewButtons).toHaveLength(2);
        expect(githubLinks).toHaveLength(2);
      });
    });

    it('should navigate to documentation view on view button click', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /view/i });
        fireEvent.click(viewButtons[0]);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/documentation/repo1');
    });

    it('should have correct github links', async () => {
      (api.get as any).mockResolvedValue({ data: mockDocumentation });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const githubLinks = screen.getAllByRole('link', { name: /github/i });
        
        expect(githubLinks[0]).toHaveAttribute('href', 'https://github.com/user/repo1');
        expect(githubLinks[0]).toHaveAttribute('target', '_blank');
        expect(githubLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
        
        expect(githubLinks[1]).toHaveAttribute('href', 'https://github.com/user/repo2');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format recent times correctly', async () => {
      const recentDoc = [{
        ...mockDocumentation[0],
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      }];
      
      (api.get as any).mockResolvedValue({ data: recentDoc });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Updated Less than an hour ago/)).toBeInTheDocument();
      });
    });

    it('should format old dates correctly', async () => {
      const oldDoc = [{
        ...mockDocumentation[0],
        updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      }];
      
      (api.get as any).mockResolvedValue({ data: oldDoc });
      
      renderDocumentationPage();
      
      await waitFor(() => {
        const dateText = screen.getByText(/Updated/);
        expect(dateText.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
      });
    });
  });
});
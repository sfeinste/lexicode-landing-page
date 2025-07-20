import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RepositoriesPage } from './RepositoriesPage';

// Mock dependencies
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('@/services/documentation', () => ({
  documentationApi: {
    generateFiles: vi.fn(),
    pollJobProgress: vi.fn(),
  },
}));

vi.mock('@/components/RepositoryManager', () => ({
  RepositoryManager: ({ onClose }: any) => (
    <div data-testid="repository-manager">
      <button onClick={onClose}>Close Manager</button>
    </div>
  ),
}));

vi.mock('@/components/documentation/DocumentationProgressModal', () => ({
  DocumentationProgressModal: ({ isOpen, onClose, progress, repositoryName }: any) => 
    isOpen ? (
      <div data-testid="progress-modal">
        <h2>Generating documentation for {repositoryName}</h2>
        {progress && <p>{progress.status}</p>}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { api } from '@/services/api';
import { documentationApi } from '@/services/documentation';

describe('RepositoriesPage', () => {
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
      access_granted_at: new Date().toISOString(),
      last_accessed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      access_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: 'A test repository',
      stars_count: 42,
      forks_count: 10,
      open_issues_count: 5,
      size: 1024,
      last_push_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      topics: ['testing', 'documentation'],
      license: 'MIT',
      homepage: 'https://example.com',
      has_wiki: true,
      has_pages: false,
      archived: false,
      disabled: false,
    },
    {
      id: '2',
      github_repo_id: 456,
      repo_full_name: 'user/repo2',
      repo_name: 'repo2',
      repo_owner: 'user',
      is_private: true,
      default_branch: 'master',
      language: 'Python',
      access_granted_at: new Date().toISOString(),
      access_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRepositoriesPage = () => {
    return render(
      <MemoryRouter>
        <RepositoriesPage />
      </MemoryRouter>
    );
  };

  describe('Page Header', () => {
    it('should render page title and description', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('Repositories')).toBeInTheDocument();
        expect(screen.getByText('Manage and analyze your connected GitHub repositories')).toBeInTheDocument();
      });
    });

    it('should render manage repositories button', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const manageButton = screen.getByRole('button', { name: /manage repositories/i });
        expect(manageButton).toBeInTheDocument();
      });
    });

    it('should show refresh button', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh repositories');
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      (api.get as any).mockImplementation(() => new Promise(() => {}));
      
      renderRepositoriesPage();
      
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe('Search and Filters', () => {
    it('should render search input', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search repositories...');
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should filter repositories by search term', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search repositories...');
      fireEvent.change(searchInput, { target: { value: 'repo1' } });
      
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
      expect(screen.queryByText('user/repo2')).not.toBeInTheDocument();
    });

    it('should render language filter with unique languages', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const languageFilter = screen.getByDisplayValue('All Languages');
        expect(languageFilter).toBeInTheDocument();
        
        fireEvent.click(languageFilter);
        const options = screen.getAllByText('TypeScript');
        expect(options.length).toBeGreaterThan(0);
        const pythonOptions = screen.getAllByText('Python');
        expect(pythonOptions.length).toBeGreaterThan(0);
      });
    });

    it('should filter by language', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const languageFilter = screen.getByDisplayValue('All Languages');
        fireEvent.change(languageFilter, { target: { value: 'TypeScript' } });
      });
      
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
      expect(screen.queryByText('user/repo2')).not.toBeInTheDocument();
    });

    it('should render status filter', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const statusFilter = screen.getByDisplayValue('All Status');
        expect(statusFilter).toBeInTheDocument();
        
        fireEvent.click(statusFilter);
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Suspended')).toBeInTheDocument();
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });
  });

  describe('Repository List', () => {
    it('should display repositories count', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('Connected Repositories (2)')).toBeInTheDocument();
      });
    });

    it('should display repository information', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        // Repository names
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
        
        // Description
        expect(screen.getByText('A test repository')).toBeInTheDocument();
        
        // Languages
        const typescriptElements = screen.getAllByText('TypeScript');
        expect(typescriptElements.length).toBeGreaterThan(0);
        const pythonElements = screen.getAllByText('Python');
        expect(pythonElements.length).toBeGreaterThan(0);
        
        // Branches
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('master')).toBeInTheDocument();
        
        // Topics - check they exist
        const topics = screen.getAllByText(/testing|documentation/);
        expect(topics.length).toBeGreaterThan(0);
      });
    });

    it('should show privacy icons', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        // Check for at least one repository to be rendered
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
        expect(screen.getByText('user/repo2')).toBeInTheDocument();
      });
      
      // The icons are SVG elements within the repository cards
      // Check that SVG elements exist in the rendered output
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
      
      // Specifically check for the presence of repository cards which should contain privacy icons
      const repoCards = screen.getAllByText(/user\/repo/i);
      expect(repoCards.length).toBe(2);
    });

    it('should display empty state when no repositories', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('No repositories connected')).toBeInTheDocument();
        expect(screen.getByText('Connect your first GitHub repository to start generating documentation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /connect your first repository/i })).toBeInTheDocument();
      });
    });

    it('should display filtered empty state', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search repositories...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });
      
      expect(screen.getByText('No repositories match your filters')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  describe('Repository Actions', () => {
    it('should have generate docs button for each repository', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const generateButtons = screen.getAllByRole('button', { name: /generate docs/i });
        expect(generateButtons).toHaveLength(2);
      });
    });

    it('should handle generate documentation', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      (documentationApi.pollJobProgress as any).mockImplementation(async (jobId, callback) => {
        callback({ jobId, status: 'completed' });
      });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const generateButton = screen.getAllByRole('button', { name: /generate docs/i })[0];
        fireEvent.click(generateButton);
      });
      
      await waitFor(() => {
        expect(documentationApi.generateFiles).toHaveBeenCalledWith('1');
        expect(screen.getByTestId('progress-modal')).toBeInTheDocument();
        expect(screen.getByText('Generating documentation for user/repo1')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/documentation/1');
      }, { timeout: 3000 });
    });

    it('should handle documentation generation errors', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      (documentationApi.generateFiles as any).mockRejectedValue(new Error('Generation failed'));
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const generateButton = screen.getAllByRole('button', { name: /generate docs/i })[0];
        fireEvent.click(generateButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });

    it('should navigate to documentation view', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
      });
      
      // Find the button that contains the FileText icon
      const container = screen.getByText('user/repo1').closest('.border');
      const viewButton = within(container!).getAllByRole('button')[1]; // Second button is the view button
      
      fireEvent.click(viewButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/documentation/1');
    });
  });

  describe('Repository Manager', () => {
    it('should open repository manager when manage button clicked', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const manageButton = screen.getByRole('button', { name: /manage repositories/i });
        fireEvent.click(manageButton);
      });
      
      expect(screen.getByTestId('repository-manager')).toBeInTheDocument();
    });

    it('should reload repositories after closing manager', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: [] } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        const manageButton = screen.getByRole('button', { name: /manage repositories/i });
        fireEvent.click(manageButton);
      });
      
      const closeButton = screen.getByText('Close Manager');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh repositories when refresh button clicked', async () => {
      (api.get as any).mockResolvedValue({ data: { data: { repositories: mockRepositories } } });
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByTitle('Refresh repositories');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should show spinning refresh icon while refreshing', async () => {
      let resolvePromise: any;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      (api.get as any)
        .mockResolvedValueOnce({ data: { data: { repositories: mockRepositories } } })
        .mockImplementationOnce(() => delayedPromise);
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByTitle('Refresh repositories')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByTitle('Refresh repositories');
      fireEvent.click(refreshButton);
      
      // Check if the button contains an element with animate-spin class
      await waitFor(() => {
        const button = screen.getByTitle('Refresh repositories');
        const spinningElement = button.querySelector('.animate-spin');
        expect(spinningElement).toBeTruthy();
      });
      
      // Resolve the promise to complete the refresh
      resolvePromise({ data: { data: { repositories: mockRepositories } } });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      (api.get as any).mockRejectedValue(new Error('API Error'));
      
      renderRepositoriesPage();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load repositories. Please try again.')).toBeInTheDocument();
      });
    });
  });
});
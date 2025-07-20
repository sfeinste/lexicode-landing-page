import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DocumentationViewPage } from './DocumentationViewPage';

// Mock dependencies
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('@/services/documentation', () => ({
  documentationApi: {
    getFiles: vi.fn(),
    generateFiles: vi.fn(),
    pollJobProgress: vi.fn(),
  },
}));

vi.mock('@/components/MultiPageDocumentationView', () => ({
  MultiPageDocumentationView: ({ repositoryId, repositoryName, onRegenerate }: any) => (
    <div data-testid="multi-page-view">
      <h2>Documentation for {repositoryName}</h2>
      <p>Repository ID: {repositoryId}</p>
      <button onClick={onRegenerate}>Regenerate Documentation</button>
    </div>
  ),
}));

vi.mock('@/components/documentation/DocumentationProgressModal', () => ({
  DocumentationProgressModal: ({ isOpen, onClose, progress, repositoryName }: any) => 
    isOpen ? (
      <div data-testid="progress-modal">
        <h2>Generating documentation for {repositoryName}</h2>
        {progress && (
          <>
            <p>Status: {progress.status}</p>
            {progress.error && <p>Error: {progress.error}</p>}
          </>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import { api } from '@/services/api';
import { documentationApi } from '@/services/documentation';

describe('DocumentationViewPage', () => {
  const mockRepositoryId = 'repo123';
  const mockRepositoryName = 'user/test-repo';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDocumentationViewPage = (repositoryId = mockRepositoryId) => {
    return render(
      <MemoryRouter initialEntries={[`/documentation/${repositoryId}`]}>
        <Routes>
          <Route path="/documentation/:repositoryId" element={<DocumentationViewPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Initial Load', () => {
    it('should show loading state initially', () => {
      (documentationApi.getFiles as any).mockImplementation(() => new Promise(() => {}));
      (api.get as any).mockImplementation(() => new Promise(() => {}));
      
      renderDocumentationViewPage();
      
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('should load file documentation on mount', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(documentationApi.getFiles).toHaveBeenCalledWith(mockRepositoryId);
      });
    });

    it('should load repository info on mount', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/api/v1/repositories/${mockRepositoryId}`);
      });
    });

    it('should handle file documentation load error', async () => {
      (documentationApi.getFiles as any).mockRejectedValue(new Error('Failed to load'));
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to check file documentation:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle repository info load error', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockRejectedValue(new Error('Failed to load'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load repository info:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('MultiPageDocumentationView', () => {
    it('should render MultiPageDocumentationView after loading', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('multi-page-view')).toBeInTheDocument();
        expect(screen.getByText(`Documentation for ${mockRepositoryName}`)).toBeInTheDocument();
        expect(screen.getByText(`Repository ID: ${mockRepositoryId}`)).toBeInTheDocument();
      });
    });

    it('should use default repository name when not available', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: {} }); // No repo_full_name
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        expect(screen.getByText('Documentation for Repository')).toBeInTheDocument();
      });
    });
  });

  describe('Documentation Regeneration', () => {
    it('should handle regenerate button click', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      (documentationApi.pollJobProgress as any).mockImplementation(async (jobId, callback) => {
        callback({ jobId, status: 'processing' });
        callback({ jobId, status: 'completed' });
      });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        expect(documentationApi.generateFiles).toHaveBeenCalledWith(mockRepositoryId);
        expect(screen.getByTestId('progress-modal')).toBeInTheDocument();
      });
    });

    it('should show progress updates during regeneration', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      
      let progressCallback: any;
      (documentationApi.pollJobProgress as any).mockImplementation(async (jobId, callback) => {
        progressCallback = callback;
        callback({ jobId, status: 'processing' });
      });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Status: processing')).toBeInTheDocument();
      });
      
      // Update progress
      progressCallback({ jobId: 'job123', status: 'completed' });
      
      await waitFor(() => {
        expect(screen.getByText('Status: completed')).toBeInTheDocument();
      });
    });

    it('should handle regeneration error', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockRejectedValue(new Error('Generation failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Status: failed')).toBeInTheDocument();
        expect(screen.getByText('Error: Generation failed')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should reload documentation after successful regeneration', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      (documentationApi.pollJobProgress as any).mockImplementation(async (jobId, callback) => {
        callback({ jobId, status: 'completed' });
      });
      
      renderDocumentationViewPage();
      
      // Initial load
      expect(documentationApi.getFiles).toHaveBeenCalledTimes(1);
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        // Should be called again after regeneration
        expect(documentationApi.getFiles).toHaveBeenCalledTimes(2);
      });
    });

    it('should auto-close modal after successful regeneration', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      (documentationApi.pollJobProgress as any).mockImplementation(async (jobId, callback) => {
        callback({ jobId, status: 'completed' });
      });
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('progress-modal')).toBeInTheDocument();
      });
      
      // Wait for auto-close
      await waitFor(() => {
        expect(screen.queryByTestId('progress-modal')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Progress Modal', () => {
    it('should allow manual close of progress modal', async () => {
      (documentationApi.getFiles as any).mockResolvedValue({ files: [] });
      (api.get as any).mockResolvedValue({ data: { repo_full_name: mockRepositoryName } });
      (documentationApi.generateFiles as any).mockResolvedValue({ jobId: 'job123' });
      (documentationApi.pollJobProgress as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderDocumentationViewPage();
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate documentation/i });
        regenerateButton.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('progress-modal')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.click();
      
      await waitFor(() => {
        expect(screen.queryByTestId('progress-modal')).not.toBeInTheDocument();
      });
    });
  });
});
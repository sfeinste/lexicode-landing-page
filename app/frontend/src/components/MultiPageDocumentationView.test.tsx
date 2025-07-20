import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiPageDocumentationView } from './MultiPageDocumentationView';
import { documentationApi, buildFileTree } from '@/services/documentation';

vi.mock('@/services/documentation', () => ({
  documentationApi: {
    getFiles: vi.fn(),
    getSummary: vi.fn(),
    getFileByPath: vi.fn(),
  },
  buildFileTree: vi.fn(() => [
    {
      name: 'src',
      path: 'src',
      type: 'folder',
      children: [
        {
          name: 'index.ts',
          path: 'src/index.ts',
          type: 'file',
          language: 'typescript',
          hasDocumentation: true
        },
        {
          name: 'components',
          path: 'src/components',
          type: 'folder',
          children: [
            {
              name: 'Button.tsx',
              path: 'src/components/Button.tsx',
              type: 'file',
              language: 'typescript',
              hasDocumentation: true
            }
          ]
        }
      ]
    },
    {
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      language: 'markdown',
      hasDocumentation: true
    }
  ])
}));

const mockDocumentationApi = documentationApi as any;

const mockFileList = {
  files: [
    {
      file_path: 'src/index.ts',
      language: 'typescript',
      has_documentation: true
    },
    {
      file_path: 'src/components/Button.tsx',
      language: 'typescript',
      has_documentation: true
    },
    {
      file_path: 'README.md',
      language: 'markdown',
      has_documentation: true
    }
  ]
};

const mockSummary = {
  content: '# Repository Overview\n\nThis is a test repository.',
  repository_id: 'test-repo-id'
};

const mockFileDocumentation = {
  file_path: 'src/index.ts',
  documentation: '# Index File\n\nThis is the main entry point.',
  file_type: 'TypeScript',
  language: 'typescript',
  lines_of_code: 100
};

describe('MultiPageDocumentationView', () => {
  const mockOnRegenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocumentationApi.getFiles.mockResolvedValue(mockFileList);
    mockDocumentationApi.getSummary.mockResolvedValue(mockSummary);
    mockDocumentationApi.getFileByPath.mockResolvedValue(mockFileDocumentation);
    
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('renders loading state initially', () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeTruthy();
  });

  it('loads and displays file list', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    expect(mockDocumentationApi.getFiles).toHaveBeenCalledWith('test-repo-id');
  });

  it('loads summary by default', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('This is a test repository.')).toBeInTheDocument();
    });

    expect(mockDocumentationApi.getSummary).toHaveBeenCalledWith('test-repo-id');
  });

  it('loads file documentation when file is selected', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('index.ts'));

    await waitFor(() => {
      expect(screen.getByText('Index File')).toBeInTheDocument();
      expect(screen.getByText('This is the main entry point.')).toBeInTheDocument();
    });

    expect(mockDocumentationApi.getFileByPath).toHaveBeenCalledWith('test-repo-id', 'src/index.ts');
  });

  it('toggles sidebar visibility', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    const toggleButton = screen.getAllByRole('button')[0];
    fireEvent.click(toggleButton);

    const sidebar = screen.getByText('Repository Overview').closest('div[class*="w-0"]');
    expect(sidebar).toBeTruthy();
  });

  it('handles search functionality', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'Button' } });

    await waitFor(() => {
      expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
      expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    });
  });

  it('handles download functionality', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        element.click = clickSpy;
      }
      return element;
    });

    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('This is a test repository.')).toBeInTheDocument();
    });

    const downloadButton = screen.getByTitle('Download documentation');
    fireEvent.click(downloadButton);

    expect(clickSpy).toHaveBeenCalled();
    
    // Cleanup
    document.createElement = originalCreateElement;
  });

  it('calls onRegenerate when regenerate button is clicked', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByTitle('Regenerate documentation')).toBeInTheDocument();
    });

    const regenerateButton = screen.getByTitle('Regenerate documentation');
    fireEvent.click(regenerateButton);

    expect(mockOnRegenerate).toHaveBeenCalled();
  });

  it('displays error state when loading fails', async () => {
    mockDocumentationApi.getFiles.mockRejectedValueOnce(new Error('Failed to load'));

    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load documentation files')).toBeInTheDocument();
    });
  });

  it('displays file metadata when file is selected', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('index.ts'));

    await waitFor(() => {
      expect(screen.getByText('Type: TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Language: typescript')).toBeInTheDocument();
      expect(screen.getByText('Lines: 100')).toBeInTheDocument();
    });
  });

  it('navigates back to overview when Repository Overview is clicked', async () => {
    render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('index.ts'));

    await waitFor(() => {
      expect(screen.getByText('Index File')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Repository Overview'));

    await waitFor(() => {
      expect(screen.getByText('This is a test repository.')).toBeInTheDocument();
    });
  });
});
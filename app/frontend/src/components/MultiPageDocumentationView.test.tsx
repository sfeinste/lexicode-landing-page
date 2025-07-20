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

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    // Click to expand the src folder first
    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    // Now we should see index.ts
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
    // Set window width to ensure sidebar starts open
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { container } = render(
      <MultiPageDocumentationView
        repositoryId="test-repo-id"
        repositoryName="test-repo"
        onRegenerate={mockOnRegenerate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    // The toggle button should be the first button with a Menu or X icon
    // Find it by looking for the button in the header area
    const header = container.querySelector('.bg-white.border-b');
    const toggleButton = header?.querySelector('button');
    
    expect(toggleButton).toBeTruthy();
    
    // Find the sidebar container by looking for the element with transition-all class
    let sidebar = document.querySelector('.transition-all');
    expect(sidebar?.className).toMatch(/w-64/);

    // Click to close
    fireEvent.click(toggleButton!);

    // Re-query the sidebar as React might have re-rendered
    await waitFor(() => {
      sidebar = document.querySelector('.transition-all');
      expect(sidebar?.className).toMatch(/w-0/);
    });
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

    // First check that we can see src and README.md
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();

    // Now test search - search for "README"
    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'README' } });

    // After search, we should see README.md but not src folder
    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.queryByText('src')).not.toBeInTheDocument();
    });

    // Clear search to verify everything comes back
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
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
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    // Expand src folder
    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

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
      expect(screen.getByText('Repository Overview')).toBeInTheDocument();
    });

    // Expand src folder
    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

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
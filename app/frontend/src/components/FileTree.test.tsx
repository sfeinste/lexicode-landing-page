import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from './FileTree';
import { FileTreeNode } from '@/types/documentation';

const mockFileTreeNodes: FileTreeNode[] = [
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
          },
          {
            name: 'Modal.tsx',
            path: 'src/components/Modal.tsx',
            type: 'file',
            language: 'typescript',
            hasDocumentation: false
          }
        ]
      }
    ]
  },
  {
    name: 'README.md',
    path: 'README.md',
    type: 'file',
    hasDocumentation: true
  }
];

describe('FileTree', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders root level nodes', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  it('expands folders on click', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is clicked', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const readmeFile = screen.getByText('README.md');
    fireEvent.click(readmeFile);

    expect(mockOnFileSelect).toHaveBeenCalledWith('README.md');
  });

  it('shows nested files when parent folder is expanded', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    const componentsFolder = screen.getByText('components');
    fireEvent.click(componentsFolder);

    expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('Modal.tsx')).toBeInTheDocument();
  });

  it('highlights selected file', () => {
    const { rerender } = render(
      <FileTree 
        nodes={mockFileTreeNodes} 
        onFileSelect={mockOnFileSelect}
        selectedPath="README.md"
      />
    );

    const readmeElement = screen.getByText('README.md').closest('div');
    expect(readmeElement).toHaveClass('bg-blue-50');

    rerender(
      <FileTree 
        nodes={mockFileTreeNodes} 
        onFileSelect={mockOnFileSelect}
        selectedPath="src/index.ts"
      />
    );

    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    const indexElement = screen.getByText('index.ts').closest('div');
    expect(indexElement).toHaveClass('bg-blue-50');
  });

  it('shows "(no docs)" for files without documentation', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    const componentsFolder = screen.getByText('components');
    fireEvent.click(componentsFolder);

    const modalFile = screen.getByText('Modal.tsx').closest('div');
    expect(modalFile).toHaveTextContent('(no docs)');
  });

  it('shows appropriate icons for folders and files', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolder = screen.getByText('src').closest('div');
    expect(srcFolder?.querySelector('svg')).toBeTruthy();

    const readmeFile = screen.getByText('README.md').closest('div');
    expect(readmeFile?.querySelector('svg')).toBeTruthy();
  });

  it('toggles folder expansion with chevron button', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolderDiv = screen.getByText('src').closest('div');
    const chevronButton = srcFolderDiv?.querySelector('button');

    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();

    fireEvent.click(chevronButton!);
    expect(screen.getByText('index.ts')).toBeInTheDocument();

    fireEvent.click(chevronButton!);
    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    const { container } = render(
      <FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />
    );

    const firstElement = container.querySelector('[data-selectable="true"]') as HTMLElement;
    firstElement.focus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).not.toBe(firstElement);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(firstElement);

    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  it('applies correct colors based on file language', () => {
    render(<FileTree nodes={mockFileTreeNodes} onFileSelect={mockOnFileSelect} />);

    const srcFolder = screen.getByText('src');
    fireEvent.click(srcFolder);

    const indexFile = screen.getByText('index.ts').closest('div');
    const fileIcon = indexFile?.querySelector('svg');
    expect(fileIcon).toHaveClass('text-blue-600');
  });
});
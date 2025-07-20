import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTreeSearch } from './FileTreeSearch';

describe('FileTreeSearch', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input with default placeholder', () => {
    render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Search files...');
    expect(input).toBeInTheDocument();
  });

  it('should render search input with custom placeholder', () => {
    const customPlaceholder = 'Find documentation...';
    render(
      <FileTreeSearch 
        value="" 
        onChange={mockOnChange} 
        placeholder={customPlaceholder}
      />
    );
    
    const input = screen.getByPlaceholderText(customPlaceholder);
    expect(input).toBeInTheDocument();
  });

  it('should display current value', () => {
    const value = 'test search';
    render(<FileTreeSearch value={value} onChange={mockOnChange} />);
    
    const input = screen.getByDisplayValue(value);
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Search files...');
    fireEvent.change(input, { target: { value: 'new search' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('new search');
  });

  it('should show clear button when value is present', () => {
    render(<FileTreeSearch value="some text" onChange={mockOnChange} />);
    
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const clearButton = screen.queryByRole('button');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should clear search when clear button is clicked', () => {
    render(<FileTreeSearch value="search text" onChange={mockOnChange} />);
    
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('should have search icon visible', () => {
    const { container } = render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    // Check for Search icon by looking for the svg
    const searchIcon = container.querySelector('svg');
    expect(searchIcon).toBeTruthy();
    expect(searchIcon).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Search files...');
    expect(input).toHaveClass('block', 'w-full', 'pl-10', 'pr-10');
  });

  it('should handle empty string value', () => {
    render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Search files...');
    expect(input).toHaveValue('');
  });

  it('should handle rapid value changes', () => {
    const { rerender } = render(<FileTreeSearch value="" onChange={mockOnChange} />);
    
    const input = screen.getByPlaceholderText('Search files...');
    
    // Simulate rapid typing
    fireEvent.change(input, { target: { value: 'a' } });
    expect(mockOnChange).toHaveBeenCalledWith('a');
    
    rerender(<FileTreeSearch value="a" onChange={mockOnChange} />);
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(mockOnChange).toHaveBeenCalledWith('ab');
    
    rerender(<FileTreeSearch value="ab" onChange={mockOnChange} />);
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(mockOnChange).toHaveBeenCalledWith('abc');
    
    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });
});
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { FileTreeNode } from '@/types/documentation';

interface FileTreeProps {
  nodes: FileTreeNode[];
  onFileSelect: (path: string) => void;
  selectedPath?: string;
}

interface FileNodeProps {
  node: FileTreeNode;
  onFileSelect: (path: string) => void;
  selectedPath?: string;
  level?: number;
}

const FileNode: React.FC<FileNodeProps> = ({ node, onFileSelect, selectedPath, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedPath === node.path;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleSelect = () => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    } else {
      setIsExpanded(!isExpanded);
    }
  };
  
  const getFileIcon = () => {
    if (node.type === 'folder') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      );
    }
    
    // File icon with language-specific colors
    let iconColor = 'text-gray-500';
    if (node.language) {
      const langColors: { [key: string]: string } = {
        typescript: 'text-blue-600',
        javascript: 'text-yellow-600',
        python: 'text-green-600',
        java: 'text-red-600',
        go: 'text-cyan-600',
        rust: 'text-orange-600',
        html: 'text-orange-500',
        css: 'text-blue-500',
        json: 'text-gray-600',
      };
      iconColor = langColors[node.language.toLowerCase()] || 'text-gray-500';
    }
    
    return <File className={`w-4 h-4 ${iconColor}`} />;
  };
  
  return (
    <div>
      <div
        className={`
          flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 rounded
          ${isSelected ? 'bg-blue-50 text-blue-700' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        tabIndex={0}
        data-selectable="true"
      >
        {node.type === 'folder' && (
          <button
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {node.type === 'file' && <div className="w-4 mr-1" />}
        
        <span className="mr-2">{getFileIcon()}</span>
        
        <span className={`text-sm ${node.hasDocumentation === false ? 'opacity-50' : ''}`}>
          {node.name}
        </span>
        
        {node.type === 'file' && node.hasDocumentation === false && (
          <span className="ml-2 text-xs text-gray-400">(no docs)</span>
        )}
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              node={child}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onFileSelect, selectedPath }) => {
  const treeRef = useRef<HTMLDivElement>(null);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!treeRef.current?.contains(document.activeElement)) return;
      
      const allSelectableElements = treeRef.current.querySelectorAll('[data-selectable="true"]');
      const currentIndex = Array.from(allSelectableElements).findIndex(el => el === document.activeElement);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < allSelectableElements.length - 1) {
            (allSelectableElements[currentIndex + 1] as HTMLElement).focus();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            (allSelectableElements[currentIndex - 1] as HTMLElement).focus();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          (document.activeElement as HTMLElement).click();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <div ref={treeRef} className="w-full overflow-x-auto">
      {nodes.map((node, index) => (
        <FileNode
          key={`${node.path}-${index}`}
          node={node}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
};
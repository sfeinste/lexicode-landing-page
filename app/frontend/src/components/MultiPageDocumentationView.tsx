import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Loader, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home
} from 'lucide-react';
import { FileTree } from './FileTree';
import { FileTreeSearch } from './FileTreeSearch';
import { DocumentationSkeleton, FileTreeSkeleton } from './DocumentationSkeleton';
import { DocumentationBreadcrumb } from './DocumentationBreadcrumb';
import { documentationApi, buildFileTree } from '@/services/documentation';
import { 
  DocumentationFileDetail, 
  DocumentationSummary,
  FileTreeNode,
  DocumentationFile
} from '@/types/documentation';

interface MultiPageDocumentationViewProps {
  repositoryId: string;
  repositoryName: string;
  onRegenerate?: () => void;
}

export const MultiPageDocumentationView: React.FC<MultiPageDocumentationViewProps> = ({
  repositoryId,
  repositoryName,
  onRegenerate
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileList, setFileList] = useState<DocumentationFile[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentationFileDetail | DocumentationSummary | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch file list on mount
  useEffect(() => {
    fetchFileList();
  }, [repositoryId]);

  // Load summary by default
  useEffect(() => {
    if (!selectedFile && fileList.length > 0) {
      loadSummary();
    }
  }, [fileList]);

  const fetchFileList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await documentationApi.getFiles(repositoryId);
      setFileList(response.files);
    } catch (err) {
      setError('Failed to load documentation files');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      setIsLoadingDoc(true);
      setSelectedFile(null);
      const summary = await documentationApi.getSummary(repositoryId);
      setCurrentDoc(summary);
    } catch (err) {
      setError('Failed to load documentation summary');
      console.error(err);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const loadFileDocumentation = async (filePath: string) => {
    try {
      setIsLoadingDoc(true);
      setSelectedFile(filePath);
      const doc = await documentationApi.getFileByPath(repositoryId, filePath);
      console.log('Loaded file documentation:', {
        filePath,
        docType: typeof doc.documentation,
        docLength: doc.documentation?.length,
        docPreview: doc.documentation?.substring(0, 200)
      });
      setCurrentDoc(doc);
    } catch (err) {
      setError('Failed to load file documentation');
      console.error(err);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Build file tree from flat file list
  const fileTree = useMemo(() => {
    const filePaths = fileList.map(f => f.file_path);
    const tree = buildFileTree(filePaths);
    
    // Enhance tree nodes with metadata
    const enhanceNode = (node: any): FileTreeNode => {
      if (node.type === 'file') {
        const fileInfo = fileList.find(f => f.file_path === node.path);
        return {
          ...node,
          language: fileInfo?.language,
          hasDocumentation: fileInfo?.has_documentation
        };
      }
      return {
        ...node,
        children: node.children?.map(enhanceNode)
      };
    };
    
    return tree.map(enhanceNode);
  }, [fileList]);

  // Filter file tree based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery) return fileTree;
    
    const filterNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.reduce((acc: FileTreeNode[], node) => {
        const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (node.type === 'file' && matches) {
          acc.push(node);
        } else if (node.type === 'folder' && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            acc.push({
              ...node,
              children: filteredChildren
            });
          }
        }
        
        return acc;
      }, []);
    };
    
    return filterNodes(fileTree);
  }, [fileTree, searchQuery]);

  // Find next/previous file for navigation
  const getAdjacentFile = (direction: 'next' | 'prev') => {
    const allFiles = fileList.map(f => f.file_path).sort();
    const currentIndex = selectedFile ? allFiles.indexOf(selectedFile) : -1;
    
    if (direction === 'next' && currentIndex < allFiles.length - 1) {
      return allFiles[currentIndex + 1];
    } else if (direction === 'prev' && currentIndex > 0) {
      return allFiles[currentIndex - 1];
    }
    return null;
  };

  const handleDownload = () => {
    if (!currentDoc) return;
    
    const content = 'documentation' in currentDoc 
      ? currentDoc.documentation 
      : currentDoc.content;
    
    const fileName = selectedFile 
      ? `${selectedFile.replace(/\//g, '_')}_documentation.md`
      : `${repositoryName}_summary.md`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8 text-primary-400" />
      </div>
    );
  }

  if (error && !fileList.length) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="px-4 py-2 gradient-bg text-white rounded hover:opacity-90 transition-all duration-200"
          >
            Generate Documentation
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'w-56' : 'w-0'} 
        transition-all duration-300 overflow-hidden
        glass-effect border-r border-white/10 flex-shrink-0
        ${isSidebarOpen ? 'absolute lg:relative inset-y-0 left-0 z-40 lg:z-auto' : ''}
      `}>
        <div className="p-3 h-full flex flex-col">
          {isLoading ? (
            <FileTreeSkeleton />
          ) : (
            <>
              <div className="mb-4">
                <FileTreeSearch 
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>
              
              <div className="mb-4">
                <button
                  onClick={loadSummary}
                  className={`
                    w-full text-left px-3 py-2 rounded flex items-center
                    ${!selectedFile ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-white/5'}
                  `}
                >
                  <Home className="w-4 h-4 mr-2" />
                  <span className="text-gray-200">Repository Overview</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <FileTree
                  nodes={filteredTree}
                  onFileSelect={loadFileDocumentation}
                  selectedPath={selectedFile || undefined}
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass-effect border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="mr-4 p-2 hover:bg-white/10 rounded text-gray-300"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="flex-1">
                <DocumentationBreadcrumb
                  repositoryName={repositoryName}
                  filePath={selectedFile || undefined}
                  onNavigate={(path) => {
                    if (path) {
                      loadFileDocumentation(path);
                    } else {
                      loadSummary();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Navigation */}
              {selectedFile && (
                <>
                  <button
                    onClick={() => {
                      const prevFile = getAdjacentFile('prev');
                      if (prevFile) loadFileDocumentation(prevFile);
                    }}
                    disabled={!getAdjacentFile('prev')}
                    className="p-2 hover:bg-white/10 rounded disabled:opacity-50 text-gray-300"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const nextFile = getAdjacentFile('next');
                      if (nextFile) loadFileDocumentation(nextFile);
                    }}
                    disabled={!getAdjacentFile('next')}
                    className="p-2 hover:bg-white/10 rounded disabled:opacity-50 text-gray-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/10 rounded text-gray-300"
                title="Download documentation"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-2 hover:bg-white/10 rounded text-gray-300"
                  title="Regenerate documentation"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* File metadata */}
          {selectedFile && currentDoc && 'file_type' in currentDoc && (
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
              <span>Type: {currentDoc.file_type}</span>
              <span>Language: {currentDoc.language}</span>
              <span>Lines: {currentDoc.lines_of_code}</span>
            </div>
          )}
        </div>

        {/* Documentation content */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {isLoadingDoc ? (
              <DocumentationSkeleton />
            ) : currentDoc ? (
              <div className="prose prose-invert prose-lg max-w-none prose-headings:text-gray-200 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-200 prose-em:text-gray-300 prose-pre:bg-dark-200 prose-pre:border prose-pre:border-white/10 prose-pre:overflow-x-auto prose-code:text-primary-400 prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-300 prose-td:text-gray-300 prose-th:text-gray-200 prose-table:overflow-x-auto prose-table:block">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, ...props }) => (
                    <pre className="bg-dark-200 border border-white/10 p-4 rounded-md overflow-x-auto" {...props} />
                  ),
                  code: ({ node, ...props }: any) => {
                    const inline = node?.position ? node.position.start.line === node.position.end.line : false;
                    return inline 
                      ? <code className="bg-dark-200 border border-white/10 px-1 py-0.5 rounded text-sm text-primary-400" {...props} />
                      : <code className="text-primary-400" {...props} />
                  },
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mb-4 mt-6 text-gray-200" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mb-3 mt-5 text-gray-200" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-bold mb-2 mt-4 text-gray-200" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-relaxed text-gray-300" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside mb-4 space-y-1 text-gray-300" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-300" {...props} />
                  ),
                }}
              >
                {'documentation' in currentDoc ? currentDoc.documentation : currentDoc.content}
              </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p>Select a file to view its documentation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
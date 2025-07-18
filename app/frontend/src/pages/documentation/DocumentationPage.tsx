import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Download, Eye, MoreVertical, Calendar, GitBranch, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';

interface DocumentationItem {
  id: string;
  repository_id: string;
  content: string;
  generation_id: string;
  created_at: string;
  updated_at: string;
  repository?: {
    id: string;
    repo_full_name: string;
    repo_name: string;
    repo_owner: string;
    language: string;
    default_branch: string;
  };
}

export const DocumentationPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentation, setDocumentation] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentation();
  }, []);

  const loadDocumentation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all repositories with documentation
      const response = await api.get('/api/v1/documentation');
      setDocumentation(response.data || []);
    } catch (error) {
      console.error('Failed to load documentation:', error);
      setError('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocumentation = documentation.filter(doc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      doc.repository?.repo_full_name?.toLowerCase().includes(search) ||
      doc.repository?.language?.toLowerCase().includes(search)
    );
  });

  const handleViewDocumentation = (repositoryId: string) => {
    navigate(`/documentation/${repositoryId}`);
  };

  const handleGenerateNew = () => {
    navigate('/repositories');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      return 'Less than an hour ago';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
          <p className="text-gray-600 mt-1">
            View and manage your generated documentation
          </p>
        </div>
        <button 
          onClick={handleGenerateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate Documentation
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search documentation by repository name, language..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Documentation List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Documentation</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={loadDocumentation}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          ) : filteredDocumentation.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No documentation found matching your search' : 'No documentation generated yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try a different search term' : 'Generate documentation for your repositories to get started'}
              </p>
              {!searchTerm && (
                <button 
                  onClick={handleGenerateNew}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Your First Documentation
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocumentation.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-medium text-gray-900 text-lg">
                          {doc.repository?.repo_full_name || 'Unknown Repository'}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {doc.repository?.language && (
                            <span className="flex items-center">
                              <span 
                                className="w-2 h-2 rounded-full mr-1" 
                                style={{ backgroundColor: getLanguageColor(doc.repository.language) }}
                              />
                              {doc.repository.language}
                            </span>
                          )}
                          <span className="flex items-center">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {doc.repository?.default_branch || 'main'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Updated {formatDate(doc.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Generated
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Documentation size: {Math.round(doc.content.length / 1024)}KB
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewDocumentation(doc.repository_id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <a
                        href={`https://github.com/${doc.repository?.repo_full_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get language color
const getLanguageColor = (language: string): string => {
  const colors: Record<string, string> = {
    TypeScript: '#2b7489',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Rust: '#dea584',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#4fc08d',
    React: '#61dafb',
  };
  return colors[language] || '#666666';
};
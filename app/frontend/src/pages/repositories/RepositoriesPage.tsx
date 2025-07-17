import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FolderGit2, Star, GitBranch, Calendar, 
  Lock, Globe, Code2, Package, AlertCircle, FileText,
  Clock, ExternalLink, MoreVertical, RefreshCw, Loader2 
} from 'lucide-react';
import { api } from '@/services/api';
import { RepositoryManager } from '@/components/RepositoryManager';

interface Repository {
  id: string;
  github_repo_id: number;
  repo_full_name: string;
  repo_name: string;
  repo_owner: string;
  is_private: boolean;
  default_branch: string;
  language?: string;
  access_granted_at: string;
  last_accessed_at?: string;
  access_status: 'active' | 'suspended' | 'revoked';
  created_at: string;
  updated_at: string;
  // Extended metadata from GitHub
  description?: string;
  stars_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  size?: number;
  last_push_at?: string;
  topics?: string[];
  license?: string;
  homepage?: string;
  has_wiki?: boolean;
  has_pages?: boolean;
  archived?: boolean;
  disabled?: boolean;
}

export const RepositoriesPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRepositoryManager, setShowRepositoryManager] = useState(false);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await api.get('/api/v1/auth/github-app/repositories');
      const repos = response.data.data.repositories || [];
      
      // Fetch additional metadata for each repository
      const enrichedRepos = await Promise.all(
        repos.map(async (repo: Repository) => {
          try {
            // Here you would fetch additional metadata from GitHub
            // For now, we'll use the existing data
            return {
              ...repo,
              // Simulated data - in production, fetch from GitHub API
              stars_count: Math.floor(Math.random() * 1000),
              forks_count: Math.floor(Math.random() * 100),
              open_issues_count: Math.floor(Math.random() * 50),
              size: Math.floor(Math.random() * 10000),
              last_push_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              topics: ['documentation', 'automation'],
              license: 'MIT',
              has_wiki: true,
              has_pages: false,
              archived: false,
              disabled: false,
            };
          } catch (error) {
            console.error('Failed to enrich repository data:', repo.repo_full_name, error);
            return repo;
          }
        })
      );

      setRepositories(enrichedRepos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setError('Failed to load repositories. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getUniqueLanguages = () => {
    const languages = repositories
      .map(repo => repo.language)
      .filter(Boolean);
    return Array.from(new Set(languages)).sort();
  };

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = !searchTerm || 
      repo.repo_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.language?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLanguage = languageFilter === 'all' || repo.language === languageFilter;
    const matchesStatus = statusFilter === 'all' || repo.access_status === statusFilter;
    
    return matchesSearch && matchesLanguage && matchesStatus;
  });

  const getLanguageColor = (language?: string) => {
    const colors: Record<string, string> = {
      JavaScript: 'bg-yellow-400',
      TypeScript: 'bg-blue-600',
      Python: 'bg-blue-500',
      Java: 'bg-orange-500',
      Go: 'bg-cyan-500',
      Ruby: 'bg-red-500',
      PHP: 'bg-purple-500',
      'C++': 'bg-pink-500',
      C: 'bg-gray-500',
      Swift: 'bg-orange-400',
      Kotlin: 'bg-purple-400',
      Rust: 'bg-orange-600',
    };
    return colors[language || ''] || 'bg-gray-400';
  };

  const formatSize = (sizeInKB?: number) => {
    if (!sizeInKB) return 'Unknown';
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    return `${(sizeInKB / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };

  const handleGenerateDocs = (repoId: string) => {
    navigate(`/documentation/generate/${repoId}`);
  };

  const handleViewDocs = (repoId: string) => {
    navigate(`/documentation/${repoId}`);
  };

  const handleRepositoryManagerClose = () => {
    setShowRepositoryManager(false);
    loadRepositories();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-1">
            Manage and analyze your connected GitHub repositories
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadRepositories(true)}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh repositories"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRepositoryManager(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage Repositories
          </button>
        </div>
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
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Languages</option>
              {getUniqueLanguages().map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Repository List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Connected Repositories ({filteredRepositories.length})
            </h2>
          </div>
          
          {filteredRepositories.length === 0 ? (
            <div className="text-center py-12">
              <FolderGit2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {repositories.length === 0 ? 'No repositories connected' : 'No repositories match your filters'}
              </h3>
              <p className="text-gray-500 mb-6">
                {repositories.length === 0 
                  ? 'Connect your first GitHub repository to start generating documentation'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {repositories.length === 0 && (
                <button
                  onClick={() => setShowRepositoryManager(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Your First Repository
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepositories.map((repo) => (
                <div
                  key={repo.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Repository Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            {repo.is_private ? (
                              <Lock className="h-5 w-5 text-gray-500" />
                            ) : (
                              <Globe className="h-5 w-5 text-gray-500" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900">
                              {repo.repo_full_name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              repo.access_status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : repo.access_status === 'suspended'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {repo.access_status}
                            </span>
                          </div>
                          {repo.description && (
                            <p className="text-sm text-gray-600 mb-3">{repo.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleGenerateDocs(repo.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Generate Docs
                          </button>
                          <button
                            onClick={() => handleViewDocs(repo.id)}
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Repository Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Code2 className="h-4 w-4 text-gray-400" />
                          <span>
                            {repo.language ? (
                              <span className="flex items-center">
                                <span className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)} mr-1`}></span>
                                {repo.language}
                              </span>
                            ) : (
                              'No language'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <GitBranch className="h-4 w-4 text-gray-400" />
                          <span>{repo.default_branch}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Star className="h-4 w-4 text-gray-400" />
                          <span>{repo.stars_count || 0} stars</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>{formatSize(repo.size)}</span>
                        </div>
                      </div>

                      {/* Repository Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Last pushed: {formatDate(repo.last_push_at)}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Connected: {formatDate(repo.access_granted_at)}
                        </div>
                        {repo.last_accessed_at && (
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            Last analyzed: {formatDate(repo.last_accessed_at)}
                          </div>
                        )}
                        {repo.homepage && (
                          <a
                            href={repo.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center hover:text-blue-600"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Website
                          </a>
                        )}
                      </div>

                      {/* Topics */}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {repo.topics.map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repository Manager Modal */}
      {showRepositoryManager && (
        <RepositoryManager onClose={handleRepositoryManagerClose} />
      )}
    </div>
  );
};
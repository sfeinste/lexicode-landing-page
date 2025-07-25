import { useState, useEffect } from 'react';
import { Search, GitBranch, Lock, Globe, Check, X, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  language?: string;
  stargazers_count: number;
  updated_at: string;
}

interface RepositoryAccess {
  id: string;
  github_repo_id: number;
  repo_full_name: string;
  access_status: 'active' | 'suspended' | 'revoked';
}

interface RepositoryManagerProps {
  onClose: () => void;
}

export const RepositoryManager = ({ onClose }: RepositoryManagerProps) => {
  const [availableRepos, setAvailableRepos] = useState<Repository[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<RepositoryAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load available repositories from GitHub installations
      const [availableResponse, connectedResponse] = await Promise.all([
        api.get('/api/v1/auth/github-app/installations'),
        api.get('/api/v1/auth/github-app/repositories'),
      ]);

      // Get repositories from all installations
      const installations = availableResponse.data.data.installations;
      let allRepos: Repository[] = [];

      for (const installation of installations) {
        try {
          const repoResponse = await api.get(
            `/api/v1/auth/github-app/installations/${installation.github_installation_id}/repositories`
          );
          allRepos = [...allRepos, ...repoResponse.data.data.repositories];
        } catch (error) {
          console.error('Failed to load repos for installation:', installation.id, error);
        }
      }

      setAvailableRepos(allRepos);
      setConnectedRepos(connectedResponse.data.data.repositories);

      // Set initially selected repos (ones that are already connected)
      const connectedRepoIds = new Set<number>(
        connectedResponse.data.data.repositories
          .filter((repo: RepositoryAccess) => repo.access_status === 'active')
          .map((repo: RepositoryAccess) => repo.github_repo_id)
      );
      setSelectedRepos(connectedRepoIds);

    } catch (error) {
      console.error('Failed to load repositories:', error);
      setError('Failed to load repositories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoToggle = (repoId: number) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Get currently connected repo IDs
      const currentlyConnected = new Set(
        connectedRepos
          .filter(repo => repo.access_status === 'active')
          .map(repo => repo.github_repo_id)
      );

      // Find repos to add and remove
      const toAdd = Array.from(selectedRepos).filter(id => !currentlyConnected.has(id));
      const toRemove = Array.from(currentlyConnected).filter(id => !selectedRepos.has(id));

      // Grant access to new repositories
      if (toAdd.length > 0) {
        const reposToAdd = availableRepos
          .filter(repo => toAdd.includes(repo.id))
          .map(repo => ({
            githubRepoId: repo.id,
            installationId: 'auto', // Backend will determine the correct installation
          }));

        await api.post('/api/v1/auth/github-app/repositories/access', {
          repositories: reposToAdd,
        });
      }

      // Revoke access from removed repositories
      for (const repoId of toRemove) {
        const repoAccess = connectedRepos.find(repo => repo.github_repo_id === repoId);
        if (repoAccess) {
          await api.delete(`/api/v1/auth/github-app/repositories/${repoAccess.id}/access`);
        }
      }

      // Reload repositories to get updated state
      await loadRepositories();
      
      // Close the modal after successful save
      onClose();
      
    } catch (error) {
      console.error('Failed to save repository access:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRepos = availableRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  const hasChanges = () => {
    const currentlyConnected = new Set(
      connectedRepos
        .filter(repo => repo.access_status === 'active')
        .map(repo => repo.github_repo_id)
    );
    
    return selectedRepos.size !== currentlyConnected.size ||
           Array.from(selectedRepos).some(id => !currentlyConnected.has(id));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-effect rounded-lg p-8 max-w-md w-full mx-4 border border-white/10">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
            <span className="text-lg text-gray-200">Loading repositories...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-effect rounded-lg border border-white/10 max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-200">Manage Repository Access</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Select which repositories Lexicode can access for documentation generation
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-200 border border-white/10 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredRepos.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 'No repositories match your search' : 'No repositories available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedRepos.has(repo.id)
                      ? 'border-primary-500/50 bg-primary-500/10'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                  onClick={() => handleRepoToggle(repo.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {repo.private ? (
                          <Lock className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-gray-500" />
                        )}
                        <h3 className="font-medium text-gray-200 truncate">
                          {repo.full_name}
                        </h3>
                        {selectedRepos.has(repo.id) && (
                          <Check className="h-4 w-4 text-primary-400" />
                        )}
                      </div>
                      
                      {repo.description && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        {repo.language && (
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-primary-400 mr-1"></span>
                            {repo.language}
                          </span>
                        )}
                        <span>⭐ {repo.stargazers_count}</span>
                        <span>
                          Updated {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedRepos.size} {selectedRepos.size === 1 ? 'repository' : 'repositories'} selected
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 glass-effect border border-white/10 rounded-md glass-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className="px-4 py-2 text-sm font-medium text-white gradient-bg border border-transparent rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
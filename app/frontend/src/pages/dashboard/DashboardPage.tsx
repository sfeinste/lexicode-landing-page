import { useState, useEffect } from 'react';
import { FolderGit2, FileText, Clock, TrendingUp } from 'lucide-react';
import { GitHubIntegration } from '@/components/GitHubIntegration';
import { RepositoryManager } from '@/components/RepositoryManager';
import { useGitHub } from '@/hooks/useGitHub';

export const DashboardPage = () => {
  const { getRepositoryCount, checkInstallationStatus } = useGitHub();
  const [repositoryCount, setRepositoryCount] = useState(0);
  const [hasGitHubConnection, setHasGitHubConnection] = useState(false);
  const [showGitHubIntegration, setShowGitHubIntegration] = useState(false);
  const [showRepositoryManager, setShowRepositoryManager] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const hasConnection = await checkInstallationStatus();
      setHasGitHubConnection(hasConnection);
      
      if (hasConnection) {
        const count = await getRepositoryCount();
        setRepositoryCount(count);
      }
    };

    loadStats();
  }, [checkInstallationStatus, getRepositoryCount]);

  const handleConnectRepository = () => {
    if (hasGitHubConnection) {
      setShowRepositoryManager(true);
    } else {
      setShowGitHubIntegration(true);
    }
  };

  const handleInstallationComplete = async () => {
    setShowGitHubIntegration(false);
    const count = await getRepositoryCount();
    setRepositoryCount(count);
    setHasGitHubConnection(true);
  };

  const handleRepositoryManagerClose = async () => {
    setShowRepositoryManager(false);
    // Refresh repository count after changes
    const count = await getRepositoryCount();
    setRepositoryCount(count);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-effect rounded-lg p-6 animate-fade-in">
        <h1 className="text-2xl font-bold gradient-text mb-2">Welcome back!</h1>
        <p className="text-gray-400">
          Here's what's happening with your repositories and documentation.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FolderGit2 className="h-8 w-8 text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Connected Repositories</p>
              <p className="text-2xl font-semibold text-gray-200">{repositoryCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Documentation Projects</p>
              <p className="text-2xl font-semibold text-gray-200">0</p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Generations This Month</p>
              <p className="text-2xl font-semibold text-gray-200">0</p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Coverage Score</p>
              <p className="text-2xl font-semibold text-gray-200">0%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-effect rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Recent Activity</h2>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {hasGitHubConnection ? 'No recent activity' : 'No repositories connected'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {hasGitHubConnection 
                ? 'Repository activity will appear here'
                : 'Connect your first repository to get started'
              }
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Integration */}
      {showGitHubIntegration && (
        <div className="glass-effect rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">GitHub Integration</h2>
          <GitHubIntegration onInstallationComplete={handleInstallationComplete} />
        </div>
      )}

      {/* Repository Manager Modal */}
      {showRepositoryManager && (
        <RepositoryManager onClose={handleRepositoryManagerClose} />
      )}

      {/* Quick Actions */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleConnectRepository}
            className="p-4 glass-effect border border-white/10 rounded-lg glass-hover text-left transition-all duration-200"
          >
            <FolderGit2 className="h-6 w-6 text-primary-400 mb-2" />
            <h3 className="font-medium text-gray-200">
              {hasGitHubConnection ? 'Manage Repositories' : 'Connect Repository'}
            </h3>
            <p className="text-sm text-gray-400">
              {hasGitHubConnection 
                ? 'View and manage your connected GitHub repositories'
                : 'Link your GitHub repository to start generating documentation'
              }
            </p>
          </button>
          <button 
            className={`p-4 glass-effect border border-white/10 rounded-lg text-left transition-all duration-200 ${
              hasGitHubConnection 
                ? 'glass-hover cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            disabled={!hasGitHubConnection}
          >
            <FileText className="h-6 w-6 text-green-400 mb-2" />
            <h3 className="font-medium text-gray-200">Generate Documentation</h3>
            <p className="text-sm text-gray-400">
              {hasGitHubConnection
                ? 'Create comprehensive documentation for your codebase'
                : 'Connect a repository first to enable documentation generation'
              }
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
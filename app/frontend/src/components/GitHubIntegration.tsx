import { useState, useEffect } from 'react';
import { Github, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useGitHub } from '@/hooks/useGitHub';

interface GitHubIntegrationProps {
  onInstallationComplete?: () => void;
}

export const GitHubIntegration = ({ onInstallationComplete }: GitHubIntegrationProps) => {
  const {
    installations,
    repositories,
    isLoading,
    error,
    initiateInstallation,
    checkInstallationStatus,
    getRepositoryCount,
    clearError,
  } = useGitHub();

  const [hasInstallations, setHasInstallations] = useState(false);
  const [repositoryCount, setRepositoryCount] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      const hasInstalls = await checkInstallationStatus();
      setHasInstallations(hasInstalls);
      
      if (hasInstalls) {
        const count = await getRepositoryCount();
        setRepositoryCount(count);
        onInstallationComplete?.();
      }
    };

    checkStatus();
  }, [installations, repositories, onInstallationComplete, checkInstallationStatus, getRepositoryCount]);

  const handleConnectGitHub = async () => {
    clearError();
    await initiateInstallation();
  };

  if (hasInstallations) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-medium text-green-900">GitHub Connected</h3>
            <p className="text-sm text-green-700">
              {repositoryCount} {repositoryCount === 1 ? 'repository' : 'repositories'} accessible
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
            Active
          </span>
          <Github className="h-5 w-5 text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-900 rounded-lg">
            <Github className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Connect GitHub</h3>
            <p className="text-sm text-gray-600">
              Connect your GitHub account to access your repositories
            </p>
          </div>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Secure access to your repositories</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Automatic documentation generation</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Real-time updates via webhooks</span>
          </div>
        </div>
        
        <button
          onClick={handleConnectGitHub}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Github className="h-4 w-4" />
              <span>Connect with GitHub</span>
              <ExternalLink className="h-4 w-4" />
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          This will open GitHub in a new window to authorize the Lexicode app
        </p>
      </div>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { githubService, GitHubInstallation, GitHubRepository } from '@/services/github';

export const useGitHub = () => {
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateInstallation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const installationUrl = await githubService.getInstallationUrl();
      // Open the GitHub App installation page in a new window
      window.open(installationUrl, '_blank', 'width=800,height=600');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate GitHub installation');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstallations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await githubService.getInstallations();
      setInstallations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub installations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepositories = async (filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await githubService.getRepositories(filters);
      setRepositories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const checkInstallationStatus = async (): Promise<boolean> => {
    try {
      return await githubService.hasInstallations();
    } catch (err) {
      return false;
    }
  };

  const getRepositoryCount = async (): Promise<number> => {
    try {
      return await githubService.getRepositoryCount();
    } catch (err) {
      return 0;
    }
  };

  // Auto-load installations and repositories when hook is used
  useEffect(() => {
    loadInstallations();
    loadRepositories();
  }, []);

  return {
    installations,
    repositories,
    isLoading,
    error,
    initiateInstallation,
    loadInstallations,
    loadRepositories,
    checkInstallationStatus,
    getRepositoryCount,
    clearError: () => setError(null),
  };
};
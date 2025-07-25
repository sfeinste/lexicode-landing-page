import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { api } from '@/services/api';
import { MultiPageDocumentationView } from '@/components/MultiPageDocumentationView';
import { documentationApi } from '@/services/documentation';
import { DocumentationProgressModal } from '@/components/documentation/DocumentationProgressModal';
import { JobProgress } from '@/types/documentation';

export const DocumentationViewPage = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const [loading, setLoading] = useState(true);
  const [repositoryName, setRepositoryName] = useState<string>('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);

  useEffect(() => {
    if (repositoryId) {
      checkFileDocumentation();
      loadRepositoryInfo();
    }
  }, [repositoryId]);

  const checkFileDocumentation = async () => {
    try {
      setLoading(true);
      await documentationApi.getFiles(repositoryId!);
    } catch (error) {
      console.error('Failed to check file documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepositoryInfo = async () => {
    try {
      const response = await api.get(`/api/v1/repositories/${repositoryId}`);
      setRepositoryName(response.data.repo_full_name || 'Repository');
    } catch (error) {
      console.error('Failed to load repository info:', error);
    }
  };

  const handleRegenerate = async () => {
    try {
      setShowProgressModal(true);
      
      // Always generate file-based documentation
      const jobResponse = await documentationApi.generateFiles(repositoryId!);
      
      // Poll for progress
      await documentationApi.pollJobProgress(
        jobResponse.jobId,
        (progress) => {
          setJobProgress(progress);
        }
      );
      
      // Reload file documentation after completion
      await checkFileDocumentation();
      
      // Close modal after a short delay on success
      setTimeout(() => {
        setShowProgressModal(false);
        setJobProgress(null);
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to regenerate documentation:', error);
      setJobProgress({
        jobId: '',
        status: 'failed',
        error: error.message || 'Failed to regenerate documentation'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Always show multi-page view */}
      <div className="glass-effect rounded-lg border border-white/10 h-[calc(100vh-200px)]">
        <MultiPageDocumentationView
          repositoryId={repositoryId!}
          repositoryName={repositoryName}
          onRegenerate={handleRegenerate}
        />
      </div>

      {/* Progress Modal */}
      <DocumentationProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setJobProgress(null);
        }}
        progress={jobProgress}
        repositoryName={repositoryName}
      />
    </div>
  );
};
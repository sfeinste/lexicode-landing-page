import { X } from 'lucide-react';
import { JobProgress } from '@/types/documentation';

interface DocumentationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: JobProgress | null;
  repositoryName: string;
}

export function DocumentationProgressModal({
  isOpen,
  onClose,
  progress,
  repositoryName
}: DocumentationProgressModalProps) {
  if (!isOpen) return null;

  const getProgressPercentage = () => {
    if (!progress || progress.status === 'pending') return 0;
    if (progress.status === 'completed') return 100;
    if (progress.status === 'failed') return 0;
    if (progress.currentFile && progress.totalFiles) {
      return Math.round((progress.currentFile / progress.totalFiles) * 100);
    }
    return 0;
  };

  const getStatusColor = () => {
    switch (progress?.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (progress?.status) {
      case 'pending':
        return 'Waiting in queue...';
      case 'processing':
        return progress.totalFiles 
          ? `Processing files (${progress.currentFile || 0}/${progress.totalFiles})`
          : 'Processing...';
      case 'completed':
        return 'Documentation generated successfully!';
      case 'failed':
        return progress.error || 'Documentation generation failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-effect rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">
            Generating Documentation
          </h3>
          {progress?.status === 'completed' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">
            Repository: <span className="font-medium text-gray-200">{repositoryName}</span>
          </p>
          <p className="text-sm text-gray-400">
            Status: <span className="font-medium text-gray-200">{getStatusText()}</span>
          </p>
        </div>

        <div className="mb-4">
          <div className="bg-dark-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          {progress?.status === 'processing' && progress.totalFiles && (
            <p className="text-xs text-gray-500 mt-1 text-center">
              {getProgressPercentage()}% complete
            </p>
          )}
        </div>

        {progress?.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 mb-4">
            <p className="text-sm text-red-400">
              {progress.error || 'An error occurred during documentation generation'}
            </p>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-md p-3 mb-4">
            <p className="text-sm text-green-400">
              Documentation has been generated successfully!
            </p>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 gradient-bg text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
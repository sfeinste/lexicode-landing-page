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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generating Documentation
          </h3>
          {progress?.status === 'completed' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Repository: <span className="font-medium">{repositoryName}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Status: <span className="font-medium">{getStatusText()}</span>
          </p>
        </div>

        <div className="mb-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          {progress?.status === 'processing' && progress.totalFiles && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {getProgressPercentage()}% complete
            </p>
          )}
        </div>

        {progress?.status === 'failed' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              {progress.error || 'An error occurred during documentation generation'}
            </p>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              Documentation has been generated successfully!
            </p>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { CheckCircle, Clock, FileText, Loader } from 'lucide-react';

interface GenerationProgressProps {
  totalFiles: number;
  processedFiles: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTimeRemaining?: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  totalFiles,
  processedFiles,
  status,
  estimatedTimeRemaining
}) => {
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Generating Documentation</h3>
        {status === 'processing' && (
          <Loader className="w-5 h-5 animate-spin text-blue-600" />
        )}
        {status === 'completed' && (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
      </div>
      
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* File count */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <FileText className="w-4 h-4 mr-2" />
            <span>Files processed</span>
          </div>
          <span className="font-medium">{processedFiles} / {totalFiles}</span>
        </div>
        
        {/* Time remaining */}
        {estimatedTimeRemaining && status === 'processing' && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>Estimated time remaining</span>
            </div>
            <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
          </div>
        )}
        
        {/* Status message */}
        <div className="text-center text-sm text-gray-600 mt-4">
          {status === 'pending' && 'Preparing to generate documentation...'}
          {status === 'processing' && 'Analyzing code and generating documentation...'}
          {status === 'completed' && 'Documentation generation completed!'}
          {status === 'failed' && 'Documentation generation failed. Please try again.'}
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
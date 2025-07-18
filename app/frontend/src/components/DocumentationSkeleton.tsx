import React from 'react';

export const DocumentationSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        
        <div className="pt-4">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>

        <div className="pt-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FileTreeSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-2">
      {/* Search box skeleton */}
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      
      {/* Repository overview button skeleton */}
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      
      {/* File tree skeleton */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center space-x-2" style={{ paddingLeft: `${(i % 3) * 16 + 8}px` }}>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
        </div>
      ))}
    </div>
  );
};
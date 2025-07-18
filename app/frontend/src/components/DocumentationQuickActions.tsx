import React, { useState } from 'react';
import { 
  Download, 
  RefreshCw, 
  Search, 
  Copy, 
  ExternalLink,
  Check,
  Share2,
  FileDown
} from 'lucide-react';

interface DocumentationQuickActionsProps {
  onDownload: () => void;
  onRegenerate: () => void;
  onSearch?: () => void;
  onShare?: () => void;
  onExportAll?: () => void;
  documentationUrl?: string;
  isRegenerating?: boolean;
}

export const DocumentationQuickActions: React.FC<DocumentationQuickActionsProps> = ({
  onDownload,
  onRegenerate,
  onSearch,
  onShare,
  onExportAll,
  documentationUrl,
  isRegenerating = false
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const handleCopyUrl = async () => {
    if (documentationUrl) {
      await navigator.clipboard.writeText(documentationUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      {/* Search */}
      {onSearch && (
        <button
          onClick={onSearch}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Search documentation"
        >
          <Search className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      {/* Download current */}
      <button
        onClick={onDownload}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        title="Download current documentation"
      >
        <Download className="w-5 h-5 text-gray-600" />
      </button>
      
      {/* Export all */}
      {onExportAll && (
        <button
          onClick={onExportAll}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Export all documentation"
        >
          <FileDown className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      {/* Copy URL */}
      {documentationUrl && (
        <button
          onClick={handleCopyUrl}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Copy documentation URL"
        >
          {copiedUrl ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Copy className="w-5 h-5 text-gray-600" />
          )}
        </button>
      )}
      
      {/* Share */}
      {onShare && (
        <button
          onClick={onShare}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Share documentation"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      {/* Open in new window */}
      {documentationUrl && (
        <a
          href={documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Open in new window"
        >
          <ExternalLink className="w-5 h-5 text-gray-600" />
        </a>
      )}
      
      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />
      
      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        disabled={isRegenerating}
        className={`
          p-2 rounded-md transition-colors
          ${isRegenerating 
            ? 'bg-gray-100 cursor-not-allowed' 
            : 'hover:bg-gray-100'
          }
        `}
        title="Regenerate documentation"
      >
        <RefreshCw className={`
          w-5 h-5 text-gray-600
          ${isRegenerating ? 'animate-spin' : ''}
        `} />
      </button>
    </div>
  );
};
import React from 'react';
import { ChevronRight, Home, FileText } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface DocumentationBreadcrumbProps {
  repositoryName: string;
  filePath?: string;
  onNavigate?: (path?: string) => void;
}

export const DocumentationBreadcrumb: React.FC<DocumentationBreadcrumbProps> = ({
  repositoryName,
  filePath,
  onNavigate
}) => {
  const items: BreadcrumbItem[] = [
    {
      label: repositoryName,
      icon: <Home className="w-4 h-4" />
    }
  ];
  
  if (filePath) {
    const pathParts = filePath.split('/');
    pathParts.forEach((part, index) => {
      const isLast = index === pathParts.length - 1;
      items.push({
        label: part,
        path: pathParts.slice(0, index + 1).join('/'),
        icon: isLast ? <FileText className="w-4 h-4" /> : undefined
      });
    });
  }
  
  return (
    <nav className="flex items-center space-x-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <button
            onClick={() => onNavigate?.(index === 0 ? undefined : item.path)}
            className={`
              flex items-center space-x-1 px-2 py-1 rounded
              ${index === items.length - 1 
                ? 'text-gray-200 font-medium cursor-default' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }
            `}
            disabled={index === items.length - 1}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
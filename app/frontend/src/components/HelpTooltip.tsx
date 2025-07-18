import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  position = 'bottom'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };
  
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute z-50 ${positionClasses[position]} w-72`}>
            <div className="bg-gray-900 text-white rounded-lg shadow-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{title}</h4>
                <button
                  onClick={() => setIsOpen(false)}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-300">
                {content}
              </div>
              {/* Arrow */}
              <div className={`
                absolute w-0 h-0 border-8 border-transparent
                ${position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900' : ''}
                ${position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900' : ''}
                ${position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900' : ''}
                ${position === 'right' ? 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900' : ''}
              `} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const HelpSection: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
      <h3 className="font-semibold text-blue-900 mb-2">Quick Tips</h3>
      <ul className="space-y-1 text-blue-800">
        <li>• Use arrow keys to navigate the file tree</li>
        <li>• Press Enter or Space to select a file</li>
        <li>• Search for files using the search box</li>
        <li>• Click the home icon to view the repository overview</li>
        <li>• Download individual files or the entire documentation</li>
      </ul>
    </div>
  );
};
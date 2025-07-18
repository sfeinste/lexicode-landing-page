import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, RefreshCw, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, apiLongRunning } from '@/services/api';

interface Documentation {
  id: string;
  repository_id: string;
  content: string;
  generation_id: string;
  created_at: string;
  updated_at: string;
}

export const DocumentationViewPage = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (repositoryId) {
      loadDocumentation();
    }
  }, [repositoryId]);

  const loadDocumentation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/v1/documentation/${repositoryId}`);
      setDocumentation(response.data);
    } catch (error: any) {
      console.error('Failed to load documentation:', error);
      if (error.response?.status === 404) {
        setError('No documentation found for this repository. Click "Generate Documentation" to create it.');
      } else {
        setError('Failed to load documentation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      setError(null);
      
      await apiLongRunning.post(`/api/v1/documentation/generate/${repositoryId}`);
      
      // Wait a bit then reload
      setTimeout(() => {
        loadDocumentation();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to regenerate documentation:', error);
      setError('Failed to regenerate documentation. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (documentation) {
      const blob = new Blob([documentation.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentation-${repositoryId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/repositories')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Repository Documentation</h1>
            {documentation && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(documentation.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              regenerating
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!documentation}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {error ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">{error}</p>
            {!documentation && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? 'Generating...' : 'Generate Documentation'}
              </button>
            )}
          </div>
        ) : documentation ? (
          <div className="p-8">
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {documentation.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">No documentation found for this repository.</p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {regenerating ? 'Generating...' : 'Generate Documentation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
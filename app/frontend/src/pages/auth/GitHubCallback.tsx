import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/services/api';

export const GitHubCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing GitHub authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const installation_id = searchParams.get('installation_id');
        const error = searchParams.get('error');
        const error_description = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setMessage(error_description || `GitHub authorization error: ${error}`);
          return;
        }

        // Check for required parameters
        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from GitHub');
          return;
        }

        console.log('GitHub OAuth callback received:', {
          code: code ? '***' : null,
          state,
          installation_id,
        });

        // Exchange the authorization code with our backend
        setMessage('Exchanging authorization code...');
        
        const response = await api.post('/api/v1/auth/github-app/oauth/exchange', {
          code,
          state,
          installation_id,
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to complete authorization');
        }

        setStatus('success');
        setMessage('GitHub authorization successful! Redirecting to dashboard...');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard?github_connected=true');
        }, 2000);

      } catch (error) {
        console.error('Error handling GitHub callback:', error);
        setStatus('error');
        setMessage('Failed to process GitHub authorization');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            GitHub Integration
          </h2>
          <p className={`text-sm ${getStatusColor()}`}>
            {message}
          </p>
          
          {status === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
'use client';

import { handleOAuthCallback } from '@/lib/substrate-api';
import { CheckCircle, WarningCircle } from 'iconoir-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [substrateId, setSubstrateId] = useState<string | null>(null);

  // Get the app ID from environment
  const appId = process.env.NEXT_PUBLIC_APP_ID;

  const getWorldAppUrl = (path: string) => {
    // World App deep link format
    const encodedPath = encodeURIComponent(path);
    return `https://worldcoin.org/mini-app?app_id=${appId}&path=${encodedPath}`;
  };

  const redirectToWorldApp = (path: string) => {
    const worldAppUrl = getWorldAppUrl(path);
    window.location.href = worldAppUrl;
  };

  const processCallback = useCallback(async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setError(searchParams.get('error_description') || 'OAuth was denied');
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setError('Missing OAuth parameters');
      return;
    }

    // Parse state to get substrate_id and platform
    // State format: platform:substrate_id:random_nonce
    const stateParts = state.split(':');
    if (stateParts.length < 2) {
      setStatus('error');
      setError('Invalid OAuth state');
      return;
    }

    const platform = stateParts[0] as 'twitter';
    const substId = stateParts[1];
    setSubstrateId(substId);

    const result = await handleOAuthCallback(platform, code, state);

    if (result.error) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setStatus('success');

    // Redirect back to World App after a short delay
    setTimeout(() => {
      redirectToWorldApp(`/create?edit=${substId}`);
    }, 1500);
  }, [searchParams]);

  useEffect(() => {
    processCallback();
  }, [processCallback]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {status === 'loading' && (
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">
            Connecting your account...
          </h2>
          <p className="text-gray-600 mt-2">Please wait</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Account Connected!
          </h2>
          <p className="text-gray-600 mt-2">Returning to World App...</p>
          <button
            onClick={() => redirectToWorldApp(`/create?edit=${substrateId}`)}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium"
          >
            Return to App
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WarningCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Connection Failed
          </h2>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => redirectToWorldApp(substrateId ? `/create?edit=${substrateId}` : '/create')}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium"
          >
            Return to App
          </button>
        </div>
      )}
    </div>
  );
}

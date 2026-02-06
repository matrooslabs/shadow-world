'use client';

import { getOAuthUrl, SocialAccount } from '@/lib/substrate-api';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { CheckCircle, Link as LinkIcon, Xmark } from 'iconoir-react';
import { useState } from 'react';

interface SocialLinkerProps {
  substrateId: string;
  connectedAccounts: SocialAccount[];
  onAccountLinked?: (account: SocialAccount) => void;
}

export function SocialLinker({
  substrateId,
  connectedAccounts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAccountLinked,
}: SocialLinkerProps) {
  // Note: onAccountLinked is reserved for future use when we implement
  // real-time account linking notifications via the OAuth callback page
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTwitterConnected = connectedAccounts.some(
    (acc) => acc.platform === 'twitter'
  );

  const handleLinkTwitter = async () => {
    setIsLinking('twitter');
    setError(null);

    const result = await getOAuthUrl('twitter', substrateId);

    if (result.error) {
      setError(result.error);
      setIsLinking(null);
      return;
    }

    if (result.data?.url) {
      // Open OAuth URL in a new window
      // The callback will handle the rest
      window.location.href = result.data.url;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Social Accounts
        </h3>
        <p className="text-sm text-gray-600">
          Link your social accounts so we can analyze your personality and
          communication style.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <Xmark className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Twitter */}
      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Twitter / X</p>
              {isTwitterConnected ? (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Connected as @
                  {connectedAccounts.find((a) => a.platform === 'twitter')?.username}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not connected</p>
              )}
            </div>
          </div>

          {!isTwitterConnected && (
            <Button
              onClick={handleLinkTwitter}
              disabled={isLinking === 'twitter'}
              size="sm"
              variant="secondary"
            >
              {isLinking === 'twitter' ? (
                'Connecting...'
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Info about what we analyze */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">What we analyze</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Recent posts and tweets</li>
          <li>• Communication patterns and tone</li>
          <li>• Topics and interests</li>
          <li>• Writing style and vocabulary</li>
        </ul>
        <p className="text-xs text-blue-700 mt-3">
          We never post on your behalf or share your data with third parties.
        </p>
      </div>
    </div>
  );
}

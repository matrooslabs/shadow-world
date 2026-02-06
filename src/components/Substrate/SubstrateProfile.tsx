'use client';

import { Substrate } from '@/lib/substrate-api';
import { Button, CircularIcon } from '@worldcoin/mini-apps-ui-kit-react';
import { ChatBubble, User, BadgeCheck } from 'iconoir-react';
import Link from 'next/link';

interface SubstrateProfileProps {
  substrate: Substrate;
  isVerified: boolean;
  isOwner: boolean;
}

export function SubstrateProfile({
  substrate,
  isVerified,
  isOwner,
}: SubstrateProfileProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <CircularIcon className="w-24 h-24 bg-gray-100 mb-4">
        {substrate.avatar_url ? (
          <img
            src={substrate.avatar_url}
            alt={substrate.display_name}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <User className="w-12 h-12 text-gray-400" />
        )}
      </CircularIcon>

      {/* Name */}
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        {substrate.display_name}
      </h1>

      {/* Bio */}
      {substrate.bio && (
        <p className="text-gray-600 text-center mt-2 max-w-sm">{substrate.bio}</p>
      )}

      {/* Verification Status */}
      <div className="flex items-center gap-6 mt-4">
        {isVerified ? (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <BadgeCheck className="w-4 h-4" />
            <span>Verified Agent</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <BadgeCheck className="w-4 h-4" />
            <span>Not Verified</span>
          </div>
        )}
      </div>

      {/* Personality Profile */}
      {substrate.personality_profile && substrate.status === 'ready' && (
        <div className="w-full mt-6 bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Personality</h2>

          {substrate.personality_profile.summary && (
            <p className="text-sm text-gray-600 mb-4">
              {substrate.personality_profile.summary}
            </p>
          )}

          {substrate.personality_profile.traits.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Traits
              </h3>
              <div className="flex flex-wrap gap-2">
                {substrate.personality_profile.traits.map((trait, i) => (
                  <span
                    key={i}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {substrate.personality_profile.interests.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {substrate.personality_profile.interests.map((interest, i) => (
                  <span
                    key={i}
                    className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {substrate.personality_profile.communication_style && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Communication Style
              </h3>
              <p className="text-sm text-gray-600">
                {substrate.personality_profile.communication_style}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status indicator for non-ready substrates */}
      {substrate.status !== 'ready' && (
        <div className="w-full mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          {substrate.status === 'pending' && (
            <p className="text-yellow-800">
              Waiting for social accounts to be connected
            </p>
          )}
          {substrate.status === 'extracting' && (
            <p className="text-yellow-800">Analyzing personality...</p>
          )}
          {substrate.status === 'failed' && (
            <p className="text-red-800">
              Failed to extract personality. Please try again.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="w-full mt-6 space-y-3">
        {substrate.status === 'ready' && (
          <Link href={`/substrate/${substrate.id}/chat`} className="block">
            <Button className="w-full" size="lg">
              <ChatBubble className="w-5 h-5 mr-2" />
              Chat with {substrate.display_name}
            </Button>
          </Link>
        )}

        {isOwner && substrate.status === 'pending' && (
          <Link href={`/create?edit=${substrate.id}`} className="block">
            <Button className="w-full" size="lg" variant="secondary">
              Continue Setup
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

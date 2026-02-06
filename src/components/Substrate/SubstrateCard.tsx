'use client';

import { Substrate } from '@/lib/substrate-api';
import { CircularIcon } from '@worldcoin/mini-apps-ui-kit-react';
import { BadgeCheck, CheckCircle, User } from 'iconoir-react';
import Link from 'next/link';

interface SubstrateCardProps {
  substrate: Substrate & { is_verified?: boolean };
}

export function SubstrateCard({ substrate }: SubstrateCardProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    extracting: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <Link href={`/substrate/${substrate.id}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <CircularIcon className="w-12 h-12 bg-gray-100 flex-shrink-0">
            {substrate.avatar_url ? (
              <img
                src={substrate.avatar_url}
                alt={substrate.display_name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
          </CircularIcon>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {substrate.display_name}
              </h3>
              {substrate.status === 'ready' && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </div>

            {substrate.bio && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                {substrate.bio}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusColors[substrate.status]}`}
              >
                {substrate.status}
              </span>

              {substrate.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

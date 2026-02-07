'use client';

import { Substrate } from '@/lib/substrate-api';
import { BadgeCheck, ChatBubble, User } from 'iconoir-react';
import Link from 'next/link';

interface ShadowProfileCardProps {
  substrate: Substrate & { is_verified?: boolean };
}

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-600',
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function ShadowProfileCard({ substrate }: ShadowProfileCardProps) {
  const traits = substrate.personality_profile?.traits?.slice(0, 2) ?? [];

  return (
    <Link href={`/substrate/${substrate.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
        {/* Image area */}
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {substrate.avatar_url ? (
            <img
              src={substrate.avatar_url}
              alt={substrate.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${getGradient(substrate.id)} flex items-center justify-center`}
            >
              <User className="w-16 h-16 text-white/40" />
            </div>
          )}

          {/* Verification badge */}
          {substrate.is_verified && (
            <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          )}

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            <h3 className="text-white font-semibold text-sm truncate">
              {substrate.display_name}
            </h3>
          </div>
        </div>

        {/* Info section */}
        <div className="p-3">
          {substrate.bio && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {substrate.bio}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 min-w-0">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
                >
                  {trait}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 text-blue-600 flex-shrink-0">
              <ChatBubble className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Chat</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

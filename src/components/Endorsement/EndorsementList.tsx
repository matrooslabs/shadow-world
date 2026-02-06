'use client';

import { CircularIcon } from '@worldcoin/mini-apps-ui-kit-react';
import { EyeSolid, User } from 'iconoir-react';

interface Endorsement {
  id: string;
  verificationLevel: string;
  createdAt: string;
  endorser: {
    walletAddress: string;
    username: string | null;
  };
}

interface EndorsementStats {
  total: number;
  orb: number;
  device: number;
}

interface EndorsementListProps {
  endorsements: Endorsement[];
  stats: EndorsementStats;
}

export function EndorsementList({ endorsements, stats }: EndorsementListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-full">
      {/* Stats Header */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Endorsement Stats</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.orb}</p>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <EyeSolid className="w-3 h-3" /> Orb
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.device}</p>
            <p className="text-xs text-gray-500">Device</p>
          </div>
        </div>
      </div>

      {/* Endorsement List */}
      {endorsements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No endorsements yet</p>
          <p className="text-sm mt-1">Be the first to endorse!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {endorsements.map((endorsement) => (
            <div
              key={endorsement.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100"
            >
              <CircularIcon className="w-10 h-10 bg-gray-100 flex-shrink-0">
                <User className="w-5 h-5 text-gray-400" />
              </CircularIcon>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {endorsement.endorser.username ||
                    truncateAddress(endorsement.endorser.walletAddress)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(endorsement.createdAt)}
                </p>
              </div>

              <div className="flex-shrink-0">
                {endorsement.verificationLevel === 'orb' ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    <EyeSolid className="w-3 h-3" />
                    Orb
                  </span>
                ) : (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Device
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

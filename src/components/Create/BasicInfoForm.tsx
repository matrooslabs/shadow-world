'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';

interface BasicInfoFormProps {
  onSubmit: (data: { displayName: string; bio: string }) => void;
  isLoading?: boolean;
  initialData?: { displayName: string; bio: string };
}

export function BasicInfoForm({
  onSubmit,
  isLoading,
  initialData,
}: BasicInfoFormProps) {
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [bio, setBio] = useState(initialData?.bio || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      onSubmit({ displayName: displayName.trim(), bio: bio.trim() });
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Display Name *
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your Shadow's name"
          disabled={isLoading}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          This is how your AI clone will be identified
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio (optional)
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A brief description of your digital self..."
          rows={3}
          disabled={isLoading}
          className={inputClass + " resize-none"}
        />
      </div>

      <Button
        type="submit"
        disabled={!displayName.trim() || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Creating...' : 'Continue'}
      </Button>
    </form>
  );
}

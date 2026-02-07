'use client';

import { KnowledgeEntry, listKnowledge, deleteKnowledge } from '@/lib/substrate-api';
import { Link as LinkIcon, Text, Trash } from 'iconoir-react';
import { useCallback, useEffect, useState } from 'react';

interface KnowledgeListProps {
  substrateId: string;
  refreshKey: number;
}

const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

export function KnowledgeList({ substrateId, refreshKey }: KnowledgeListProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(async () => {
    const result = await listKnowledge(substrateId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setEntries(result.data);
      setError(null);
    }
    setLoading(false);
  }, [substrateId]);

  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // Poll while any entry is processing
  useEffect(() => {
    const hasProcessing = entries.some((e) => e.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [entries, fetchEntries]);

  const handleDelete = async (entryId: string) => {
    setDeletingIds((prev) => new Set(prev).add(entryId));
    setEntries((prev) => prev.filter((e) => e.id !== entryId));

    const result = await deleteKnowledge(substrateId, entryId);
    if (result.error) {
      // Re-fetch to restore state on failure
      await fetchEntries();
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="w-full mt-6 bg-gray-50 rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Knowledge</h2>
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mt-6 bg-gray-50 rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Knowledge</h2>
        <p className="text-sm text-red-600 text-center py-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 bg-gray-50 rounded-xl p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Knowledge</h2>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No knowledge added yet
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 bg-white rounded-lg px-3 py-2"
            >
              {/* Source type icon */}
              {entry.source_type === 'url' ? (
                <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <Text className="w-4 h-4 text-gray-400 shrink-0" />
              )}

              {/* Title / content preview */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {entry.title ||
                    entry.source_url ||
                    (entry.content && entry.content.slice(0, 80)) ||
                    'Untitled'}
                </p>
              </div>

              {/* Status badge */}
              <span
                className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[entry.status] || ''}`}
              >
                {entry.status}
              </span>

              {/* Chunk count */}
              {entry.status === 'ready' && entry.chunk_count > 0 && (
                <span className="text-xs text-gray-400 shrink-0">
                  {entry.chunk_count} chunk{entry.chunk_count !== 1 ? 's' : ''}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingIds.has(entry.id)}
                className="text-gray-400 hover:text-red-500 disabled:opacity-30 shrink-0"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

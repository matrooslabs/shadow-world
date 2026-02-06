'use client';

import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';
import { Xmark, Plus, Link as LinkIcon, Text, Microphone } from 'iconoir-react';
import { VoiceRecorder } from './VoiceRecorder';

type Tab = 'url' | 'text' | 'voice';

interface AddKnowledgeModalProps {
  onSubmit: (data: { urls: string[]; text: string; voiceBlob?: Blob }) => Promise<void>;
  onClose: () => void;
}

export function AddKnowledgeModal({ onSubmit, onClose }: AddKnowledgeModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    if (urls.includes(trimmed)) return;
    setError(null);
    setUrls([...urls, trimmed]);
    setUrlInput('');
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addUrl();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ urls, text: text.trim(), voiceBlob: voiceBlob ?? undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add knowledge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = urls.length > 0 || text.trim().length > 0 || voiceBlob !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={() => { if (!isSubmitting) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Knowledge</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Xmark className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setError(null); setActiveTab('url'); }}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            URL
          </button>
          <button
            onClick={() => { setError(null); setActiveTab('text'); }}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Text className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => { setError(null); setActiveTab('voice'); }}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'voice'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Microphone className="w-4 h-4" />
            Voice
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com/article"
                  disabled={isSubmitting}
                  className={inputClass + ' flex-1 disabled:bg-gray-100'}
                />
                <button
                  onClick={addUrl}
                  disabled={!urlInput.trim() || isSubmitting}
                  className="px-3 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {urls.length > 0 && (
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {url}
                      </span>
                      <button
                        onClick={() => removeUrl(index)}
                        disabled={isSubmitting}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors shrink-0"
                      >
                        <Xmark className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {urls.length === 0 && (
                <p className="text-xs text-gray-500">
                  Add URLs to articles, blog posts, or other web content for your agent to learn from.
                </p>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type text content for your agent to learn from..."
                rows={8}
                disabled={isSubmitting}
                className={inputClass + ' resize-none disabled:bg-gray-100'}
              />
              <p className="text-xs text-gray-500">
                Paste raw text, notes, or other content directly.
              </p>
            </div>
          )}

          {activeTab === 'voice' && (
            <VoiceRecorder
              onRecordingComplete={(blob) => setVoiceBlob(blob)}
              onRecordingClear={() => setVoiceBlob(null)}
              disabled={isSubmitting}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleSubmit}
            disabled={!hasContent || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting
              ? (activeTab === 'voice' ? 'Uploading...' : 'Submitting...')
              : (activeTab === 'voice' ? 'Upload Voice' : 'Submit Knowledge')}
          </Button>
        </div>
      </div>
    </div>
  );
}

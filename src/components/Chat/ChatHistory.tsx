'use client';

import { ChatMessage as ChatMessageType } from '@/lib/substrate-api';
import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  substrateAvatar?: string;
  substrateName?: string;
  isLoading?: boolean;
}

export function ChatHistory({
  messages,
  substrateAvatar,
  substrateName,
  isLoading,
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <p className="text-lg mb-2">Start a conversation</p>
          <p className="text-sm">
            Send a message to chat with {substrateName || 'this substrate'}
          </p>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          substrateAvatar={substrateAvatar}
          substrateName={substrateName}
        />
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            {substrateAvatar ? (
              <img
                src={substrateAvatar}
                alt={substrateName || 'Substrate'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-4 h-4 bg-gray-300 rounded-full" />
            )}
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

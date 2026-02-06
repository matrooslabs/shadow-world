'use client';

import { ChatMessage as ChatMessageType } from '@/lib/substrate-api';
import { CircularIcon } from '@worldcoin/mini-apps-ui-kit-react';
import { User } from 'iconoir-react';

interface ChatMessageProps {
  message: ChatMessageType;
  substrateAvatar?: string;
  substrateName?: string;
}

export function ChatMessage({
  message,
  substrateAvatar,
  substrateName,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <CircularIcon
        className={`w-8 h-8 flex-shrink-0 ${
          isUser ? 'bg-blue-100' : 'bg-gray-100'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : substrateAvatar ? (
          <img
            src={substrateAvatar}
            alt={substrateName || 'Substrate'}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <User className="w-4 h-4 text-gray-400" />
        )}
      </CircularIcon>

      {/* Message Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-200' : 'text-gray-500'
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

'use client';

import { ChatHistory, ChatInput } from '@/components/Chat';
import { Page } from '@/components/PageLayout';
import {
  ChatMessage,
  getChatHistory,
  getSubstrate,
  sendChatMessage,
  Substrate,
} from '@/lib/substrate-api';
import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft } from 'iconoir-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [substrate, setSubstrate] = useState<Substrate | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubstrateAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session]);

  const loadSubstrateAndHistory = async () => {
    if (!session?.user?.walletAddress) return;

    setIsLoading(true);

    // Load substrate
    const substrateResult = await getSubstrate(id);
    if (substrateResult.error || !substrateResult.data) {
      setError('Substrate not found');
      setIsLoading(false);
      return;
    }

    setSubstrate(substrateResult.data);

    // Check if substrate is ready
    if (substrateResult.data.status !== 'ready') {
      setError('This substrate is not ready for chat yet');
      setIsLoading(false);
      return;
    }

    // Load chat history
    const historyResult = await getChatHistory(id, session.user.walletAddress);
    if (historyResult.data) {
      setMessages(historyResult.data);
    }

    setIsLoading(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!session?.user?.walletAddress || !substrate) return;

    setIsSending(true);

    // Add optimistic user message
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    const result = await sendChatMessage(
      id,
      session.user.walletAddress,
      content
    );

    if (result.error) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setError(result.error);
      setIsSending(false);
      return;
    }

    if (result.data) {
      // Replace optimistic message with real message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticMessage.id);
        // The API returns the assistant's response, we need to add both messages
        return [
          ...filtered,
          { ...optimisticMessage, id: `user-${Date.now()}` },
          result.data!,
        ];
      });
    }

    setIsSending(false);
  };

  if (!session?.user) {
    return (
      <>
        <Page.Header className="p-0">
          <TopBar title="Chat" />
        </Page.Header>
        <Page.Main className="flex items-center justify-center">
          <p className="text-gray-500">Please sign in to chat</p>
        </Page.Main>
      </>
    );
  }

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title={substrate?.display_name || 'Chat'}
          startAdornment={
            <Link href={`/substrate/${id}`} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          }
        />
      </Page.Header>

      <div className="flex flex-col h-[calc(100dvh-120px)]">
        {error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="text-blue-600 underline"
              >
                Go back
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ChatHistory
              messages={messages}
              substrateAvatar={substrate?.avatar_url}
              substrateName={substrate?.display_name}
              isLoading={isSending}
            />
            <ChatInput
              onSend={handleSendMessage}
              disabled={isSending}
              placeholder={`Message ${substrate?.display_name || 'substrate'}...`}
            />
          </>
        )}
      </div>
    </>
  );
}

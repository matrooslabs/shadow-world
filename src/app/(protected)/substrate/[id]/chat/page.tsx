'use client';

import { Page } from '@/components/PageLayout';
import { getSubstrate, getAgentSignedUrl, Substrate } from '@/lib/substrate-api';
import { TopBar, Button } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, Microphone, MicrophoneMute, SendDiagonal } from 'iconoir-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ChatMode = 'text' | 'voice';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [substrate, setSubstrate] = useState<Substrate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>('text');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    textOnly: mode === 'text',
    onMessage: useCallback(
      ({ source, message }: { source: string; message: string }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${source}-${Date.now()}-${Math.random()}`,
            role: source === 'user' ? 'user' : 'assistant',
            content: message,
          },
        ]);
      },
      []
    ),
    onError: useCallback((message: string) => {
      console.error('Conversation error:', message);
      setError('Connection error. Please try again.');
      setIsConnected(false);
    }, []),
    onDisconnect: useCallback(() => {
      setIsConnected(false);
    }, []),
  });

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load substrate
  useEffect(() => {
    if (!session?.user?.walletAddress) return;

    const load = async () => {
      setIsLoading(true);
      const result = await getSubstrate(id);
      if (result.error || !result.data) {
        setError('Substrate not found');
        setIsLoading(false);
        return;
      }
      setSubstrate(result.data);
      if (result.data.status !== 'ready') {
        setError('This substrate is not ready for chat yet');
        setIsLoading(false);
        return;
      }
      if (!result.data.agent_id) {
        setError('This substrate does not have an agent configured');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    };
    load();
  }, [id, session]);

  const startConversation = async () => {
    if (!substrate) return;

    setIsConnecting(true);
    setError(null);

    try {
      const urlResult = await getAgentSignedUrl(id);
      if (urlResult.error || !urlResult.data) {
        setError(urlResult.error || 'Failed to get connection URL');
        setIsConnecting(false);
        return;
      }

      await conversation.startSession({
        signedUrl: urlResult.data.signed_url,
      });

      setIsConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
    setIsConnected(false);
  };

  const handleSendText = () => {
    if (!inputText.trim() || !isConnected) return;
    conversation.sendUserMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
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
        {error && !isConnected ? (
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
        ) : !isConnected ? (
          /* Pre-connection: mode selection + connect button */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold mb-2">
                Chat with {substrate?.display_name}
              </h2>
              <p className="text-sm text-gray-500">
                Choose how you want to communicate
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setMode('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'text'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setMode('voice')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'voice'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Voice
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center max-w-xs">
              {mode === 'text'
                ? 'Type messages to chat with the AI clone'
                : 'Speak directly with the AI clone using your microphone'}
            </p>

            <Button
              onClick={startConversation}
              disabled={isConnecting}
              size="lg"
            >
              {isConnecting ? 'Connecting...' : 'Start Conversation'}
            </Button>
          </div>
        ) : (
          /* Connected: show conversation */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && mode === 'text' && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <p className="text-lg mb-2">Start a conversation</p>
                  <p className="text-sm">
                    Send a message to chat with{' '}
                    {substrate?.display_name || 'this substrate'}
                  </p>
                </div>
              )}

              {mode === 'voice' && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Microphone className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-lg mb-2">Listening...</p>
                  <p className="text-sm">
                    Speak to chat with{' '}
                    {substrate?.display_name || 'this substrate'}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="w-8 h-8 flex-shrink-0">
                    {msg.role === 'user' ? (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          You
                        </span>
                      </div>
                    ) : substrate?.avatar_url ? (
                      <img
                        src={substrate.avatar_url}
                        alt={substrate.display_name}
                        className="w-8 h-8 object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-400">
                          AI
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Voice mode status indicator */}
            {mode === 'voice' && (
              <div className="px-4 py-2 flex items-center justify-center gap-2 text-sm text-gray-500">
                {conversation.status === 'connected' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>
                      {conversation.isSpeaking
                        ? `${substrate?.display_name} is speaking...`
                        : 'Listening...'}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2 p-4 bg-white border-t border-gray-100">
              {mode === 'text' ? (
                <>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${substrate?.display_name || 'substrate'}...`}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    onClick={handleSendText}
                    disabled={!inputText.trim()}
                    size="lg"
                    className="!p-3"
                  >
                    <SendDiagonal className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex justify-center">
                  <button
                    onClick={endConversation}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <MicrophoneMute className="w-5 h-5" />
                    End Conversation
                  </button>
                </div>
              )}
              {mode === 'text' && (
                <button
                  onClick={endConversation}
                  className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                  title="End conversation"
                >
                  <MicrophoneMute className="w-5 h-5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

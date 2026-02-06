// Client for communicating with the Python backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_SUBSTRATE_API_URL || 'http://localhost:8000';

// Types matching Python backend models
export interface Substrate {
  id: string;
  owner_wallet: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  personality_profile?: PersonalityProfile;
  status: SubstrateStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonalityProfile {
  traits: string[];
  interests: string[];
  communication_style: string;
  values: string[];
  summary: string;
}

export type SubstrateStatus = 'pending' | 'extracting' | 'ready' | 'failed';

export interface SocialAccount {
  id: string;
  substrate_id: string;
  platform: 'twitter';
  username: string;
  connected_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  substrate_id: string;
  visitor_wallet: string;
  created_at: string;
}

// API Response types
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Create a new substrate
export async function createSubstrate(data: {
  owner_wallet: string;
  display_name: string;
  bio?: string;
}): Promise<ApiResponse<Substrate>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to create substrate' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get all substrates
export async function listSubstrates(): Promise<ApiResponse<Substrate[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates`);

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch substrates' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get a specific substrate
export async function getSubstrate(id: string): Promise<ApiResponse<Substrate>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Substrate not found' };
      }
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch substrate' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get substrate extraction status
export async function getSubstrateStatus(id: string): Promise<ApiResponse<{ status: SubstrateStatus; progress?: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${id}/status`);

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch status' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Trigger personality extraction
export async function triggerExtraction(id: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${id}/extract`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to trigger extraction' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// OAuth - Get authorization URL
export async function getOAuthUrl(platform: 'twitter', substrateId: string): Promise<ApiResponse<{ url: string }>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/oauth/${platform}/authorize?substrate_id=${substrateId}`
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to get OAuth URL' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// OAuth - Handle callback
export async function handleOAuthCallback(
  platform: 'twitter',
  code: string,
  state: string
): Promise<ApiResponse<SocialAccount>> {
  try {
    const response = await fetch(`${API_BASE_URL}/oauth/${platform}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'OAuth callback failed' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get social accounts for a substrate
export async function getSocialAccounts(substrateId: string): Promise<ApiResponse<SocialAccount[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${substrateId}/social-accounts`);

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch social accounts' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Chat - Send a message
export async function sendChatMessage(
  substrateId: string,
  visitorWallet: string,
  message: string
): Promise<ApiResponse<ChatMessage>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${substrateId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_wallet: visitorWallet, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to send message' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Chat - Get history
export async function getChatHistory(
  substrateId: string,
  visitorWallet: string
): Promise<ApiResponse<ChatMessage[]>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/substrates/${substrateId}/chat/history?visitor_wallet=${encodeURIComponent(visitorWallet)}`
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch chat history' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Get substrates owned by a specific wallet
export async function getSubstratesByOwner(walletAddress: string): Promise<ApiResponse<Substrate[]>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/substrates?owner_wallet=${encodeURIComponent(walletAddress)}`
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch substrates' };
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

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
  agent_id?: string;
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to create Shadow' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch substrates' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
        return { error: 'Shadow not found' };
      }
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch substrate' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch status' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to trigger extraction' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to get OAuth URL' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'OAuth callback failed' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch social accounts' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Agent - Get signed URL for ElevenLabs conversation
export async function getAgentSignedUrl(
  substrateId: string
): Promise<ApiResponse<{ signed_url: string }>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/substrates/${substrateId}/agent/signed-url`
    );

    if (!response.ok) {
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to get signed URL' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Knowledge types
export interface KnowledgeEntry {
  id: string;
  substrate_id: string;
  source_type: 'url' | 'text';
  source_url?: string | null;
  title?: string | null;
  content?: string | null;
  elevenlabs_doc_id?: string | null;
  status: 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

// Knowledge - Add a knowledge entry
export async function addKnowledge(
  substrateId: string,
  data: { source_type: 'url' | 'text'; content: string; title?: string }
): Promise<ApiResponse<KnowledgeEntry>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${substrateId}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to add knowledge' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function uploadVoiceSample(
  substrateId: string,
  audioBlob: Blob
): Promise<ApiResponse<{ message: string; voice_status: string }>> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-sample.webm');

    const response = await fetch(
      `${API_BASE_URL}/substrates/${substrateId}/voice`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to upload voice sample' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Knowledge - List entries for a substrate
export async function listKnowledge(substrateId: string): Promise<ApiResponse<KnowledgeEntry[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/substrates/${substrateId}/knowledge`);

    if (!response.ok) {
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch knowledge' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Knowledge - Delete an entry
export async function deleteKnowledge(
  substrateId: string,
  knowledgeId: string
): Promise<ApiResponse<{ status: string; id: string }>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/substrates/${substrateId}/knowledge/${knowledgeId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to delete knowledge' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
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
      try {
        const error = await response.json();
        return { error: error.detail || 'Failed to fetch substrates' };
      } catch {
        return { error: `Request failed (${response.status})` };
      }
    }

    return { data: await response.json() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

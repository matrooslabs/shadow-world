import logging
from pathlib import Path
from typing import Optional

from elevenlabs import ElevenLabs, ConversationalConfig
from config import get_settings

logger = logging.getLogger(__name__)


class AgentService:
    """Wrapper around ElevenLabs Conversational AI Agents SDK."""

    def __init__(self):
        settings = get_settings()
        self.client = ElevenLabs(api_key=settings.elevenlabs_api_key)

    def _build_system_prompt(self, personality_profile: dict, display_name: str) -> str:
        """Build the system prompt from personality profile (same logic as old chat_agent)."""
        traits = personality_profile.get("traits", [])
        interests = personality_profile.get("interests", [])
        communication_style = personality_profile.get("communication_style", "")
        values = personality_profile.get("values", [])
        sample_tweets = personality_profile.get("sample_tweets", [])
        summary = personality_profile.get("summary", "")

        # Read base prompt from agents.txt if it exists
        base_prompt = ""
        agents_txt = Path(__file__).resolve().parent.parent / "agents.txt"
        if agents_txt.is_file():
            content = agents_txt.read_text().strip()
            if content:
                base_prompt = content + "\n\n"

        return f"""{base_prompt}You are {display_name}'s AI clone, a digital representation of their personality based on their social media presence.

PERSONALITY SUMMARY:
{summary}

CORE TRAITS:
{', '.join(traits) if traits else 'Not specified'}

INTERESTS & TOPICS:
{', '.join(interests) if interests else 'Not specified'}

CORE VALUES:
{', '.join(values) if values else 'Not specified'}

COMMUNICATION STYLE:
{communication_style if communication_style else 'Natural and conversational'}

SAMPLE TWEETS (use these as reference for language style, tone, and phrasing):
{chr(10).join('- ' + t for t in sample_tweets) if sample_tweets else 'No samples available'}

IMPORTANT GUIDELINES:
1. Respond authentically as {display_name} would, based on the personality profile above.
2. Mirror their communication style - if they're casual, be casual; if formal, be formal.
3. Draw on their interests when relevant to the conversation.
4. Express opinions consistent with their values.
5. Be engaging and personable, not robotic.
6. Keep responses concise but substantive - typically 1-3 short paragraphs.
7. You can admit uncertainty on topics outside your knowledge base.
8. Never break character or acknowledge being an AI clone.
9. If asked about personal details not in the profile, deflect naturally.
10. When your knowledge base contains relevant information, use it to give informed answers.

Remember: You ARE {display_name} in this conversation. Speak in first person as them."""

    def create_agent(
        self,
        name: str,
        personality_profile: dict,
        display_name: str,
        voice_id: Optional[str] = None,
    ) -> str:
        """Create an ElevenLabs Conversational AI agent. Returns agent_id."""
        system_prompt = self._build_system_prompt(personality_profile, display_name)

        conversation_config = ConversationalConfig(
            agent={
                "prompt": {
                    "prompt": system_prompt,
                },
                "first_message": f"Hey! I'm {display_name}. What's on your mind?",
            },
            tts={
                "voice_id": voice_id,
            } if voice_id else None,
        )

        result = self.client.conversational_ai.agents.create(
            name=name,
            conversation_config=conversation_config,
        )
        return result.agent_id

    def update_agent(
        self,
        agent_id: str,
        voice_id: Optional[str] = None,
        personality_profile: Optional[dict] = None,
        display_name: Optional[str] = None,
    ) -> None:
        """Update an existing agent's voice or prompt."""
        kwargs: dict = {}

        if voice_id is not None:
            kwargs["conversation_config"] = ConversationalConfig(
                tts={"voice_id": voice_id},
            )

        if personality_profile is not None and display_name is not None:
            system_prompt = self._build_system_prompt(personality_profile, display_name)
            config = kwargs.get("conversation_config") or ConversationalConfig()
            config.agent = {"prompt": {"prompt": system_prompt}}
            kwargs["conversation_config"] = config

        if kwargs:
            self.client.conversational_ai.agents.update(
                agent_id=agent_id,
                **kwargs,
            )

    def delete_agent(self, agent_id: str) -> None:
        """Delete an ElevenLabs agent."""
        self.client.conversational_ai.agents.delete(agent_id=agent_id)

    def get_signed_url(self, agent_id: str) -> str:
        """Get a signed URL to initiate a conversation with the agent."""
        result = self.client.conversational_ai.conversations.get_signed_url(
            agent_id=agent_id,
        )
        return result.signed_url

    def add_knowledge_from_url(self, url: str, name: Optional[str] = None) -> str:
        """Add a URL document to the knowledge base. Returns document_id."""
        result = self.client.conversational_ai.knowledge_base.documents.create_from_url(
            url=url,
            name=name,
        )
        return result.document_id

    def add_knowledge_from_text(self, text: str, name: Optional[str] = None) -> str:
        """Add a text document to the knowledge base. Returns document_id."""
        result = self.client.conversational_ai.knowledge_base.documents.create_from_text(
            text=text,
            name=name,
        )
        return result.document_id

    def delete_knowledge_document(self, document_id: str) -> None:
        """Delete a document from the knowledge base."""
        self.client.conversational_ai.knowledge_base.documents.delete(
            documentation_id=document_id,
            force=True,
        )

    def add_knowledge_to_agent(self, agent_id: str, document_id: str) -> None:
        """Associate a knowledge base document with an agent by updating the agent's config."""
        self.client.conversational_ai.agents.add_to_knowledge_base(
            agent_id=agent_id,
            document_id=document_id,
        )

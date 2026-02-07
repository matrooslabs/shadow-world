from pathlib import Path
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from config import get_settings
from vectorstore import query_knowledge


class ChatState(TypedDict):
    """State for the chat agent."""
    personality_profile: dict
    display_name: str
    message_history: list[dict]  # Previous messages for context
    user_message: str
    substrate_id: str
    retrieved_context: list[str]
    response: str


class ChatAgent:
    """LangGraph agent for chatting as a substrate persona."""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            anthropic_api_key=settings.anthropic_api_key,
        )
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the chat graph."""
        workflow = StateGraph(ChatState)

        workflow.add_node("retrieve_context", self._retrieve_context)
        workflow.add_node("generate_response", self._generate_response)

        workflow.set_entry_point("retrieve_context")
        workflow.add_edge("retrieve_context", "generate_response")
        workflow.add_edge("generate_response", END)

        return workflow.compile()

    def _retrieve_context(self, state: ChatState) -> ChatState:
        """Retrieve relevant knowledge base context for the user message."""
        substrate_id = state["substrate_id"]
        user_message = state["user_message"]

        if substrate_id:
            context = query_knowledge(substrate_id, user_message, k=5)
        else:
            context = []

        return {**state, "retrieved_context": context}

    def _build_system_prompt(self, personality_profile: dict, display_name: str, retrieved_context: list[str]) -> str:
        """Build the system prompt from personality profile."""
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

        # Build knowledge base section
        knowledge_section = ""
        if retrieved_context:
            context_text = "\n\n---\n\n".join(retrieved_context)
            knowledge_section = f"""

KNOWLEDGE BASE:
The following information has been provided by {display_name} as reference material. Use it to give informed, accurate answers when relevant.

{context_text}

"""

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
{knowledge_section}
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

    def _generate_response(self, state: ChatState) -> ChatState:
        """Generate a response as the substrate persona."""
        system_prompt = self._build_system_prompt(
            state["personality_profile"],
            state["display_name"],
            state["retrieved_context"],
        )

        # Build message history
        messages = [SystemMessage(content=system_prompt)]

        # Add conversation history (last 10 messages for context)
        for msg in state["message_history"][-10:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))

        # Add current message
        messages.append(HumanMessage(content=state["user_message"]))

        response = self.llm.invoke(messages)

        return {**state, "response": response.content}

    async def chat(
        self,
        personality_profile: dict,
        display_name: str,
        message_history: list[dict],
        user_message: str,
        substrate_id: str = "",
    ) -> str:
        """Generate a chat response."""
        initial_state: ChatState = {
            "personality_profile": personality_profile,
            "display_name": display_name,
            "message_history": message_history,
            "user_message": user_message,
            "substrate_id": substrate_id,
            "retrieved_context": [],
            "response": "",
        }

        result = self.graph.invoke(initial_state)
        return result["response"]

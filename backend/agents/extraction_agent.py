from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from config import get_settings
import json


class ExtractionState(TypedDict):
    """State for the extraction pipeline."""
    content: dict  # Raw content from social platforms
    tweets_text: str  # Processed tweet text
    traits: list[str]
    interests: list[str]
    communication_style: str
    values: list[str]
    sample_tweets: list[str]
    summary: str
    progress: int
    error: str | None


class ExtractionAgent:
    """LangGraph agent for extracting personality from social media content."""

    def __init__(self):
        settings = get_settings()
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            anthropic_api_key=settings.anthropic_api_key,
        )
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the extraction pipeline graph."""
        workflow = StateGraph(ExtractionState)

        # Add nodes
        workflow.add_node("process_content", self._process_content)
        workflow.add_node("extract_traits", self._extract_traits)
        workflow.add_node("extract_interests", self._extract_interests)
        workflow.add_node("extract_communication_style", self._extract_communication_style)
        workflow.add_node("extract_values", self._extract_values)
        workflow.add_node("select_sample_tweets", self._select_sample_tweets)
        workflow.add_node("generate_summary", self._generate_summary)

        # Add edges
        workflow.set_entry_point("process_content")
        workflow.add_edge("process_content", "extract_traits")
        workflow.add_edge("extract_traits", "extract_interests")
        workflow.add_edge("extract_interests", "extract_communication_style")
        workflow.add_edge("extract_communication_style", "extract_values")
        workflow.add_edge("extract_values", "select_sample_tweets")
        workflow.add_edge("select_sample_tweets", "generate_summary")
        workflow.add_edge("generate_summary", END)

        return workflow.compile()

    def _process_content(self, state: ExtractionState) -> ExtractionState:
        """Process raw content into analyzable text."""
        content = state["content"]
        tweets = content.get("tweets", [])

        # Combine all tweet text
        tweets_text = "\n\n".join([
            f"Tweet: {t.get('text', '')}"
            for t in tweets
            if t.get("text")
        ])

        # Add user bio if available
        user = content.get("user", {})
        if user.get("description"):
            tweets_text = f"Bio: {user['description']}\n\n{tweets_text}"

        return {**state, "tweets_text": tweets_text, "progress": 20}

    def _extract_traits(self, state: ExtractionState) -> ExtractionState:
        """Extract personality traits from content."""
        messages = [
            SystemMessage(content="""You are an expert at analyzing social media content to understand personality traits.
Analyze the following content and extract 5-7 key personality traits.
Return ONLY a JSON array of trait strings, e.g. ["curious", "empathetic", "analytical"].
Focus on genuine personality characteristics, not superficial observations."""),
            HumanMessage(content=state["tweets_text"][:8000]),  # Limit content length
        ]

        response = self.llm.invoke(messages)
        try:
            traits = json.loads(response.content)
            if not isinstance(traits, list):
                traits = []
        except json.JSONDecodeError:
            traits = []

        return {**state, "traits": traits, "progress": 40}

    def _extract_interests(self, state: ExtractionState) -> ExtractionState:
        """Extract interests and topics from content."""
        messages = [
            SystemMessage(content="""You are an expert at analyzing social media content to understand interests.
Analyze the following content and extract 5-10 key interests and topics this person cares about.
Return ONLY a JSON array of interest strings, e.g. ["technology", "philosophy", "cooking"].
Focus on recurring themes and genuine passions."""),
            HumanMessage(content=state["tweets_text"][:8000]),
        ]

        response = self.llm.invoke(messages)
        try:
            interests = json.loads(response.content)
            if not isinstance(interests, list):
                interests = []
        except json.JSONDecodeError:
            interests = []

        return {**state, "interests": interests, "progress": 60}

    def _extract_communication_style(self, state: ExtractionState) -> ExtractionState:
        """Analyze communication style."""
        messages = [
            SystemMessage(content="""You are an expert at analyzing communication patterns.
Analyze the following content and describe this person's communication style in 2-3 sentences.
Consider: tone (formal/casual), use of humor, level of directness, vocabulary complexity.
Return ONLY the description as plain text."""),
            HumanMessage(content=state["tweets_text"][:8000]),
        ]

        response = self.llm.invoke(messages)
        communication_style = response.content.strip()

        return {**state, "communication_style": communication_style, "progress": 75}

    def _extract_values(self, state: ExtractionState) -> ExtractionState:
        """Extract core values."""
        messages = [
            SystemMessage(content="""You are an expert at understanding personal values from social media content.
Analyze the following content and extract 3-5 core values this person seems to hold.
Return ONLY a JSON array of value strings, e.g. ["authenticity", "innovation", "community"].
Look for what they advocate for, criticize, or repeatedly emphasize."""),
            HumanMessage(content=state["tweets_text"][:8000]),
        ]

        response = self.llm.invoke(messages)
        try:
            values = json.loads(response.content)
            if not isinstance(values, list):
                values = []
        except json.JSONDecodeError:
            values = []

        return {**state, "values": values, "progress": 80}

    def _select_sample_tweets(self, state: ExtractionState) -> ExtractionState:
        """Select representative sample tweets that best capture language style."""
        messages = [
            SystemMessage(content="""You are an expert at analyzing writing style and voice.
From the following tweets, select 5-10 that best represent this person's unique language style.
Pick tweets that showcase their distinctive phrasing, slang, humor, sentence structure, and tone.
Prefer tweets that are original thoughts (not replies or retweets) and feel most "them".
Return ONLY a JSON array of the selected tweet strings, exactly as written."""),
            HumanMessage(content=state["tweets_text"][:8000]),
        ]

        response = self.llm.invoke(messages)
        try:
            sample_tweets = json.loads(response.content)
            if not isinstance(sample_tweets, list):
                sample_tweets = []
        except json.JSONDecodeError:
            sample_tweets = []

        return {**state, "sample_tweets": sample_tweets, "progress": 90}

    def _generate_summary(self, state: ExtractionState) -> ExtractionState:
        """Generate a cohesive personality summary."""
        context = f"""
Traits: {', '.join(state['traits'])}
Interests: {', '.join(state['interests'])}
Values: {', '.join(state['values'])}
Communication Style: {state['communication_style']}

Sample content:
{state['tweets_text'][:4000]}
"""

        messages = [
            SystemMessage(content="""You are creating a personality summary that will be used to power an AI clone.
Based on the extracted traits, interests, values, and communication style, write a 3-4 sentence summary
that captures the essence of this person's personality. This should feel personal and authentic.
Write in third person, as if describing someone to a friend."""),
            HumanMessage(content=context),
        ]

        response = self.llm.invoke(messages)
        summary = response.content.strip()

        return {**state, "summary": summary, "progress": 100}

    async def extract(self, content: dict) -> dict:
        """Run the extraction pipeline."""
        initial_state: ExtractionState = {
            "content": content,
            "tweets_text": "",
            "traits": [],
            "interests": [],
            "communication_style": "",
            "values": [],
            "sample_tweets": [],
            "summary": "",
            "progress": 0,
            "error": None,
        }

        try:
            result = self.graph.invoke(initial_state)
            return {
                "traits": result["traits"],
                "interests": result["interests"],
                "communication_style": result["communication_style"],
                "values": result["values"],
                "sample_tweets": result["sample_tweets"],
                "summary": result["summary"],
            }
        except Exception as e:
            return {"error": str(e)}

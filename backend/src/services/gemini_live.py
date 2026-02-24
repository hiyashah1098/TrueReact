"""
TrueReact - Gemini Live API Service

Handles real-time, bidirectional multimodal streaming with Gemini Live API
for processing audio and video streams with low latency.
"""

import asyncio
import base64
from typing import Optional, Callable, Dict, Any
import json

import google.generativeai as genai
from google.generativeai import types

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class GeminiLiveStream:
    """
    Manages a single Gemini Live streaming session.
    
    Handles bidirectional communication for real-time
    multimodal analysis and coaching feedback generation.
    """
    
    def __init__(
        self,
        session_id: str,
        on_coaching_feedback: Callable[[dict], Any]
    ):
        self.session_id = session_id
        self.on_coaching_feedback = on_coaching_feedback
        self.session = None
        self.is_active = False
        
        # System instruction for the coaching agent
        self.system_instruction = """You are TrueReact, a real-time social-emotional coach.

Your role is to help users align their internal intent with their external social signals.

CAPABILITIES:
- Analyze facial micro-expressions and detect masking or flat affect
- Monitor vocal patterns for pitch drops (low energy) or rapid speech (anxiety)
- Provide gentle, real-time coaching nudges
- Support users who are neurodivergent or experiencing depression

COACHING STYLE:
- Be warm, supportive, and non-judgmental
- Provide specific, actionable feedback
- Focus on helping users project their "true" intent
- Use evidence-based CBT/DBT techniques

RESPONSE FORMAT:
When providing coaching feedback, structure your response as:
{
    "observation": "What you noticed",
    "interpretation": "What it might communicate to others",
    "suggestion": "Specific technique to try",
    "encouragement": "Supportive message"
}

SAFETY:
- If you detect signs of distress, shift to supportive mode
- Never provide medical advice
- Encourage professional help when appropriate"""

    async def initialize(self) -> None:
        """Initialize the Gemini Live session."""
        try:
            # Create a live session with multimodal capabilities
            self.session = await genai.LiveSession.create(
                model=settings.GEMINI_MODEL,
                config=types.LiveConnectConfig(
                    response_modalities=["TEXT", "AUDIO"],
                    system_instruction=self.system_instruction,
                    tools=[
                        types.Tool(
                            function_declarations=[
                                types.FunctionDeclaration(
                                    name="provide_coaching_feedback",
                                    description="Provide real-time coaching feedback to the user",
                                    parameters={
                                        "type": "object",
                                        "properties": {
                                            "observation": {"type": "string"},
                                            "interpretation": {"type": "string"},
                                            "suggestion": {"type": "string"},
                                            "encouragement": {"type": "string"},
                                            "urgency": {"type": "string", "enum": ["low", "normal", "high"]}
                                        },
                                        "required": ["observation", "suggestion"]
                                    }
                                )
                            ]
                        )
                    ]
                )
            )
            
            self.is_active = True
            logger.info(f"Gemini Live session initialized: {self.session_id}")
            
            # Start listening for responses
            asyncio.create_task(self._listen_for_responses())
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Live session: {e}")
            raise
            
    async def send_audio(self, audio_data: bytes, analysis: dict) -> None:
        """
        Send audio data to Gemini for processing.
        
        Args:
            audio_data: Raw audio bytes
            analysis: Pre-computed vocal analysis
        """
        if not self.is_active or not self.session:
            return
            
        try:
            # Encode audio as base64
            audio_b64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Send audio with analysis context
            await self.session.send(
                types.LiveClientRealtimeInput(
                    media_chunks=[
                        types.Blob(
                            mime_type="audio/pcm",
                            data=audio_b64
                        )
                    ]
                )
            )
            
            # Send analysis as text context
            await self.session.send(
                types.LiveClientContent(
                    turns=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(
                                    text=f"[VOCAL_ANALYSIS]: {json.dumps(analysis)}"
                                )
                            ]
                        )
                    ]
                )
            )
            
        except Exception as e:
            logger.error(f"Error sending audio to Gemini: {e}")
            
    async def send_video(self, video_frame: bytes, analysis: dict) -> None:
        """
        Send video frame to Gemini for processing.
        
        Args:
            video_frame: Video frame data (JPEG/PNG encoded)
            analysis: Pre-computed visual analysis
        """
        if not self.is_active or not self.session:
            return
            
        try:
            # Encode frame as base64
            frame_b64 = base64.b64encode(video_frame).decode('utf-8')
            
            # Send video frame
            await self.session.send(
                types.LiveClientRealtimeInput(
                    media_chunks=[
                        types.Blob(
                            mime_type="image/jpeg",
                            data=frame_b64
                        )
                    ]
                )
            )
            
            # Send analysis context
            await self.session.send(
                types.LiveClientContent(
                    turns=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part(
                                    text=f"[VISUAL_ANALYSIS]: {json.dumps(analysis)}"
                                )
                            ]
                        )
                    ]
                )
            )
            
        except Exception as e:
            logger.error(f"Error sending video to Gemini: {e}")
            
    async def _listen_for_responses(self) -> None:
        """Listen for responses from Gemini and process them."""
        if not self.session:
            return
            
        try:
            async for response in self.session.receive():
                await self._process_response(response)
        except Exception as e:
            logger.error(f"Error in response listener: {e}")
            self.is_active = False
            
    async def _process_response(self, response) -> None:
        """Process a response from Gemini."""
        try:
            # Handle function calls (coaching feedback)
            if hasattr(response, 'function_calls') and response.function_calls:
                for call in response.function_calls:
                    if call.name == "provide_coaching_feedback":
                        feedback = {
                            "observation": call.args.get("observation", ""),
                            "interpretation": call.args.get("interpretation", ""),
                            "suggestion": call.args.get("suggestion", ""),
                            "encouragement": call.args.get("encouragement", ""),
                            "urgency": call.args.get("urgency", "normal")
                        }
                        await self.on_coaching_feedback(feedback)
                        
            # Handle text responses
            if hasattr(response, 'text') and response.text:
                # Parse structured coaching feedback from text
                try:
                    feedback = json.loads(response.text)
                    await self.on_coaching_feedback(feedback)
                except json.JSONDecodeError:
                    # Handle unstructured text response
                    await self.on_coaching_feedback({
                        "suggestion": response.text,
                        "urgency": "normal"
                    })
                    
        except Exception as e:
            logger.error(f"Error processing Gemini response: {e}")
            
    async def close(self) -> None:
        """Close the Gemini Live session."""
        self.is_active = False
        if self.session:
            try:
                await self.session.close()
                logger.info(f"Gemini Live session closed: {self.session_id}")
            except Exception as e:
                logger.error(f"Error closing Gemini session: {e}")


class GeminiLiveService:
    """
    Service for managing Gemini Live API connections.
    
    Handles initialization, session creation, and direct queries
    to the Gemini API for interrupt handling.
    """
    
    def __init__(self):
        self.is_ready = False
        self.model = None
        
    async def initialize(self) -> None:
        """Initialize the Gemini API client."""
        try:
            # Configure the Gemini API
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            # Initialize the model for non-streaming queries
            self.model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction="""You are TrueReact's analysis engine.
                
When analyzing user interactions, provide detailed insights about:
- Social signal alignment (expression vs. tone)
- Potential misinterpretations
- Specific improvement suggestions

Be constructive and supportive in your analysis."""
            )
            
            self.is_ready = True
            logger.info("Gemini API service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini API: {e}")
            raise
            
    async def create_session_stream(
        self,
        session_id: str,
        on_coaching_feedback: Callable[[dict], Any]
    ) -> GeminiLiveStream:
        """
        Create a new Gemini Live streaming session.
        
        Args:
            session_id: Unique session identifier
            on_coaching_feedback: Callback for coaching feedback
            
        Returns:
            Initialized GeminiLiveStream instance
        """
        stream = GeminiLiveStream(session_id, on_coaching_feedback)
        await stream.initialize()
        return stream
        
    async def analyze_interrupt(
        self,
        question: str,
        recent_context: dict
    ) -> dict:
        """
        Analyze a user's 'barge-in' interrupt question.
        
        Args:
            question: User's interrupt question (e.g., "Did that sound sarcastic?")
            recent_context: Recent coaching context
            
        Returns:
            Analysis and suggestions
        """
        if not self.model:
            raise RuntimeError("Gemini service not initialized")
            
        prompt = f"""The user interrupted to ask: "{question}"

Recent context:
{json.dumps(recent_context, indent=2)}

Analyze the user's recent social signals and provide:
1. Direct answer to their question
2. Specific observations that led to your answer
3. A concrete technique they can try
4. An encouraging follow-up

Respond in JSON format with keys: analysis, observations, technique, encouragement"""

        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            
            # Parse the response
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                return {
                    "analysis": response.text,
                    "observations": [],
                    "technique": "",
                    "encouragement": ""
                }
                
        except Exception as e:
            logger.error(f"Error analyzing interrupt: {e}")
            return {
                "analysis": "I couldn't fully analyze that moment. Let's try again.",
                "error": str(e)
            }
            
    async def close(self) -> None:
        """Cleanup Gemini service resources."""
        self.is_ready = False
        logger.info("Gemini API service closed")

"""
TrueReact - Session Handler

Handles individual coaching sessions, coordinating between the client,
Gemini Live API, multi-agent orchestrator, and Vertex AI grounding 
for real-time coaching with emotion visualization.
"""

import asyncio
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List

from fastapi import WebSocket

from src.services.gemini_live import GeminiLiveService
from src.services.vertex_grounding import VertexGroundingService, EnhancedGroundingService
from src.services.signal_analyzer import SignalAnalyzer
from src.services.content_filter import get_content_filter
from src.agents.orchestrator import AgentOrchestrator, OrchestratorMode, OrchestratedResponse
from src.agents.safety_agent import SafetyAssessment, DistressLevel
from src.config import settings
from src.utils.logging import SessionLogger


class SessionState(Enum):
    """Possible states for a coaching session."""
    INITIALIZING = "initializing"
    CALIBRATING = "calibrating"  # Initial calibration phase
    COACHING = "coaching"        # Active coaching mode
    PAUSED = "paused"            # User paused session
    SAFE_STATE = "safe_state"    # Support mode (triggered by distress)
    ENDED = "ended"


class CoachingPersona(Enum):
    """Coaching personas that the agent can adopt."""
    COACH = "coach"          # Default: Active coaching and feedback
    SUPPORT = "support"      # Supportive mode for distress situations
    OBSERVER = "observer"    # Passive observation, minimal intervention


class SessionHandler:
    """
    Handles a single coaching session.
    
    Coordinates:
    - Real-time audio/video processing via Gemini Live
    - Multi-agent orchestration (Emotion, Safety, Research, Coaching)
    - Signal analysis for expressions, voice, and posture
    - Coaching feedback generation with grounding
    - Real-time emotion visualization data
    - Safe-state transitions for crisis situations
    """
    
    def __init__(
        self,
        client_id: str,
        websocket: WebSocket,
        gemini_service: GeminiLiveService,
        grounding_service: VertexGroundingService
    ):
        self.session_id = str(uuid.uuid4())
        self.client_id = client_id
        self.websocket = websocket
        self.gemini = gemini_service
        self.grounding = grounding_service
        
        # Session state
        self.state = SessionState.INITIALIZING
        self.persona = CoachingPersona.COACH
        self.started_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        
        # Signal analysis
        self.signal_analyzer = SignalAnalyzer()
        
        # Multi-agent orchestrator
        self.orchestrator = AgentOrchestrator()
        self.orchestrator.on_safety_alert = self._handle_safety_alert
        self.orchestrator.on_mode_change = self._handle_mode_change
        
        # Enhanced grounding service
        self.enhanced_grounding = EnhancedGroundingService()
        
        # Content filter for AUP compliance
        self.content_filter = get_content_filter()
        
        # Coaching context
        self.coaching_history: list = []
        self.distress_scores: list = []
        self.baseline_metrics: Optional[dict] = None
        
        # Emotion tracking for visualization
        self.emotion_history: List[Dict[str, Any]] = []
        
        # Logging
        self.logger = SessionLogger(self.session_id, client_id)
        
        # Gemini Live stream
        self.gemini_stream = None
        
    async def start(self) -> None:
        """Initialize and start the coaching session."""
        self.logger.info("Starting coaching session")
        
        # Initialize multi-agent orchestrator
        self.orchestrator.initialize(self.session_id)
        
        # Initialize enhanced grounding
        await self.enhanced_grounding.initialize()
        
        # Initialize Gemini Live stream for this session
        self.gemini_stream = await self.gemini.create_session_stream(
            session_id=self.session_id,
            on_coaching_feedback=self._handle_coaching_feedback
        )
        
        # Send welcome message
        await self._send_to_client({
            "type": "session_started",
            "session_id": self.session_id,
            "message": "Welcome to TrueReact! Let's start with a quick calibration.",
            "state": self.state.value,
            "features": {
                "emotionVisualization": True,
                "multiAgentOrchestration": True,
                "groundedCoaching": True
            }
        })
        
        # Start calibration phase
        self.state = SessionState.CALIBRATING
        await self._start_calibration()
        
    async def _start_calibration(self) -> None:
        """Begin the calibration phase to establish baseline metrics."""
        self.logger.info("Starting calibration phase")
        
        await self._send_to_client({
            "type": "calibration_start",
            "instructions": [
                "Look directly at the camera with a neutral expression",
                "Speak a few sentences at your normal pace",
                "We'll use this to understand your baseline"
            ]
        })
        
    async def process_message(self, data: dict) -> None:
        """
        Process incoming message from the client.
        
        Args:
            data: Message data containing type and payload
        """
        self.last_activity = datetime.utcnow()
        message_type = data.get("type", "unknown")
        
        if message_type == "audio_frame":
            await self._process_audio_frame(data)
        elif message_type == "video_frame":
            await self._process_video_frame(data)
        elif message_type == "interrupt":
            await self.handle_interrupt(data)
        elif message_type == "calibration_complete":
            await self._complete_calibration(data)
        elif message_type == "pause":
            await self._pause_session()
        elif message_type == "resume":
            await self._resume_session()
        elif message_type == "end":
            await self.close()
        else:
            self.logger.warning(f"Unknown message type: {message_type}")
            
    async def _process_audio_frame(self, data: dict) -> None:
        """Process incoming audio data for vocal analysis."""
        if self.state not in [SessionState.COACHING, SessionState.CALIBRATING]:
            return
            
        audio_data = data.get("audio_data")
        if not audio_data:
            return
            
        # Analyze vocal signals
        vocal_analysis = self.signal_analyzer.analyze_audio(audio_data)
        
        # Process through multi-agent orchestrator
        orchestrated_response = await self.orchestrator.process(
            audio_data=audio_data,
            audio_analysis=vocal_analysis,
            user_text=data.get("transcription")
        )
        
        # Send emotion visualization update
        await self._send_emotion_update(orchestrated_response)
        
        # Handle safety actions
        if orchestrated_response.safety_action in ["offer_resources", "activate_safe_state", "emergency_escalation"]:
            await self._handle_orchestrator_safety(orchestrated_response)
        
        # Send coaching feedback if appropriate
        if orchestrated_response.should_coach and orchestrated_response.coaching_feedback:
            await self._send_orchestrated_coaching(orchestrated_response)
            
        # Legacy: Check for distress markers
        if vocal_analysis.get("distress_score", 0) > settings.DISTRESS_THRESHOLD:
            await self._check_safe_state_trigger(vocal_analysis)
            
        # Send to Gemini Live for processing
        if self.gemini_stream:
            await self.gemini_stream.send_audio(audio_data, vocal_analysis)
            
        # Log for observability
        self.logger.log_signal_analysis(
            signal_type="vocal",
            confidence=vocal_analysis.get("confidence", 0),
            detected_state=vocal_analysis.get("detected_state", "unknown"),
            raw_metrics=vocal_analysis
        )
        
    async def _process_video_frame(self, data: dict) -> None:
        """Process incoming video data for visual analysis."""
        if self.state not in [SessionState.COACHING, SessionState.CALIBRATING]:
            return
            
        video_frame = data.get("video_data")
        if not video_frame:
            return
            
        # Analyze facial expressions and posture
        visual_analysis = self.signal_analyzer.analyze_video(video_frame)
        
        # Process through multi-agent orchestrator
        orchestrated_response = await self.orchestrator.process(
            video_frame=video_frame,
            video_analysis=visual_analysis
        )
        
        # Send emotion visualization update
        await self._send_emotion_update(orchestrated_response)
        
        # Handle safety actions
        if orchestrated_response.safety_action in ["offer_resources", "activate_safe_state", "emergency_escalation"]:
            await self._handle_orchestrator_safety(orchestrated_response)
        
        # Send coaching feedback if appropriate
        if orchestrated_response.should_coach and orchestrated_response.coaching_feedback:
            await self._send_orchestrated_coaching(orchestrated_response)
            
        # Legacy: Check for masking or flat affect
        expression_state = visual_analysis.get("expression_state", {})
        if expression_state.get("masking_detected") or expression_state.get("flat_affect"):
            await self._provide_expression_coaching(visual_analysis)
            
        # Send to Gemini Live for multimodal processing
        if self.gemini_stream:
            await self.gemini_stream.send_video(video_frame, visual_analysis)
            
        # Log for observability
        self.logger.log_signal_analysis(
            signal_type="facial",
            confidence=visual_analysis.get("confidence", 0),
            detected_state=visual_analysis.get("dominant_emotion", "unknown"),
            raw_metrics=visual_analysis
        )
        
    async def _send_emotion_update(self, response: OrchestratedResponse) -> None:
        """Send real-time emotion visualization data to client."""
        emotion_data = {
            "type": "emotion_update",
            "emotion": response.emotion_state,
            "trend": response.emotion_trend,
            "congruenceScore": response.emotion_state.get("congruence_score", 1.0),
            "maskingDetected": response.emotion_state.get("masking_detected", False),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Track emotion history
        self.emotion_history.append({
            "emotion": response.emotion_state.get("primary_emotion", "neutral"),
            "intensity": response.emotion_state.get("intensity", 0.5),
            "timestamp": datetime.utcnow().timestamp()
        })
        
        # Limit history size
        if len(self.emotion_history) > 100:
            self.emotion_history = self.emotion_history[-100:]
        
        await self._send_to_client(emotion_data)
        
    async def _send_orchestrated_coaching(self, response: OrchestratedResponse) -> None:
        """Send orchestrated coaching feedback to client."""
        # Filter coaching feedback for AUP compliance
        filtered_feedback = self.content_filter.validate_coaching_feedback(
            response.coaching_feedback
        ) if settings.CONTENT_FILTER_ENABLED else response.coaching_feedback
        
        feedback = {
            "type": "coaching_feedback",
            "category": "orchestrated",
            "observation": filtered_feedback.get("observation", ""),
            "interpretation": filtered_feedback.get("interpretation", ""),
            "suggestion": filtered_feedback.get("suggestion", ""),
            "encouragement": filtered_feedback.get("encouragement", ""),
            "technique": response.technique,
            "citations": response.citations,
            "urgency": "normal",
            "grounded": bool(response.citations),
            "agent_contributions": response.agent_contributions,
            "processing_time_ms": response.processing_time_ms
        }
        
        await self._send_to_client(feedback)
        
        self.coaching_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "feedback": feedback
        })
        
        self.logger.log_coaching_feedback(
            feedback_type="orchestrated",
            suggestion=feedback.get("suggestion", ""),
            urgency="normal"
        )
        
    async def _handle_orchestrator_safety(self, response: OrchestratedResponse) -> None:
        """Handle safety alerts from orchestrator."""
        if response.safety_action == "emergency_escalation":
            await self.activate_safe_state(
                trigger_reason="orchestrator_crisis_detection",
                distress_score=response.emotion_state.get("intensity", 1.0)
            )
        elif response.safety_action == "activate_safe_state":
            await self.activate_safe_state(
                trigger_reason="orchestrator_high_distress",
                distress_score=response.emotion_state.get("intensity", 0.8)
            )
        elif response.safety_action == "offer_resources":
            await self._send_to_client({
                "type": "safety_resources",
                "message": response.coaching_feedback.get("message") if response.coaching_feedback else "Help is available.",
                "resources": response.safety_status.get("resources", []),
                "urgency": "moderate"
            })
            
    def _handle_safety_alert(self, assessment: SafetyAssessment) -> None:
        """Callback for safety agent alerts."""
        self.logger.warning(
            f"Safety alert: {assessment.distress_level.value} - {assessment.recommended_action.value}"
        )
        
    def _handle_mode_change(self, mode: OrchestratorMode) -> None:
        """Callback for orchestrator mode changes."""
        self.logger.info(f"Orchestrator mode changed to: {mode.value}")
        
        # Map orchestrator mode to session persona
        mode_to_persona = {
            OrchestratorMode.ACTIVE_COACHING: CoachingPersona.COACH,
            OrchestratorMode.SUPPORTIVE: CoachingPersona.SUPPORT,
            OrchestratorMode.OBSERVER: CoachingPersona.OBSERVER,
            OrchestratorMode.SAFE_STATE: CoachingPersona.SUPPORT,
        }
        self.persona = mode_to_persona.get(mode, CoachingPersona.COACH)
        
    async def _provide_expression_coaching(self, analysis: dict) -> None:
        """Provide real-time coaching for facial expressions."""
        if self.persona != CoachingPersona.COACH:
            return
            
        # Get grounded coaching suggestion
        coaching_context = {
            "analysis": analysis,
            "user_intent": "authentic_expression",
            "detected_issue": "masking" if analysis.get("expression_state", {}).get("masking_detected") else "flat_affect"
        }
        
        suggestion = await self.grounding.get_coaching_suggestion(coaching_context)
        
        feedback = {
            "type": "coaching_feedback",
            "category": "expression",
            "observation": analysis.get("observation", ""),
            "suggestion": suggestion.get("suggestion", ""),
            "technique": suggestion.get("technique_name", ""),
            "urgency": "normal"
        }
        
        await self._send_to_client(feedback)
        
        self.logger.log_coaching_feedback(
            feedback_type="expression",
            suggestion=suggestion.get("suggestion", ""),
            urgency="normal"
        )
        
    async def _complete_calibration(self, data: dict) -> None:
        """Complete calibration and transition to coaching mode."""
        self.baseline_metrics = data.get("baseline_metrics", {})
        self.signal_analyzer.set_baseline(self.baseline_metrics)
        
        self.state = SessionState.COACHING
        self.logger.info("Calibration complete, transitioning to coaching mode")
        
        await self._send_to_client({
            "type": "calibration_complete",
            "message": "Great! Calibration complete. I'm now ready to coach you in real-time.",
            "state": self.state.value
        })
        
    async def handle_interrupt(self, data: dict) -> dict:
        """
        Handle a 'barge-in' interrupt from the user.
        
        Example: "Wait, stop—did that sound sarcastic?"
        """
        self.logger.info("Processing user interrupt")
        
        question = data.get("question", "")
        
        # Pause current coaching
        previous_state = self.state
        self.state = SessionState.PAUSED
        
        # Get Gemini's analysis of the recent interaction
        recent_context = self._get_recent_context()
        
        response = await self.gemini.analyze_interrupt(
            question=question,
            recent_context=recent_context
        )
        
        # Ground the response in clinical techniques
        grounded_response = await self.grounding.ground_response(response)
        
        # Resume coaching
        self.state = previous_state
        
        feedback = {
            "type": "interrupt_response",
            "question": question,
            "analysis": grounded_response.get("analysis", ""),
            "suggestion": grounded_response.get("suggestion", ""),
            "example": grounded_response.get("example", "")
        }
        
        await self._send_to_client(feedback)
        
        return feedback
        
    async def _check_safe_state_trigger(self, analysis: dict) -> None:
        """Check if safe-state mode should be activated."""
        distress_score = analysis.get("distress_score", 0)
        self.distress_scores.append(distress_score)
        
        # Check rolling average of distress scores
        recent_scores = self.distress_scores[-5:]
        avg_distress = sum(recent_scores) / len(recent_scores)
        
        if avg_distress > settings.DISTRESS_THRESHOLD:
            await self.activate_safe_state(
                trigger_reason="sustained_distress",
                distress_score=avg_distress
            )
            
    async def activate_safe_state(
        self,
        trigger_reason: str = "manual",
        distress_score: float = 0
    ) -> None:
        """
        Activate safe-state mode.
        
        Transitions from Coach to Support persona and provides
        crisis resources.
        """
        self.state = SessionState.SAFE_STATE
        self.persona = CoachingPersona.SUPPORT
        
        self.logger.log_safe_state_activation(trigger_reason, distress_score)
        
        # Get localized crisis resources via grounding
        crisis_resources = await self.grounding.get_crisis_resources()
        
        await self._send_to_client({
            "type": "safe_state_activated",
            "message": "I notice you might be going through a difficult moment. I'm here to support you.",
            "persona": self.persona.value,
            "resources": crisis_resources,
            "options": [
                "Would you like to take a break?",
                "Would you like me to stay with you quietly?",
                "Would you like to talk about what's happening?"
            ]
        })
        
    async def _pause_session(self) -> None:
        """Pause the coaching session."""
        self.state = SessionState.PAUSED
        self.logger.info("Session paused")
        
        await self._send_to_client({
            "type": "session_paused",
            "message": "Session paused. Take your time."
        })
        
    async def _resume_session(self) -> None:
        """Resume the coaching session."""
        self.state = SessionState.COACHING
        self.logger.info("Session resumed")
        
        await self._send_to_client({
            "type": "session_resumed",
            "message": "Welcome back! Ready when you are."
        })
        
    def _get_recent_context(self) -> dict:
        """Get recent coaching context for analysis."""
        return {
            "recent_feedback": self.coaching_history[-5:] if self.coaching_history else [],
            "current_state": self.state.value,
            "persona": self.persona.value,
            "session_duration": (datetime.utcnow() - self.started_at).total_seconds()
        }
        
    def get_state(self) -> dict:
        """Get the current session state."""
        return {
            "session_id": self.session_id,
            "state": self.state.value,
            "persona": self.persona.value,
            "started_at": self.started_at.isoformat(),
            "duration_seconds": (datetime.utcnow() - self.started_at).total_seconds(),
            "coaching_interactions": len(self.coaching_history)
        }
        
    async def _send_to_client(self, message: dict) -> None:
        """Send a message to the connected client."""
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
            
    async def close(self) -> None:
        """Close the session and cleanup resources."""
        self.state = SessionState.ENDED
        self.logger.info("Closing session")
        
        # Close Gemini stream
        if self.gemini_stream:
            await self.gemini_stream.close()
            
        # Send session summary
        await self._send_to_client({
            "type": "session_ended",
            "summary": {
                "duration_seconds": (datetime.utcnow() - self.started_at).total_seconds(),
                "coaching_interactions": len(self.coaching_history),
                "safe_state_triggered": SessionState.SAFE_STATE.value in [s.value for s in [self.state]]
            }
        })
        
    async def _handle_coaching_feedback(self, feedback: dict) -> None:
        """Handle coaching feedback from Gemini."""
        self.coaching_history.append(feedback)
        
        # Ground the feedback in clinical techniques
        grounded_feedback = await self.grounding.ground_response(feedback)
        
        await self._send_to_client({
            "type": "coaching_feedback",
            **grounded_feedback
        })

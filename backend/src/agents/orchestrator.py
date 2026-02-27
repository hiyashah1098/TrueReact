"""
TrueReact - ADK Agent Orchestrator

Coordinates multiple specialized agents for comprehensive
real-time social-emotional coaching.
"""

from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import asyncio
import json
import time

from src.agents.emotion_agent import EmotionAgent, EmotionState, EmotionCategory
from src.agents.safety_agent import SafetyAgent, SafetyAssessment, DistressLevel, SafetyAction
from src.agents.research_agent import ResearchAgent, GroundingResult, GroundedTechnique
from src.agents.coaching_agent import TrueReactAgent, AgentPersona, CoachingContext
from src.utils.logging import get_logger

logger = get_logger(__name__)


class OrchestratorMode(Enum):
    """Operating modes for the orchestrator."""
    ACTIVE_COACHING = "active_coaching"  # Full coaching feedback
    SUPPORTIVE = "supportive"  # Reduced coaching, more validation
    OBSERVER = "observer"  # Minimal intervention
    SAFE_STATE = "safe_state"  # Crisis mode, prioritize safety


@dataclass
class OrchestratedResponse:
    """Complete response from orchestrator."""
    # Emotion analysis
    emotion_state: Dict[str, Any]
    emotion_trend: Dict[str, Any]
    
    # Safety status
    safety_status: Dict[str, Any]
    safety_action: str
    
    # Coaching feedback (if appropriate)
    should_coach: bool
    coaching_feedback: Optional[Dict[str, Any]]
    
    # Grounded technique (if needed)
    technique: Optional[Dict[str, Any]]
    citations: List[Dict[str, str]]
    
    # Meta
    mode: str
    processing_time_ms: float
    agent_contributions: Dict[str, bool]


class AgentOrchestrator:
    """
    Orchestrates multiple ADK agents for comprehensive coaching.
    
    Agent Pipeline:
    1. Emotion Agent: Analyzes current emotional state
    2. Safety Agent: Assesses safety and distress levels
    3. Research Agent: Finds evidence-based techniques
    4. Coaching Agent: Generates appropriate response
    
    The orchestrator coordinates these agents, manages handoffs,
    and ensures safety considerations override coaching when needed.
    """
    
    def __init__(self):
        # Initialize all agents
        self.emotion_agent = EmotionAgent()
        self.safety_agent = SafetyAgent()
        self.research_agent = ResearchAgent()
        self.coaching_agent = TrueReactAgent()
        
        # State
        self.mode = OrchestratorMode.ACTIVE_COACHING
        self.session_id: Optional[str] = None
        self.is_initialized = False
        
        # Callbacks
        self.on_safety_alert: Optional[Callable[[SafetyAssessment], None]] = None
        self.on_mode_change: Optional[Callable[[OrchestratorMode], None]] = None
        
        # History
        self.response_history: List[OrchestratedResponse] = []
        
    def initialize(self, session_id: str) -> None:
        """Initialize all agents for a session."""
        self.session_id = session_id
        
        # Initialize each agent
        self.emotion_agent.initialize()
        self.safety_agent.initialize()
        self.research_agent.initialize()
        
        self.is_initialized = True
        logger.info(f"AgentOrchestrator initialized for session: {session_id}")
        
    def set_baseline(self, calibration_data: Dict[str, Any]) -> None:
        """Set baseline from calibration for relevant agents."""
        if "emotion_baseline" in calibration_data:
            self.emotion_agent.set_baseline(calibration_data["emotion_baseline"])
            
        logger.info("Baseline set for orchestrator agents")
        
    def set_mode(self, mode: OrchestratorMode) -> None:
        """Change orchestrator operating mode."""
        old_mode = self.mode
        self.mode = mode
        
        # Update coaching agent persona
        if mode == OrchestratorMode.ACTIVE_COACHING:
            self.coaching_agent.set_persona(AgentPersona.COACH)
        elif mode == OrchestratorMode.SUPPORTIVE:
            self.coaching_agent.set_persona(AgentPersona.SUPPORT)
        elif mode == OrchestratorMode.OBSERVER:
            self.coaching_agent.set_persona(AgentPersona.OBSERVER)
        elif mode == OrchestratorMode.SAFE_STATE:
            self.coaching_agent.set_persona(AgentPersona.SUPPORT)
            
        logger.info(f"Orchestrator mode changed: {old_mode.value} -> {mode.value}")
        
        if self.on_mode_change:
            self.on_mode_change(mode)
            
    async def process(
        self,
        audio_data: Optional[bytes] = None,
        video_frame: Optional[bytes] = None,
        audio_analysis: Optional[Dict[str, Any]] = None,
        video_analysis: Optional[Dict[str, Any]] = None,
        user_text: Optional[str] = None
    ) -> OrchestratedResponse:
        """
        Process multimodal inputs through the agent pipeline.
        
        This is the main entry point for the orchestrator.
        
        Args:
            audio_data: Raw audio bytes
            video_frame: Raw video frame
            audio_analysis: Pre-processed audio analysis
            video_analysis: Pre-processed video analysis
            user_text: Transcribed user speech
            
        Returns:
            OrchestratedResponse with complete analysis and feedback
        """
        start_time = time.time()
        agent_contributions = {
            "emotion": False,
            "safety": False,
            "research": False,
            "coaching": False
        }
        
        try:
            # === STAGE 1: Emotion Analysis ===
            emotion_state = await self.emotion_agent.analyze(
                video_frame=video_frame,
                audio_chunk=audio_data,
                audio_analysis=audio_analysis,
                video_analysis=video_analysis
            )
            agent_contributions["emotion"] = True
            
            emotion_dict = {
                "primary_emotion": emotion_state.primary_emotion.value,
                "intensity": emotion_state.intensity,
                "confidence": emotion_state.confidence,
                "congruence_score": emotion_state.congruence_score,
                "masking_detected": emotion_state.masking_detected
            }
            emotion_trend = self.emotion_agent.get_emotion_trend()
            
            # === STAGE 2: Safety Assessment ===
            safety_assessment = await self.safety_agent.assess(
                emotion_state=emotion_dict,
                audio_analysis=audio_analysis,
                video_analysis=video_analysis,
                user_text=user_text
            )
            agent_contributions["safety"] = True
            
            safety_dict = {
                "distress_level": safety_assessment.distress_level.value,
                "recommended_action": safety_assessment.recommended_action.value,
                "risk_factors": safety_assessment.risk_factors,
                "resources": safety_assessment.resources
            }
            
            # Handle safety alerts
            if safety_assessment.distress_level in [DistressLevel.HIGH, DistressLevel.CRISIS]:
                if self.on_safety_alert:
                    self.on_safety_alert(safety_assessment)
                    
                # Auto-switch to safe state mode if crisis
                if safety_assessment.distress_level == DistressLevel.CRISIS:
                    self.set_mode(OrchestratorMode.SAFE_STATE)
                elif safety_assessment.distress_level == DistressLevel.HIGH:
                    self.set_mode(OrchestratorMode.SUPPORTIVE)
            
            # === STAGE 3: Determine if coaching is appropriate ===
            should_coach = self._should_provide_coaching(
                emotion_state, safety_assessment
            )
            
            coaching_feedback = None
            technique = None
            citations = []
            
            if should_coach:
                # === STAGE 4: Research Grounding ===
                detected_pattern = self._identify_coaching_pattern(
                    emotion_state, audio_analysis, video_analysis
                )
                
                if detected_pattern:
                    grounding_result = await self.research_agent.find_techniques(
                        detected_pattern=detected_pattern,
                        severity=emotion_state.intensity
                    )
                    agent_contributions["research"] = True
                    
                    if grounding_result.techniques:
                        technique = self._technique_to_dict(
                            grounding_result.techniques[0]
                        )
                        citations = grounding_result.citations
                
                # === STAGE 5: Generate Coaching Feedback ===
                coaching_context = CoachingContext(
                    session_id=self.session_id or "unknown",
                    user_baseline=self.emotion_agent.baseline_emotions,
                    recent_signals=[emotion_dict],
                    interaction_history=[],
                    current_persona=self.coaching_agent.persona,
                    distress_level=emotion_state.intensity if emotion_state.primary_emotion in [
                        EmotionCategory.ANXIOUS, EmotionCategory.STRESSED
                    ] else 0.0
                )
                
                coaching_result = self.coaching_agent.analyze_signals(
                    context=coaching_context,
                    audio_analysis=audio_analysis,
                    video_analysis=video_analysis
                )
                agent_contributions["coaching"] = True
                
                coaching_feedback = self._build_coaching_feedback(
                    emotion_state, technique, coaching_result
                )
            else:
                # Provide supportive response instead
                coaching_feedback = self._build_supportive_response(
                    safety_assessment
                )
                
            # Build response
            processing_time = (time.time() - start_time) * 1000
            
            response = OrchestratedResponse(
                emotion_state=emotion_dict,
                emotion_trend=emotion_trend,
                safety_status=safety_dict,
                safety_action=safety_assessment.recommended_action.value,
                should_coach=should_coach,
                coaching_feedback=coaching_feedback,
                technique=technique,
                citations=citations,
                mode=self.mode.value,
                processing_time_ms=processing_time,
                agent_contributions=agent_contributions
            )
            
            self.response_history.append(response)
            
            return response
            
        except Exception as e:
            logger.error(f"Orchestrator processing error: {e}")
            return self._error_response(str(e), time.time() - start_time)
            
    def _should_provide_coaching(
        self,
        emotion_state: EmotionState,
        safety_assessment: SafetyAssessment
    ) -> bool:
        """Determine if coaching feedback is appropriate."""
        
        # Safety takes priority
        if safety_assessment.recommended_action in [
            SafetyAction.EMERGENCY_ESCALATION,
            SafetyAction.ACTIVATE_SAFE_STATE
        ]:
            return False
            
        if safety_assessment.recommended_action == SafetyAction.REDUCE_COACHING:
            return False
            
        # Check mode
        if self.mode == OrchestratorMode.SAFE_STATE:
            return False
        if self.mode == OrchestratorMode.OBSERVER:
            return False
            
        # Check if there's something to coach on
        if emotion_state.masking_detected:
            return True
        if emotion_state.congruence_score < 0.7:
            return True
        if emotion_state.intensity > 0.6 and emotion_state.primary_emotion in [
            EmotionCategory.ANXIOUS, EmotionCategory.STRESSED
        ]:
            return True
            
        return False
        
    def _identify_coaching_pattern(
        self,
        emotion_state: EmotionState,
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        """Identify the primary pattern to coach on."""
        
        # Priority order
        if emotion_state.masking_detected:
            return "masking"
            
        if emotion_state.congruence_score < 0.6:
            return "sarcasm_detection"  # Face-voice mismatch
            
        if audio_analysis:
            patterns = audio_analysis.get("patterns", [])
            if "rapid_speech" in patterns:
                return "rapid_speech"
            if "low_energy" in patterns or "flat" in str(audio_analysis.get("detected_state", "")):
                return "low_energy"
                
        if emotion_state.primary_emotion == EmotionCategory.ANXIOUS:
            return "anxiety"
            
        if emotion_state.primary_emotion in [EmotionCategory.SAD] and emotion_state.intensity < 0.4:
            return "flat_affect"
            
        return None
        
    def _build_coaching_feedback(
        self,
        emotion_state: EmotionState,
        technique: Optional[Dict[str, Any]],
        coaching_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build the coaching feedback structure."""
        
        feedback = {
            "type": "coaching",
            "observation": f"I noticed {emotion_state.primary_emotion.value} at {emotion_state.intensity:.0%} intensity",
            "interpretation": "",
            "suggestion": "",
            "encouragement": "You're doing great - awareness is the first step!",
            "technique": technique
        }
        
        if emotion_state.masking_detected:
            feedback["interpretation"] = (
                "Your expression might not be matching how you're feeling inside. "
                "That's common, and we can work on aligning them."
            )
        elif emotion_state.congruence_score < 0.7:
            feedback["interpretation"] = (
                "There's a mismatch between your facial expression and voice. "
                "Others might find this confusing."
            )
        else:
            feedback["interpretation"] = (
                "This could affect how others perceive your message."
            )
            
        if technique:
            feedback["suggestion"] = (
                f"Try the '{technique['name']}' technique: {technique['description']}"
            )
        else:
            feedback["suggestion"] = (
                "Take a breath and check: does your outside match your inside?"
            )
            
        return feedback
        
    def _build_supportive_response(
        self,
        safety_assessment: SafetyAssessment
    ) -> Dict[str, Any]:
        """Build supportive response when not coaching."""
        return {
            "type": "supportive",
            "message": safety_assessment.suggested_response or (
                "I'm here with you. Take your time."
            ),
            "resources": safety_assessment.resources
        }
        
    def _technique_to_dict(self, technique: GroundedTechnique) -> Dict[str, Any]:
        """Convert GroundedTechnique to dictionary."""
        return {
            "name": technique.name,
            "description": technique.description,
            "steps": technique.steps,
            "domain": technique.domain.value,
            "evidence_level": technique.evidence_level,
            "source": technique.source
        }
        
    def _error_response(self, error: str, elapsed: float) -> OrchestratedResponse:
        """Generate error response."""
        return OrchestratedResponse(
            emotion_state={"error": error},
            emotion_trend={},
            safety_status={"distress_level": "unknown"},
            safety_action="continue",
            should_coach=False,
            coaching_feedback=None,
            technique=None,
            citations=[],
            mode=self.mode.value,
            processing_time_ms=elapsed * 1000,
            agent_contributions={
                "emotion": False,
                "safety": False,
                "research": False,
                "coaching": False
            }
        )
        
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status for API."""
        return {
            "initialized": self.is_initialized,
            "session_id": self.session_id,
            "mode": self.mode.value,
            "agents": {
                "emotion": self.emotion_agent.to_dict() if self.is_initialized else {},
                "safety": self.safety_agent.to_dict() if self.is_initialized else {},
                "research": self.research_agent.to_dict() if self.is_initialized else {}
            },
            "responses_generated": len(self.response_history)
        }
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert orchestrator state to dictionary."""
        return self.get_status()

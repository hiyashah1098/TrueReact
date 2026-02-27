"""
TrueReact - ADK Safety Agent

Specialized agent for monitoring user safety, detecting distress signals,
and escalating to crisis resources when needed.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import json
import time

from google import genai
from google.genai import types

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class DistressLevel(Enum):
    """Distress severity levels."""
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRISIS = "crisis"


class SafetyAction(Enum):
    """Actions the safety agent can recommend."""
    CONTINUE = "continue"  # No safety concerns
    GENTLE_CHECK = "gentle_check"  # Ask how user is feeling
    REDUCE_COACHING = "reduce_coaching"  # Shift to supportive mode
    OFFER_RESOURCES = "offer_resources"  # Suggest crisis resources
    ACTIVATE_SAFE_STATE = "activate_safe_state"  # Trigger safe state mode
    EMERGENCY_ESCALATION = "emergency_escalation"  # Critical intervention needed


@dataclass
class SafetyAssessment:
    """Safety assessment result."""
    distress_level: DistressLevel
    recommended_action: SafetyAction
    confidence: float
    risk_factors: List[str]
    protective_factors: List[str]
    suggested_response: str
    resources: List[Dict[str, str]]
    timestamp: float


class SafetyAgent:
    """
    ADK Agent specialized in user safety monitoring.
    
    Capabilities:
    - Distress signal detection
    - Crisis risk assessment
    - Safe state activation
    - Resource recommendation
    - Escalation management
    """
    
    name = "TrueReact Safety Monitor"
    version = "1.0.0"
    description = "Real-time safety monitoring and crisis detection agent"
    
    capabilities = [
        "distress_detection",
        "crisis_assessment",
        "safe_state_management",
        "resource_recommendation",
        "escalation_handling"
    ]
    
    # Risk indicators to monitor
    RISK_INDICATORS = [
        "crying_detected",
        "voice_breaking",
        "prolonged_silence",
        "rapid_escalation",
        "verbal_distress_markers",
        "withdrawal_behavior",
        "self_critical_statements",
        "hopelessness_indicators"
    ]
    
    # Crisis keywords (for text analysis)
    CRISIS_KEYWORDS = [
        "suicide", "kill myself", "want to die", "end it",
        "can't go on", "no point", "give up", "hurt myself",
        "self-harm", "cutting", "overdose"
    ]
    
    def __init__(self):
        self.client = None
        self.assessment_history: List[SafetyAssessment] = []
        self.current_distress_level = DistressLevel.NONE
        self.escalation_active = False
        
        # Crisis resources database
        self.crisis_resources = {
            "US": [
                {
                    "name": "988 Suicide & Crisis Lifeline",
                    "contact": "988",
                    "type": "call_or_text",
                    "description": "24/7 support for mental health crises"
                },
                {
                    "name": "Crisis Text Line",
                    "contact": "Text HOME to 741741",
                    "type": "text",
                    "description": "Text-based crisis support"
                },
                {
                    "name": "SAMHSA National Helpline",
                    "contact": "1-800-662-4357",
                    "type": "call",
                    "description": "Mental health and substance abuse referrals"
                }
            ],
            "international": [
                {
                    "name": "International Association for Suicide Prevention",
                    "contact": "https://www.iasp.info/resources/Crisis_Centres/",
                    "type": "directory",
                    "description": "Find crisis centers worldwide"
                },
                {
                    "name": "FindAHelpline",
                    "contact": "https://findahelpline.com",
                    "type": "directory",
                    "description": "Global mental health helpline directory"
                }
            ]
        }
        
        self.system_prompt = """You are a safety monitoring system for a mental health coaching app.

CRITICAL RESPONSIBILITY: Protect user wellbeing and detect distress.

DISTRESS SIGNALS TO MONITOR:
1. VOCAL: Crying, voice breaking, prolonged silence, trembling voice
2. VISUAL: Tears, distressed expressions, self-soothing gestures
3. BEHAVIORAL: Rapid emotional escalation, withdrawal, agitation
4. VERBAL: Hopelessness, self-criticism, crisis keywords

ASSESSMENT CRITERIA:
- NONE: User appears calm and engaged
- LOW: Mild frustration or sadness, still engaged
- MODERATE: Visible distress, may benefit from support
- HIGH: Significant distress, should offer resources
- CRISIS: Immediate safety concern, escalate

OUTPUT FORMAT (JSON):
{
    "distress_level": "none|low|moderate|high|crisis",
    "confidence": 0.0-1.0,
    "risk_factors": ["list of observed risks"],
    "protective_factors": ["positive elements observed"],
    "recommended_action": "continue|gentle_check|reduce_coaching|offer_resources|activate_safe_state|emergency_escalation",
    "suggested_response": "what to say to the user",
    "reasoning": "brief explanation"
}

SAFETY PRINCIPLES:
- When in doubt, err on the side of caution
- Never minimize distress signals
- Validate feelings before offering resources
- Maintain warm, supportive tone
- Never provide medical advice
"""
        
    def initialize(self) -> None:
        """Initialize the safety agent."""
        if self.client is None:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("SafetyAgent initialized")
        
    async def assess(
        self,
        emotion_state: Optional[Dict[str, Any]] = None,
        audio_analysis: Optional[Dict[str, Any]] = None,
        video_analysis: Optional[Dict[str, Any]] = None,
        user_text: Optional[str] = None,
        interaction_history: Optional[List[Dict[str, Any]]] = None
    ) -> SafetyAssessment:
        """
        Assess user's safety status.
        
        Args:
            emotion_state: Current emotion analysis
            audio_analysis: Audio signal analysis
            video_analysis: Video signal analysis
            user_text: Any text from user (transcriptions, messages)
            interaction_history: Recent interaction history
            
        Returns:
            SafetyAssessment with recommended actions
        """
        try:
            # Check for immediate crisis keywords
            if user_text and self._check_crisis_keywords(user_text):
                return self._create_crisis_assessment(
                    "Crisis keywords detected in user speech"
                )
            
            # Build assessment context
            context = self._build_assessment_context(
                emotion_state, audio_analysis, video_analysis,
                user_text, interaction_history
            )
            
            # Use Gemini for assessment (with fallback)
            if self.client:
                result = await self._gemini_assess(context)
            else:
                result = self._fallback_assess(emotion_state, audio_analysis)
            
            # Create assessment object
            assessment = SafetyAssessment(
                distress_level=DistressLevel(result.get("distress_level", "none")),
                recommended_action=SafetyAction(result.get("recommended_action", "continue")),
                confidence=result.get("confidence", 0.5),
                risk_factors=result.get("risk_factors", []),
                protective_factors=result.get("protective_factors", []),
                suggested_response=result.get("suggested_response", ""),
                resources=self._get_relevant_resources(
                    DistressLevel(result.get("distress_level", "none"))
                ),
                timestamp=time.time()
            )
            
            # Update state
            self.current_distress_level = assessment.distress_level
            self.assessment_history.append(assessment)
            
            # Track escalation
            if assessment.distress_level in [DistressLevel.HIGH, DistressLevel.CRISIS]:
                self.escalation_active = True
                logger.warning(f"Safety escalation: {assessment.distress_level.value}")
            
            return assessment
            
        except Exception as e:
            logger.error(f"Safety assessment error: {e}")
            return self._safe_default_assessment()
            
    def _check_crisis_keywords(self, text: str) -> bool:
        """Check for crisis keywords in text."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.CRISIS_KEYWORDS)
        
    def _create_crisis_assessment(self, reason: str) -> SafetyAssessment:
        """Create an immediate crisis assessment."""
        logger.critical(f"CRISIS DETECTED: {reason}")
        
        return SafetyAssessment(
            distress_level=DistressLevel.CRISIS,
            recommended_action=SafetyAction.EMERGENCY_ESCALATION,
            confidence=0.95,
            risk_factors=[reason],
            protective_factors=["User is engaged with support app"],
            suggested_response=(
                "I hear you, and I'm concerned about what you're sharing. "
                "Your safety matters. Would you be willing to reach out to "
                "a crisis counselor who can provide immediate support? "
                "You can call or text 988 anytime."
            ),
            resources=self.crisis_resources["US"],
            timestamp=time.time()
        )
        
    async def _gemini_assess(self, context: str) -> Dict[str, Any]:
        """Use Gemini for safety assessment."""
        try:
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[context],
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.2,  # Low temperature for safety-critical
                    response_mime_type="application/json"
                )
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Gemini safety assessment failed: {e}")
            return self._fallback_assess(None, None)
            
    def _build_assessment_context(
        self,
        emotion_state: Optional[Dict[str, Any]],
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]],
        user_text: Optional[str],
        interaction_history: Optional[List[Dict[str, Any]]]
    ) -> str:
        """Build context for safety assessment."""
        parts = ["SAFETY ASSESSMENT REQUEST\n"]
        
        if emotion_state:
            parts.append(f"""
EMOTION STATE:
- Primary: {emotion_state.get('primary_emotion', 'unknown')}
- Intensity: {emotion_state.get('intensity', 0)}
- Trend: {emotion_state.get('trend', {}).get('trend', 'unknown')}
""")
            
        if audio_analysis:
            parts.append(f"""
AUDIO SIGNALS:
- Detected state: {audio_analysis.get('detected_state', 'unknown')}
- Distress score: {audio_analysis.get('distress_score', 0)}
- Patterns: {audio_analysis.get('patterns', [])}
""")
            
        if user_text:
            parts.append(f"""
USER SPEECH (transcribed):
"{user_text}"
""")
            
        # Add recent history
        if interaction_history and len(interaction_history) > 0:
            recent = interaction_history[-5:]
            parts.append(f"""
RECENT INTERACTION HISTORY:
{json.dumps(recent, indent=2)}
""")
            
        parts.append("\nProvide safety assessment.")
        
        return "\n".join(parts)
        
    def _fallback_assess(
        self,
        emotion_state: Optional[Dict[str, Any]],
        audio_analysis: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Fallback assessment when Gemini unavailable."""
        
        distress_level = "none"
        action = "continue"
        
        # Check emotion state
        if emotion_state:
            intensity = emotion_state.get("intensity", 0)
            emotion = emotion_state.get("primary_emotion", "neutral")
            
            if emotion in ["anxious", "stressed", "fearful"] and intensity > 0.7:
                distress_level = "moderate"
                action = "gentle_check"
            elif emotion in ["sad"] and intensity > 0.8:
                distress_level = "high"
                action = "offer_resources"
                
        # Check audio
        if audio_analysis:
            distress_score = audio_analysis.get("distress_score", 0)
            if distress_score > 0.8:
                distress_level = "high"
                action = "offer_resources"
            elif distress_score > 0.6:
                distress_level = "moderate"
                action = "reduce_coaching"
                
        return {
            "distress_level": distress_level,
            "confidence": 0.6,
            "risk_factors": [],
            "protective_factors": ["engaged_with_app"],
            "recommended_action": action,
            "suggested_response": self._get_default_response(distress_level)
        }
        
    def _get_default_response(self, distress_level: str) -> str:
        """Get default supportive response based on distress level."""
        responses = {
            "none": "",
            "low": "How are you feeling right now?",
            "moderate": "I notice you might be having a difficult moment. That's okay. Would you like to take a short break?",
            "high": "I want to check in with you. It seems like things might be difficult right now. I'm here to support you, and there are people who can help if you'd like to talk to someone.",
            "crisis": "I'm concerned about what you're experiencing. Your safety matters. Please reach out to a crisis counselor who can help - call or text 988."
        }
        return responses.get(distress_level, "")
        
    def _get_relevant_resources(self, level: DistressLevel) -> List[Dict[str, str]]:
        """Get relevant crisis resources based on distress level."""
        if level in [DistressLevel.HIGH, DistressLevel.CRISIS]:
            return self.crisis_resources["US"]
        elif level == DistressLevel.MODERATE:
            return self.crisis_resources["US"][:1]  # Just primary resource
        return []
        
    def _safe_default_assessment(self) -> SafetyAssessment:
        """Return safe default assessment for errors."""
        return SafetyAssessment(
            distress_level=DistressLevel.NONE,
            recommended_action=SafetyAction.CONTINUE,
            confidence=0.3,
            risk_factors=[],
            protective_factors=[],
            suggested_response="",
            resources=[],
            timestamp=time.time()
        )
        
    def get_current_status(self) -> Dict[str, Any]:
        """Get current safety status for API."""
        if self.assessment_history:
            latest = self.assessment_history[-1]
            return {
                "distress_level": latest.distress_level.value,
                "recommended_action": latest.recommended_action.value,
                "escalation_active": self.escalation_active,
                "resources_available": len(latest.resources) > 0
            }
        return {
            "distress_level": "none",
            "recommended_action": "continue",
            "escalation_active": False,
            "resources_available": False
        }
        
    def acknowledge_escalation(self) -> None:
        """Mark escalation as acknowledged by user."""
        self.escalation_active = False
        logger.info("Safety escalation acknowledged")
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert current state to dictionary."""
        return self.get_current_status()

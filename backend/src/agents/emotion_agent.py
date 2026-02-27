"""
TrueReact - ADK Emotion Analysis Agent

Specialized agent for real-time emotion detection and analysis
using Gemini's multimodal capabilities.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import json

from google import genai
from google.genai import types

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class EmotionCategory(Enum):
    """Primary emotion categories detected."""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    SURPRISED = "surprised"
    DISGUSTED = "disgusted"
    ANXIOUS = "anxious"
    STRESSED = "stressed"
    CONFUSED = "confused"


@dataclass
class EmotionState:
    """Represents the current emotional state."""
    primary_emotion: EmotionCategory
    intensity: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    secondary_emotions: List[Dict[str, float]]
    facial_indicators: Dict[str, Any]
    vocal_indicators: Dict[str, Any]
    congruence_score: float  # How well face matches voice
    masking_detected: bool
    timestamp: float


class EmotionAgent:
    """
    ADK Agent specialized in emotion detection and analysis.
    
    Capabilities:
    - Facial micro-expression analysis
    - Vocal emotion detection
    - Face-voice congruence checking
    - Masking and flat affect detection
    - Real-time emotion tracking
    """
    
    name = "TrueReact Emotion Analyzer"
    version = "1.0.0"
    description = "Real-time multimodal emotion analysis agent"
    
    capabilities = [
        "facial_expression_analysis",
        "vocal_emotion_detection",
        "micro_expression_detection",
        "masking_detection",
        "congruence_analysis",
        "emotion_tracking"
    ]
    
    def __init__(self):
        self.client = None
        self.emotion_history: List[EmotionState] = []
        self.baseline_emotions: Optional[Dict[str, float]] = None
        self.calibration_complete = False
        
        self.system_prompt = """You are an expert emotion analysis system.

TASK: Analyze multimodal signals to detect emotional states.

INPUT ANALYSIS:
1. FACIAL SIGNALS:
   - Micro-expressions (brief <0.5s expressions)
   - Eye region: crow's feet (genuine smile), eyebrow position
   - Mouth region: lip compression, smile symmetry
   - Overall expression intensity

2. VOCAL SIGNALS:
   - Pitch patterns (high=stress/excitement, low=sadness/fatigue)
   - Speaking rate (fast=anxiety, slow=depression)
   - Voice tremor or breaks
   - Tone warmth vs flatness

OUTPUT FORMAT (JSON):
{
    "primary_emotion": "emotion_category",
    "intensity": 0.0-1.0,
    "confidence": 0.0-1.0,
    "secondary_emotions": [{"emotion": "name", "intensity": 0.0-1.0}],
    "facial_indicators": {
        "expression": "description",
        "eye_region": "description",
        "mouth_region": "description",
        "micro_expressions_detected": []
    },
    "vocal_indicators": {
        "pitch_pattern": "high/normal/low",
        "speaking_rate": "fast/normal/slow",
        "tone_quality": "warm/neutral/flat",
        "tremor_detected": false
    },
    "congruence_score": 0.0-1.0,
    "masking_detected": false,
    "analysis_notes": "brief interpretation"
}

IMPORTANT:
- Be precise and evidence-based
- Note any incongruence between face and voice
- Detect masking (forced expressions hiding true feelings)
- Track changes from baseline if provided
"""
        
    def initialize(self) -> None:
        """Initialize the emotion agent."""
        if self.client is None:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("EmotionAgent initialized")
        
    def set_baseline(self, baseline_data: Dict[str, Any]) -> None:
        """Set user's emotional baseline from calibration."""
        self.baseline_emotions = baseline_data
        self.calibration_complete = True
        logger.info(f"Emotion baseline set: {baseline_data}")
        
    async def analyze(
        self,
        video_frame: Optional[bytes] = None,
        audio_chunk: Optional[bytes] = None,
        audio_analysis: Optional[Dict[str, Any]] = None,
        video_analysis: Optional[Dict[str, Any]] = None
    ) -> EmotionState:
        """
        Analyze multimodal inputs for emotion detection.
        
        Args:
            video_frame: Raw video frame bytes
            audio_chunk: Raw audio bytes
            audio_analysis: Pre-processed audio analysis
            video_analysis: Pre-processed video analysis
            
        Returns:
            EmotionState with detected emotions
        """
        try:
            # Build analysis context
            context = self._build_analysis_context(
                audio_analysis, video_analysis
            )
            
            # Use Gemini for analysis
            if self.client:
                result = await self._gemini_analyze(context, video_frame, audio_chunk)
            else:
                result = self._fallback_analyze(audio_analysis, video_analysis)
            
            # Create EmotionState
            emotion_state = EmotionState(
                primary_emotion=EmotionCategory(result.get("primary_emotion", "neutral")),
                intensity=result.get("intensity", 0.5),
                confidence=result.get("confidence", 0.5),
                secondary_emotions=result.get("secondary_emotions", []),
                facial_indicators=result.get("facial_indicators", {}),
                vocal_indicators=result.get("vocal_indicators", {}),
                congruence_score=result.get("congruence_score", 1.0),
                masking_detected=result.get("masking_detected", False),
                timestamp=self._get_timestamp()
            )
            
            # Track history
            self.emotion_history.append(emotion_state)
            if len(self.emotion_history) > 100:
                self.emotion_history = self.emotion_history[-100:]
            
            return emotion_state
            
        except Exception as e:
            logger.error(f"Emotion analysis error: {e}")
            return self._default_emotion_state()
            
    async def _gemini_analyze(
        self,
        context: str,
        video_frame: Optional[bytes],
        audio_chunk: Optional[bytes]
    ) -> Dict[str, Any]:
        """Use Gemini for emotion analysis."""
        try:
            contents = [context]
            
            # Add video frame if available
            if video_frame:
                import base64
                encoded = base64.b64encode(video_frame).decode('utf-8')
                contents.append(types.Part.from_data(
                    data=video_frame,
                    mime_type="image/jpeg"
                ))
            
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Gemini emotion analysis failed: {e}")
            return self._fallback_analyze(None, None)
            
    def _build_analysis_context(
        self,
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]]
    ) -> str:
        """Build context string for analysis."""
        context_parts = ["Analyze the following signals:\n"]
        
        if audio_analysis:
            context_parts.append(f"""
AUDIO SIGNALS:
- Energy level: {audio_analysis.get('energy', 'unknown')}
- Pitch estimate: {audio_analysis.get('pitch_estimate', 'unknown')} Hz
- Speech rate: {audio_analysis.get('speech_rate', 'unknown')}
- Detected patterns: {audio_analysis.get('patterns', [])}
- Detected state: {audio_analysis.get('detected_state', 'unknown')}
""")
            
        if video_analysis:
            context_parts.append(f"""
VIDEO SIGNALS:
- Detected expressions: {video_analysis.get('expressions', [])}
- Eye region: {video_analysis.get('eye_analysis', 'unknown')}
- Mouth region: {video_analysis.get('mouth_analysis', 'unknown')}
- Micro-expressions: {video_analysis.get('micro_expressions', [])}
""")
            
        if self.baseline_emotions:
            context_parts.append(f"""
USER BASELINE (for comparison):
{json.dumps(self.baseline_emotions, indent=2)}
""")
            
        return "\n".join(context_parts)
        
    def _fallback_analyze(
        self,
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Fallback analysis when Gemini is unavailable."""
        
        # Infer emotion from available signals
        primary_emotion = "neutral"
        intensity = 0.5
        
        if audio_analysis:
            state = audio_analysis.get("detected_state", "neutral")
            if "anxious" in state or "rapid" in str(audio_analysis.get("patterns", [])):
                primary_emotion = "anxious"
                intensity = 0.7
            elif "low" in state or "flat" in str(audio_analysis.get("patterns", [])):
                primary_emotion = "sad"
                intensity = 0.6
                
        return {
            "primary_emotion": primary_emotion,
            "intensity": intensity,
            "confidence": 0.6,
            "secondary_emotions": [],
            "facial_indicators": {},
            "vocal_indicators": audio_analysis or {},
            "congruence_score": 0.8,
            "masking_detected": False
        }
        
    def _default_emotion_state(self) -> EmotionState:
        """Return default emotion state for errors."""
        return EmotionState(
            primary_emotion=EmotionCategory.NEUTRAL,
            intensity=0.5,
            confidence=0.3,
            secondary_emotions=[],
            facial_indicators={},
            vocal_indicators={},
            congruence_score=1.0,
            masking_detected=False,
            timestamp=self._get_timestamp()
        )
        
    def _get_timestamp(self) -> float:
        """Get current timestamp."""
        import time
        return time.time()
        
    def get_emotion_trend(self, window_seconds: int = 60) -> Dict[str, Any]:
        """
        Get emotion trend over a time window.
        
        Returns:
            Trend analysis including dominant emotions and changes
        """
        import time
        current_time = time.time()
        cutoff = current_time - window_seconds
        
        recent = [e for e in self.emotion_history if e.timestamp > cutoff]
        
        if not recent:
            return {"trend": "stable", "dominant": "neutral", "changes": 0}
            
        # Count emotions
        emotion_counts: Dict[str, int] = {}
        total_intensity = 0.0
        
        for state in recent:
            emotion = state.primary_emotion.value
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_intensity += state.intensity
            
        dominant = max(emotion_counts, key=emotion_counts.get)
        avg_intensity = total_intensity / len(recent)
        
        # Detect trend
        if len(recent) >= 3:
            first_half = recent[:len(recent)//2]
            second_half = recent[len(recent)//2:]
            
            first_avg = sum(e.intensity for e in first_half) / len(first_half)
            second_avg = sum(e.intensity for e in second_half) / len(second_half)
            
            if second_avg > first_avg + 0.1:
                trend = "escalating"
            elif second_avg < first_avg - 0.1:
                trend = "de-escalating"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
            
        return {
            "trend": trend,
            "dominant_emotion": dominant,
            "average_intensity": avg_intensity,
            "emotion_distribution": emotion_counts,
            "sample_count": len(recent),
            "masking_instances": sum(1 for e in recent if e.masking_detected)
        }
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert current state to dictionary for API responses."""
        if self.emotion_history:
            latest = self.emotion_history[-1]
            return {
                "primary_emotion": latest.primary_emotion.value,
                "intensity": latest.intensity,
                "confidence": latest.confidence,
                "congruence_score": latest.congruence_score,
                "masking_detected": latest.masking_detected,
                "trend": self.get_emotion_trend()
            }
        return {"status": "no_data"}

"""
TrueReact - Signal Analyzer

Analyzes audio and video signals to detect social-emotional patterns
including micro-expressions, vocal patterns, and distress markers.
"""

import base64
from typing import Dict, Any, Optional, List
import numpy as np

from src.utils.logging import get_logger

logger = get_logger(__name__)


class SignalAnalyzer:
    """
    Analyzes multimodal signals for social-emotional coaching.
    
    Detects:
    - Facial micro-expressions and masking
    - Vocal patterns (pitch, pace, energy)
    - Posture and body language
    - Distress markers
    """
    
    def __init__(self):
        self.baseline: Optional[Dict[str, Any]] = None
        self.history: List[Dict[str, Any]] = []
        
        # Thresholds for detection
        self.thresholds = {
            "masking_confidence": 0.7,
            "flat_affect_variance": 0.1,
            "rapid_speech_wpm": 180,
            "slow_speech_wpm": 100,
            "pitch_drop_hz": 50,
            "distress_score": 0.7
        }
        
    def set_baseline(self, metrics: Dict[str, Any]) -> None:
        """
        Set baseline metrics from calibration phase.
        
        Args:
            metrics: Baseline metrics for the user
        """
        self.baseline = metrics
        logger.info(f"Baseline set: {metrics}")
        
    def analyze_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Analyze audio for vocal patterns.
        
        Args:
            audio_data: Raw audio bytes (PCM format expected)
            
        Returns:
            Analysis results including detected patterns
        """
        try:
            # Convert audio bytes to numpy array for analysis
            audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
            
            if len(audio_array) == 0:
                return self._empty_audio_analysis()
                
            # Normalize audio
            audio_array = audio_array / 32768.0
            
            # Calculate audio features
            analysis = {
                "energy": self._calculate_energy(audio_array),
                "pitch_estimate": self._estimate_pitch(audio_array),
                "speech_rate": self._estimate_speech_rate(audio_array),
                "silence_ratio": self._calculate_silence_ratio(audio_array)
            }
            
            # Detect vocal patterns
            patterns = self._detect_vocal_patterns(analysis)
            analysis["patterns"] = patterns
            
            # Calculate distress score
            distress_score = self._calculate_vocal_distress(analysis)
            analysis["distress_score"] = distress_score
            
            # Determine detected state
            analysis["detected_state"] = self._determine_vocal_state(analysis)
            analysis["confidence"] = self._calculate_confidence(analysis)
            
            # Store in history
            self.history.append({"type": "audio", "analysis": analysis})
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing audio: {e}")
            return self._empty_audio_analysis()
            
    def _empty_audio_analysis(self) -> Dict[str, Any]:
        """Return empty audio analysis structure."""
        return {
            "energy": 0,
            "pitch_estimate": 0,
            "speech_rate": 0,
            "silence_ratio": 1.0,
            "patterns": [],
            "distress_score": 0,
            "detected_state": "unknown",
            "confidence": 0
        }
        
    def _calculate_energy(self, audio: np.ndarray) -> float:
        """Calculate RMS energy of audio."""
        return float(np.sqrt(np.mean(audio ** 2)))
        
    def _estimate_pitch(self, audio: np.ndarray, sample_rate: int = 16000) -> float:
        """
        Estimate fundamental frequency using zero-crossing rate.
        
        This is a simplified estimation; production would use
        more sophisticated pitch detection (e.g., CREPE, pYIN).
        """
        # Count zero crossings
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio)))) / 2
        duration = len(audio) / sample_rate
        
        if duration > 0:
            # Estimate frequency from zero crossing rate
            return float(zero_crossings / (2 * duration))
        return 0
        
    def _estimate_speech_rate(self, audio: np.ndarray) -> float:
        """
        Estimate speech rate (words per minute).
        
        Uses energy envelope to detect syllables as a proxy for WPM.
        """
        # Calculate energy envelope
        window_size = 160  # 10ms at 16kHz
        if len(audio) < window_size:
            return 0
            
        # Compute short-term energy
        energy = []
        for i in range(0, len(audio) - window_size, window_size):
            window = audio[i:i + window_size]
            energy.append(np.sqrt(np.mean(window ** 2)))
            
        energy = np.array(energy)
        
        # Count syllables (energy peaks)
        threshold = np.mean(energy) * 0.5
        above_threshold = energy > threshold
        syllables = np.sum(np.diff(above_threshold.astype(int)) > 0)
        
        # Estimate WPM (average ~1.5 syllables per word)
        duration_minutes = len(audio) / 16000 / 60
        if duration_minutes > 0:
            wpm = (syllables / 1.5) / duration_minutes
            return float(min(wpm, 300))  # Cap at reasonable maximum
        return 0
        
    def _calculate_silence_ratio(self, audio: np.ndarray) -> float:
        """Calculate ratio of silence in the audio."""
        threshold = 0.01
        silent_samples = np.sum(np.abs(audio) < threshold)
        return float(silent_samples / len(audio)) if len(audio) > 0 else 1.0
        
    def _detect_vocal_patterns(self, analysis: Dict[str, Any]) -> List[str]:
        """Detect vocal patterns from analysis."""
        patterns = []
        
        speech_rate = analysis.get("speech_rate", 0)
        energy = analysis.get("energy", 0)
        pitch = analysis.get("pitch_estimate", 0)
        
        # Check for rapid speech (anxiety indicator)
        if speech_rate > self.thresholds["rapid_speech_wpm"]:
            patterns.append("rapid_speech")
            
        # Check for slow speech (low energy indicator)
        if 0 < speech_rate < self.thresholds["slow_speech_wpm"]:
            patterns.append("slow_speech")
            
        # Check for low energy/pitch drop
        if self.baseline:
            baseline_pitch = self.baseline.get("pitch", 0)
            if baseline_pitch > 0 and pitch < baseline_pitch - self.thresholds["pitch_drop_hz"]:
                patterns.append("pitch_drop")
                
        # Check for monotone speech
        if energy < 0.02:
            patterns.append("low_energy")
            
        return patterns
        
    def _calculate_vocal_distress(self, analysis: Dict[str, Any]) -> float:
        """Calculate distress score from vocal analysis."""
        score = 0.0
        patterns = analysis.get("patterns", [])
        
        # Weight different patterns
        weights = {
            "rapid_speech": 0.3,
            "pitch_drop": 0.2,
            "low_energy": 0.2,
            "tremor": 0.4
        }
        
        for pattern in patterns:
            score += weights.get(pattern, 0.1)
            
        # Consider silence ratio (too much silence can indicate distress)
        silence_ratio = analysis.get("silence_ratio", 0)
        if silence_ratio > 0.8:
            score += 0.2
            
        return min(score, 1.0)
        
    def _determine_vocal_state(self, analysis: Dict[str, Any]) -> str:
        """Determine the overall vocal state."""
        patterns = analysis.get("patterns", [])
        
        if "rapid_speech" in patterns:
            return "anxious"
        elif "pitch_drop" in patterns or "low_energy" in patterns:
            return "low_energy"
        elif len(patterns) == 0:
            return "neutral"
        else:
            return "mixed"
            
    def _calculate_confidence(self, analysis: Dict[str, Any]) -> float:
        """Calculate confidence in the analysis."""
        # Higher confidence with more signal
        energy = analysis.get("energy", 0)
        silence_ratio = analysis.get("silence_ratio", 1)
        
        # More speech = higher confidence
        confidence = (1 - silence_ratio) * 0.5 + min(energy * 10, 0.5)
        return min(confidence, 1.0)
        
    def analyze_video(self, video_frame: bytes) -> Dict[str, Any]:
        """
        Analyze video frame for facial expressions and posture.
        
        Args:
            video_frame: Video frame data (JPEG/PNG encoded)
            
        Returns:
            Analysis results including detected expressions
        """
        try:
            # In production, this would use a facial analysis model
            # For now, we return a structured placeholder that would be
            # populated by Gemini's multimodal analysis
            
            analysis = {
                "expression_state": {
                    "masking_detected": False,
                    "flat_affect": False,
                    "microexpression_detected": False
                },
                "dominant_emotion": "neutral",
                "confidence": 0.5,
                "posture": {
                    "forward_lean": False,
                    "slouching": False,
                    "open_posture": True
                },
                "eye_contact": {
                    "maintained": True,
                    "duration_ratio": 0.7
                },
                "observation": ""
            }
            
            # Store in history
            self.history.append({"type": "video", "analysis": analysis})
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing video: {e}")
            return self._empty_video_analysis()
            
    def _empty_video_analysis(self) -> Dict[str, Any]:
        """Return empty video analysis structure."""
        return {
            "expression_state": {
                "masking_detected": False,
                "flat_affect": False,
                "microexpression_detected": False
            },
            "dominant_emotion": "unknown",
            "confidence": 0,
            "posture": {},
            "eye_contact": {},
            "observation": ""
        }
        
    def get_combined_analysis(self) -> Dict[str, Any]:
        """
        Get combined analysis from recent audio and video signals.
        
        Returns:
            Combined multimodal analysis
        """
        recent_audio = [h for h in self.history[-10:] if h["type"] == "audio"]
        recent_video = [h for h in self.history[-10:] if h["type"] == "video"]
        
        # Aggregate patterns
        audio_patterns = []
        for h in recent_audio:
            audio_patterns.extend(h["analysis"].get("patterns", []))
            
        # Calculate average distress
        distress_scores = [h["analysis"].get("distress_score", 0) for h in recent_audio]
        avg_distress = sum(distress_scores) / len(distress_scores) if distress_scores else 0
        
        return {
            "audio_patterns": list(set(audio_patterns)),
            "average_distress": avg_distress,
            "recent_audio_count": len(recent_audio),
            "recent_video_count": len(recent_video)
        }

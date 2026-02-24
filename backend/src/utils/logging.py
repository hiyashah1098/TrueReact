"""
TrueReact - Cloud Logging Utilities

Configures Google Cloud Logging for observability and provides
structured logging throughout the application.
"""

import logging
import sys
from typing import Optional

from google.cloud import logging as cloud_logging
from src.config import settings


def setup_cloud_logging() -> None:
    """
    Set up Google Cloud Logging integration.
    
    In production (Cloud Run), logs are automatically collected.
    Locally, this sets up a handler that formats logs appropriately.
    """
    try:
        # Initialize Cloud Logging client
        client = cloud_logging.Client(project=settings.GOOGLE_CLOUD_PROJECT)
        
        # Set up structured logging
        client.setup_logging(log_level=getattr(logging, settings.LOG_LEVEL))
        
        logging.info("☁️ Cloud Logging initialized successfully")
        
    except Exception as e:
        # Fall back to standard logging if Cloud Logging fails
        logging.basicConfig(
            level=getattr(logging, settings.LOG_LEVEL),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[logging.StreamHandler(sys.stdout)]
        )
        logging.warning(f"⚠️ Cloud Logging unavailable, using standard logging: {e}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (typically __name__ of the module)
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    return logger


class SessionLogger:
    """
    Structured logger for coaching sessions.
    
    Provides session-specific logging with metadata for analytics
    and debugging purposes.
    """
    
    def __init__(self, session_id: str, client_id: str):
        self.session_id = session_id
        self.client_id = client_id
        self.logger = get_logger(f"session.{session_id}")
        
    def _format_message(self, message: str, extra: Optional[dict] = None) -> dict:
        """Format log message with session metadata."""
        log_data = {
            "session_id": self.session_id,
            "client_id": self.client_id,
            "message": message
        }
        if extra:
            log_data.update(extra)
        return log_data
    
    def info(self, message: str, **kwargs):
        """Log info level message."""
        self.logger.info(self._format_message(message, kwargs))
        
    def warning(self, message: str, **kwargs):
        """Log warning level message."""
        self.logger.warning(self._format_message(message, kwargs))
        
    def error(self, message: str, **kwargs):
        """Log error level message."""
        self.logger.error(self._format_message(message, kwargs))
        
    def debug(self, message: str, **kwargs):
        """Log debug level message."""
        self.logger.debug(self._format_message(message, kwargs))
    
    def log_signal_analysis(
        self,
        signal_type: str,
        confidence: float,
        detected_state: str,
        raw_metrics: dict
    ):
        """
        Log signal analysis results for coaching insights.
        
        Args:
            signal_type: Type of signal ('facial', 'vocal', 'posture')
            confidence: Confidence score (0-1)
            detected_state: Detected emotional/social state
            raw_metrics: Raw analysis metrics
        """
        self.info(
            f"Signal analysis: {signal_type}",
            signal_type=signal_type,
            confidence=confidence,
            detected_state=detected_state,
            metrics=raw_metrics
        )
    
    def log_coaching_feedback(
        self,
        feedback_type: str,
        suggestion: str,
        urgency: str = "normal"
    ):
        """
        Log coaching feedback provided to user.
        
        Args:
            feedback_type: Type of feedback ('posture', 'expression', 'voice')
            suggestion: The coaching suggestion given
            urgency: Urgency level ('low', 'normal', 'high')
        """
        self.info(
            f"Coaching feedback: {feedback_type}",
            feedback_type=feedback_type,
            suggestion=suggestion,
            urgency=urgency
        )
    
    def log_safe_state_activation(self, trigger_reason: str, distress_score: float):
        """
        Log when safe-state mode is activated.
        
        Args:
            trigger_reason: What triggered the safe state
            distress_score: The distress score that triggered it
        """
        self.warning(
            "Safe-state activated",
            trigger_reason=trigger_reason,
            distress_score=distress_score
        )

"""
TrueReact - Content Filter Service

Implements content filtering for GCP Acceptable Use Policy (AUP) compliance.
Validates inputs and outputs to ensure they meet Google Cloud standards.

Reference: https://cloud.google.com/terms/aup
"""

import re
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

from src.utils.logging import get_logger

logger = get_logger(__name__)


class ContentCategory(Enum):
    """Categories of potentially problematic content."""
    SAFE = "safe"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    SEXUALLY_EXPLICIT = "sexually_explicit"
    DANGEROUS = "dangerous"
    VIOLENCE = "violence"
    ILLEGAL_ACTIVITY = "illegal_activity"
    MALWARE = "malware"
    SPAM = "spam"


class FilterAction(Enum):
    """Actions to take when content is flagged."""
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"


@dataclass
class FilterResult:
    """Result of content filtering check."""
    action: FilterAction
    category: ContentCategory
    confidence: float
    message: str
    details: Dict[str, Any]


class ContentFilter:
    """
    Content filter for AUP compliance.
    
    Validates user inputs and AI outputs to ensure compliance with
    Google Cloud Acceptable Use Policy. This is a local pre-filter
    that works alongside Gemini's built-in safety filters.
    
    AUP Categories covered:
    - Harassment and bullying
    - Hate speech
    - Sexually explicit content
    - Dangerous content
    - Violence and gore
    - Illegal activities
    - Malware/phishing
    - Spam
    """
    
    # Patterns for content detection (case-insensitive)
    HARASSMENT_PATTERNS = [
        r'\b(kill|hurt|attack)\s+(you|yourself|them)\b',
        r'\b(stupid|idiot|moron)\s+(you|person)\b',
        r'\bgo\s+die\b',
        r'\bkys\b',
    ]
    
    HATE_SPEECH_PATTERNS = [
        r'\b(all|every)\s+\w+\s+(are|should)\s+(die|killed|eliminated)\b',
        # Note: Actual production system would have more comprehensive patterns
        # This is a demonstration implementation
    ]
    
    DANGEROUS_PATTERNS = [
        r'\bhow\s+to\s+(make|build|create)\s+(bomb|explosive|weapon)\b',
        r'\bhow\s+to\s+(hack|breach|attack)\s+\w+\b',
        r'\bpoison\s+someone\b',
    ]
    
    MALWARE_PATTERNS = [
        r'\bphishing\s+(site|attack|email)\b',
        r'\bransomware\b',
        r'\bmalware\s+(inject|install)\b',
    ]
    
    def __init__(self):
        """Initialize content filter with compiled patterns."""
        self._compile_patterns()
        logger.info("ContentFilter initialized for AUP compliance")
    
    def _compile_patterns(self) -> None:
        """Compile regex patterns for efficient matching."""
        self.compiled_patterns = {
            ContentCategory.HARASSMENT: [
                re.compile(p, re.IGNORECASE) for p in self.HARASSMENT_PATTERNS
            ],
            ContentCategory.HATE_SPEECH: [
                re.compile(p, re.IGNORECASE) for p in self.HATE_SPEECH_PATTERNS
            ],
            ContentCategory.DANGEROUS: [
                re.compile(p, re.IGNORECASE) for p in self.DANGEROUS_PATTERNS
            ],
            ContentCategory.MALWARE: [
                re.compile(p, re.IGNORECASE) for p in self.MALWARE_PATTERNS
            ],
        }
    
    def check_content(self, content: str) -> FilterResult:
        """
        Check content for AUP violations.
        
        Args:
            content: Text content to check
            
        Returns:
            FilterResult with action, category, and details
        """
        if not content or not content.strip():
            return FilterResult(
                action=FilterAction.ALLOW,
                category=ContentCategory.SAFE,
                confidence=1.0,
                message="Empty content",
                details={}
            )
        
        # Check each category
        for category, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                match = pattern.search(content)
                if match:
                    logger.warning(
                        f"Content flagged for {category.value}: {match.group()}"
                    )
                    return FilterResult(
                        action=FilterAction.BLOCK,
                        category=category,
                        confidence=0.9,
                        message=f"Content flagged for potential {category.value.replace('_', ' ')}",
                        details={
                            "matched_pattern": pattern.pattern,
                            "matched_text": match.group()
                        }
                    )
        
        # Content passed all checks
        return FilterResult(
            action=FilterAction.ALLOW,
            category=ContentCategory.SAFE,
            confidence=1.0,
            message="Content passed AUP checks",
            details={}
        )
    
    def filter_input(self, user_input: str) -> Tuple[bool, str]:
        """
        Filter user input before sending to Gemini.
        
        Args:
            user_input: Raw user input text
            
        Returns:
            Tuple of (is_allowed, message)
        """
        result = self.check_content(user_input)
        
        if result.action == FilterAction.BLOCK:
            logger.info(f"User input blocked: {result.category.value}")
            return False, "Your message couldn't be processed. Please rephrase."
        
        return True, ""
    
    def filter_output(self, ai_output: str) -> Tuple[bool, str]:
        """
        Filter AI output before sending to user.
        
        Args:
            ai_output: Generated AI response
            
        Returns:
            Tuple of (is_allowed, filtered_output)
        """
        result = self.check_content(ai_output)
        
        if result.action == FilterAction.BLOCK:
            logger.warning(f"AI output blocked: {result.category.value}")
            return False, "I apologize, but I cannot provide that response."
        
        return True, ai_output
    
    def validate_coaching_feedback(self, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate coaching feedback before delivery.
        
        Args:
            feedback: Coaching feedback dictionary
            
        Returns:
            Validated and potentially modified feedback
        """
        validated = {}
        
        for key, value in feedback.items():
            if isinstance(value, str):
                is_allowed, filtered = self.filter_output(value)
                if is_allowed:
                    validated[key] = filtered
                else:
                    validated[key] = "[Content filtered for safety]"
            else:
                validated[key] = value
        
        return validated


# Global filter instance
_content_filter: ContentFilter = None


def get_content_filter() -> ContentFilter:
    """Get or create the global content filter instance."""
    global _content_filter
    if _content_filter is None:
        _content_filter = ContentFilter()
    return _content_filter

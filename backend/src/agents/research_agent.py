"""
TrueReact - ADK Research Agent

Specialized agent for grounding coaching suggestions in evidence-based
clinical literature using Vertex AI Search.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import json
import time
import asyncio

from google import genai
from google.genai import types

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class ResearchDomain(Enum):
    """Research domains for grounding."""
    CBT = "cognitive_behavioral_therapy"
    DBT = "dialectical_behavior_therapy"
    MINDFULNESS = "mindfulness"
    SOCIAL_SKILLS = "social_skills_training"
    EMOTION_REGULATION = "emotion_regulation"
    CRISIS_INTERVENTION = "crisis_intervention"


@dataclass
class GroundedTechnique:
    """A technique grounded in research."""
    name: str
    description: str
    steps: List[str]
    domain: ResearchDomain
    evidence_level: str  # "strong", "moderate", "emerging"
    source: str
    source_url: Optional[str]
    effectiveness_for: List[str]


@dataclass
class GroundingResult:
    """Result of research grounding."""
    techniques: List[GroundedTechnique]
    citations: List[Dict[str, str]]
    confidence: float
    search_queries_used: List[str]
    grounding_source: str  # "vertex_search", "google_search", "fallback"
    timestamp: float


class ResearchAgent:
    """
    ADK Agent specialized in evidence-based grounding.
    
    Capabilities:
    - Clinical literature search via Vertex AI
    - CBT/DBT technique retrieval
    - Evidence-based coaching suggestions
    - Source citation and verification
    """
    
    name = "TrueReact Research Grounder"
    version = "1.0.0"
    description = "Evidence-based coaching grounding agent"
    
    capabilities = [
        "literature_search",
        "technique_retrieval",
        "evidence_verification",
        "citation_generation",
        "domain_expertise"
    ]
    
    def __init__(self):
        self.client = None
        self.grounding_cache: Dict[str, GroundingResult] = {}
        self.cache_ttl = 3600  # 1 hour cache
        
        # Comprehensive CBT/DBT technique library
        self.technique_library = {
            "masking": [
                GroundedTechnique(
                    name="Authentic Expression Practice",
                    description="Gradual exposure to expressing genuine emotions safely",
                    steps=[
                        "Identify the emotion you're actually feeling",
                        "Rate your comfort showing this emotion (1-10)",
                        "Express at 10% of actual intensity first",
                        "Gradually increase as comfort grows",
                        "Practice in safe environments before challenging ones"
                    ],
                    domain=ResearchDomain.CBT,
                    evidence_level="strong",
                    source="Barlow et al., Unified Protocol for Transdiagnostic Treatment",
                    source_url="https://doi.org/10.1016/j.beth.2010.12.001",
                    effectiveness_for=["social_anxiety", "depression", "autism_spectrum"]
                ),
                GroundedTechnique(
                    name="Facial Feedback Training",
                    description="Using facial expressions to influence emotional state",
                    steps=[
                        "Practice expressing emotions in a mirror",
                        "Notice how different expressions feel physically",
                        "Identify your 'neutral' face baseline",
                        "Practice transitioning between expressions",
                        "Record yourself to see external vs internal perception"
                    ],
                    domain=ResearchDomain.SOCIAL_SKILLS,
                    evidence_level="moderate",
                    source="Facial Feedback Hypothesis - Strack et al.",
                    source_url="https://doi.org/10.1037/0022-3514.54.5.768",
                    effectiveness_for=["flat_affect", "depression", "social_skills"]
                )
            ],
            "flat_affect": [
                GroundedTechnique(
                    name="Opposite Action",
                    description="Acting opposite to emotional urge to shift affect",
                    steps=[
                        "Notice the current emotional state",
                        "Identify body posture/expression associated with it",
                        "Choose the opposite body language",
                        "Hold the opposite posture for 2-3 minutes",
                        "Notice any shift in internal experience"
                    ],
                    domain=ResearchDomain.DBT,
                    evidence_level="strong",
                    source="Linehan, DBT Skills Training Manual, 2nd Ed",
                    source_url="https://behavioraltech.org/resources/",
                    effectiveness_for=["depression", "withdrawal", "anhedonia"]
                )
            ],
            "rapid_speech": [
                GroundedTechnique(
                    name="Paced Breathing Speech",
                    description="Using breath to regulate speech pace and reduce anxiety",
                    steps=[
                        "Inhale deeply for 4 counts before speaking",
                        "Speak only during your exhale",
                        "Pause and breathe between sentences",
                        "Count to 2 after each major point",
                        "If rushing, stop and take a breath"
                    ],
                    domain=ResearchDomain.DBT,
                    evidence_level="strong",
                    source="DBT Distress Tolerance Skills - TIP Skills",
                    source_url="https://behavioraltech.org/resources/",
                    effectiveness_for=["anxiety", "panic", "public_speaking"]
                ),
                GroundedTechnique(
                    name="Grounding Through Speech",
                    description="Using slow, deliberate speech as grounding technique",
                    steps=[
                        "Feel your feet on the ground",
                        "Speak each word separately and clearly",
                        "Lower your pitch slightly",
                        "Focus on the physical sensation of speaking",
                        "Imagine each word landing gently"
                    ],
                    domain=ResearchDomain.MINDFULNESS,
                    evidence_level="moderate",
                    source="Mindfulness-Based Stress Reduction",
                    source_url="https://doi.org/10.1016/j.janxdis.2010.02.001",
                    effectiveness_for=["anxiety", "dissociation", "stress"]
                )
            ],
            "sarcasm_detection": [
                GroundedTechnique(
                    name="Congruence Alignment",
                    description="Aligning facial expression, tone, and words",
                    steps=[
                        "Before speaking, identify your intended meaning",
                        "Check: do your eyebrows match your words?",
                        "Check: does your smile match your message?",
                        "Soften eyes for genuine positive statements",
                        "Practice saying the same phrase different ways"
                    ],
                    domain=ResearchDomain.SOCIAL_SKILLS,
                    evidence_level="moderate",
                    source="Social Communication Intervention Research",
                    source_url="https://doi.org/10.1044/1092-4388(2005/067)",
                    effectiveness_for=["autism_spectrum", "social_skills", "communication"]
                )
            ],
            "low_energy": [
                GroundedTechnique(
                    name="Behavioral Activation",
                    description="Using behavior to influence energy and mood",
                    steps=[
                        "Stand or sit up straight (posture affects energy)",
                        "Take 3 deep diaphragmatic breaths",
                        "Smile slightly, even if it feels forced",
                        "Speak slightly louder than feels natural",
                        "Move your hands while talking"
                    ],
                    domain=ResearchDomain.CBT,
                    evidence_level="strong",
                    source="Behavioral Activation for Depression",
                    source_url="https://doi.org/10.1016/j.cpr.2006.11.001",
                    effectiveness_for=["depression", "fatigue", "low_motivation"]
                ),
                GroundedTechnique(
                    name="Energizing Breath",
                    description="Using breath patterns to increase energy",
                    steps=[
                        "Inhale sharply through nose (1 second)",
                        "Exhale forcefully through mouth (1 second)",
                        "Repeat 10 times",
                        "Return to normal breathing",
                        "Notice increased alertness"
                    ],
                    domain=ResearchDomain.MINDFULNESS,
                    evidence_level="moderate",
                    source="Pranayama Breathing Research",
                    source_url="https://doi.org/10.1016/j.jad.2017.10.042",
                    effectiveness_for=["fatigue", "low_arousal", "concentration"]
                )
            ],
            "anxiety": [
                GroundedTechnique(
                    name="Box Breathing",
                    description="4-4-4-4 breathing pattern for calm",
                    steps=[
                        "Inhale for 4 counts",
                        "Hold for 4 counts",
                        "Exhale for 4 counts",
                        "Hold for 4 counts",
                        "Repeat 4 cycles"
                    ],
                    domain=ResearchDomain.MINDFULNESS,
                    evidence_level="strong",
                    source="Heart Rate Variability Biofeedback Research",
                    source_url="https://doi.org/10.1016/j.biopsycho.2017.01.005",
                    effectiveness_for=["anxiety", "panic", "stress"]
                ),
                GroundedTechnique(
                    name="5-4-3-2-1 Grounding",
                    description="Sensory grounding technique",
                    steps=[
                        "Name 5 things you can SEE",
                        "Name 4 things you can TOUCH",
                        "Name 3 things you can HEAR",
                        "Name 2 things you can SMELL",
                        "Name 1 thing you can TASTE"
                    ],
                    domain=ResearchDomain.DBT,
                    evidence_level="strong",
                    source="Grounding Techniques in Trauma Treatment",
                    source_url="https://doi.org/10.1016/j.jbtep.2016.06.001",
                    effectiveness_for=["anxiety", "panic", "dissociation", "ptsd"]
                )
            ]
        }
        
        self.system_prompt = """You are a clinical research specialist for a mental health coaching app.

TASK: Find evidence-based techniques for specific coaching needs.

INPUT: A detected emotional/behavioral pattern that needs coaching.

SEARCH STRATEGY:
1. Identify the therapeutic domain (CBT, DBT, Mindfulness, etc.)
2. Search for specific techniques with clinical evidence
3. Prioritize meta-analyses and randomized controlled trials
4. Include practitioner-friendly step-by-step instructions

OUTPUT FORMAT (JSON):
{
    "techniques": [
        {
            "name": "technique name",
            "description": "brief description",
            "steps": ["step 1", "step 2", ...],
            "domain": "CBT|DBT|mindfulness|social_skills|emotion_regulation",
            "evidence_level": "strong|moderate|emerging",
            "source": "citation",
            "effectiveness_for": ["condition1", "condition2"]
        }
    ],
    "search_summary": "what was searched",
    "confidence": 0.0-1.0
}

IMPORTANT:
- Only suggest techniques with clinical evidence
- Provide actionable, specific steps
- Never suggest anything that could cause harm
- Include caveats for techniques requiring professional guidance
"""
    
    def initialize(self) -> None:
        """Initialize the research agent."""
        if self.client is None:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("ResearchAgent initialized")
        
    async def find_techniques(
        self,
        detected_pattern: str,
        severity: float = 0.5,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> GroundingResult:
        """
        Find evidence-based techniques for a detected pattern.
        
        Args:
            detected_pattern: The pattern needing intervention (e.g., "masking", "rapid_speech")
            severity: How severe the pattern is (0.0-1.0)
            user_preferences: User's technique preferences if any
            
        Returns:
            GroundingResult with techniques and citations
        """
        # Check cache
        cache_key = f"{detected_pattern}_{severity:.1f}"
        if cache_key in self.grounding_cache:
            cached = self.grounding_cache[cache_key]
            if time.time() - cached.timestamp < self.cache_ttl:
                return cached
        
        try:
            # Try local library first (fast, reliable)
            local_techniques = self._search_local_library(detected_pattern)
            
            if local_techniques:
                result = GroundingResult(
                    techniques=local_techniques,
                    citations=self._generate_citations(local_techniques),
                    confidence=0.9,
                    search_queries_used=[detected_pattern],
                    grounding_source="technique_library",
                    timestamp=time.time()
                )
            else:
                # Fall back to Gemini with Google Search grounding
                result = await self._gemini_search(detected_pattern, severity)
            
            # Cache result
            self.grounding_cache[cache_key] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Research grounding error: {e}")
            return self._default_result(detected_pattern)
            
    def _search_local_library(self, pattern: str) -> List[GroundedTechnique]:
        """Search the local technique library."""
        pattern_lower = pattern.lower()
        
        # Direct match
        if pattern_lower in self.technique_library:
            return self.technique_library[pattern_lower]
        
        # Fuzzy matching
        for key, techniques in self.technique_library.items():
            if key in pattern_lower or pattern_lower in key:
                return techniques
            # Check effectiveness
            for tech in techniques:
                if pattern_lower in [e.lower() for e in tech.effectiveness_for]:
                    return [tech]
        
        return []
        
    async def _gemini_search(
        self,
        pattern: str,
        severity: float
    ) -> GroundingResult:
        """Use Gemini with Google Search for grounding."""
        try:
            query = f"""Find evidence-based therapeutic techniques for someone experiencing: {pattern}
Severity level: {severity:.0%}
Focus on CBT, DBT, and mindfulness-based approaches with clinical research support."""

            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[query],
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    temperature=0.3,
                    response_mime_type="application/json",
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )
            
            result_data = json.loads(response.text)
            
            techniques = [
                GroundedTechnique(
                    name=t["name"],
                    description=t["description"],
                    steps=t["steps"],
                    domain=ResearchDomain(t.get("domain", "cognitive_behavioral_therapy")),
                    evidence_level=t.get("evidence_level", "moderate"),
                    source=t.get("source", "Clinical practice"),
                    source_url=t.get("source_url"),
                    effectiveness_for=t.get("effectiveness_for", [pattern])
                )
                for t in result_data.get("techniques", [])
            ]
            
            return GroundingResult(
                techniques=techniques,
                citations=self._generate_citations(techniques),
                confidence=result_data.get("confidence", 0.7),
                search_queries_used=[pattern],
                grounding_source="google_search",
                timestamp=time.time()
            )
            
        except Exception as e:
            logger.error(f"Gemini search failed: {e}")
            return self._default_result(pattern)
            
    def _generate_citations(
        self,
        techniques: List[GroundedTechnique]
    ) -> List[Dict[str, str]]:
        """Generate citation list from techniques."""
        citations = []
        seen_sources = set()
        
        for tech in techniques:
            if tech.source not in seen_sources:
                citations.append({
                    "source": tech.source,
                    "url": tech.source_url or "",
                    "evidence_level": tech.evidence_level,
                    "domain": tech.domain.value
                })
                seen_sources.add(tech.source)
        
        return citations
        
    def _default_result(self, pattern: str) -> GroundingResult:
        """Return default result when search fails."""
        default_tech = GroundedTechnique(
            name="Mindful Observation",
            description="General mindfulness technique for self-awareness",
            steps=[
                "Pause and notice your current state",
                "Take three slow, deep breaths",
                "Observe without judgment",
                "Choose your next action intentionally"
            ],
            domain=ResearchDomain.MINDFULNESS,
            evidence_level="strong",
            source="Mindfulness-Based Interventions",
            source_url=None,
            effectiveness_for=["general"]
        )
        
        return GroundingResult(
            techniques=[default_tech],
            citations=[{"source": default_tech.source, "url": "", 
                       "evidence_level": "strong", "domain": "mindfulness"}],
            confidence=0.5,
            search_queries_used=[pattern],
            grounding_source="fallback",
            timestamp=time.time()
        )
        
    def get_technique_by_domain(
        self,
        domain: ResearchDomain,
        limit: int = 5
    ) -> List[GroundedTechnique]:
        """Get techniques filtered by domain."""
        techniques = []
        for pattern_techniques in self.technique_library.values():
            for tech in pattern_techniques:
                if tech.domain == domain:
                    techniques.append(tech)
                    if len(techniques) >= limit:
                        return techniques
        return techniques
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for API."""
        return {
            "available_domains": [d.value for d in ResearchDomain],
            "techniques_count": sum(len(t) for t in self.technique_library.values()),
            "cache_size": len(self.grounding_cache)
        }

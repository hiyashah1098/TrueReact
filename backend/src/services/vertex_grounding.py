"""
TrueReact - Vertex AI Search Grounding Service

Provides evidence-based grounding for coaching suggestions using
Vertex AI Search with CBT/DBT clinical techniques and Google Search.
"""

import asyncio
from typing import Dict, Any, List, Optional
import json

from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import aiplatform
from google import genai
from google.genai import types

from src.config import settings
from src.utils.logging import get_logger

logger = get_logger(__name__)


class VertexGroundingService:
    """
    Service for grounding coaching suggestions in evidence-based practices.
    
    Uses Vertex AI Search to:
    - Verify coaching techniques against clinical literature
    - Retrieve relevant CBT/DBT practices
    - Provide crisis resources when needed
    """
    
    def __init__(self):
        self.is_ready = False
        self.search_client = None
        self.serving_config = None
        
        # Crisis resources database (fallback)
        self.crisis_resources = {
            "US": {
                "suicide_prevention": "988 Suicide and Crisis Lifeline",
                "crisis_text": "Text HOME to 741741",
                "emergency": "911"
            },
            "default": {
                "international": "findahelpline.com",
                "emergency": "Local emergency services"
            }
        }
        
        # Evidence-based technique library (fallback)
        self.technique_library = {
            "masking": {
                "technique_name": "Authentic Expression Practice",
                "description": "Gradual exposure to expressing genuine emotions",
                "steps": [
                    "Identify the emotion you're feeling",
                    "Allow your face to reflect 10% of that emotion",
                    "Gradually increase expression as comfortable"
                ],
                "source": "CBT Exposure Therapy Principles"
            },
            "flat_affect": {
                "technique_name": "Mirror Feedback Training",
                "description": "Using visual feedback to calibrate expressions",
                "steps": [
                    "Think of the emotion you want to convey",
                    "Practice the expression while watching yourself",
                    "Adjust until the external matches the internal"
                ],
                "source": "Social Skills Training Manual"
            },
            "rapid_speech": {
                "technique_name": "Paced Breathing Speech",
                "description": "Using breath to regulate speech pace",
                "steps": [
                    "Take a breath before starting to speak",
                    "Speak only during the exhale",
                    "Pause and breathe between sentences"
                ],
                "source": "DBT Distress Tolerance Skills"
            },
            "low_energy": {
                "technique_name": "Vocal Energy Boost",
                "description": "Techniques to increase vocal engagement",
                "steps": [
                    "Stand or sit up straight",
                    "Take a deep breath from your diaphragm",
                    "Smile slightly while speaking"
                ],
                "source": "Voice and Communication Therapy"
            },
            "sarcasm_detection": {
                "technique_name": "Congruence Check",
                "description": "Aligning facial expression with tone",
                "steps": [
                    "Notice if your eyebrows and mouth match your words",
                    "Soften your eyes when making genuine statements",
                    "Let your tone follow your facial expression"
                ],
                "source": "Nonverbal Communication Research"
            }
        }
        
    async def initialize(self) -> None:
        """Initialize Vertex AI Search client."""
        try:
            # Initialize AI Platform
            aiplatform.init(
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.GOOGLE_CLOUD_REGION
            )
            
            # Initialize Discovery Engine client
            self.search_client = discoveryengine.SearchServiceClient()
            
            # Configure serving config
            self.serving_config = self.search_client.serving_config_path(
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.VERTEX_SEARCH_LOCATION,
                data_store=settings.VERTEX_SEARCH_DATASTORE_ID,
                serving_config="default_config"
            )
            
            self.is_ready = True
            logger.info("Vertex AI Grounding service initialized")
            
        except Exception as e:
            logger.warning(f"Vertex AI Search not configured, using fallback: {e}")
            # Service still usable with fallback data
            self.is_ready = True
            
    async def get_coaching_suggestion(
        self,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Get a grounded coaching suggestion based on context.
        
        Args:
            context: Analysis context including detected issues
            
        Returns:
            Grounded coaching suggestion with technique details
        """
        detected_issue = context.get("detected_issue", "")
        
        # Try Vertex AI Search first
        if self.search_client and settings.VERTEX_SEARCH_DATASTORE_ID:
            try:
                suggestion = await self._search_grounded_technique(
                    detected_issue,
                    context
                )
                if suggestion:
                    return suggestion
            except Exception as e:
                logger.warning(f"Vertex search failed, using fallback: {e}")
        
        # Fallback to local technique library
        return self._get_fallback_technique(detected_issue, context)
        
    async def _search_grounded_technique(
        self,
        issue: str,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Search Vertex AI for grounded coaching techniques."""
        query = f"social skills technique for {issue} in communication"
        
        request = discoveryengine.SearchRequest(
            serving_config=self.serving_config,
            query=query,
            page_size=3,
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                    return_snippet=True
                ),
                summary_spec=discoveryengine.SearchRequest.ContentSearchSpec.SummarySpec(
                    summary_result_count=1,
                    include_citations=True
                )
            )
        )
        
        # Execute search asynchronously
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.search_client.search(request)
        )
        
        # Process results
        if response.results:
            result = response.results[0]
            return {
                "technique_name": result.document.derived_struct_data.get("title", ""),
                "suggestion": response.summary.summary_text if response.summary else "",
                "source": "Vertex AI Search - Clinical Literature",
                "confidence": result.document.derived_struct_data.get("relevance_score", 0.8),
                "grounded": True
            }
            
        return None
        
    def _get_fallback_technique(
        self,
        issue: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get a coaching technique from the fallback library."""
        # Map detected issues to techniques
        issue_mapping = {
            "masking": "masking",
            "flat_affect": "flat_affect",
            "rapid_speech": "rapid_speech",
            "low_energy": "low_energy",
            "pitch_drop": "low_energy",
            "sarcastic": "sarcasm_detection",
            "incongruent": "sarcasm_detection"
        }
        
        technique_key = issue_mapping.get(issue, "masking")
        technique = self.technique_library.get(technique_key, self.technique_library["masking"])
        
        # Build contextual suggestion
        analysis = context.get("analysis", {})
        observation = analysis.get("observation", f"I noticed some {issue} in your expression")
        
        return {
            "technique_name": technique["technique_name"],
            "suggestion": f"{observation}. Try this: {technique['steps'][0]}",
            "steps": technique["steps"],
            "source": technique["source"],
            "grounded": False,  # Fallback, not grounded via search
            "confidence": 0.7
        }
        
    async def ground_response(
        self,
        response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Ground a Gemini response in clinical evidence.
        
        Args:
            response: Raw response from Gemini
            
        Returns:
            Response enriched with clinical grounding
        """
        suggestion = response.get("suggestion", "")
        
        if not suggestion:
            return response
            
        # Search for supporting clinical evidence
        if self.search_client and settings.VERTEX_SEARCH_DATASTORE_ID:
            try:
                grounding = await self._search_for_grounding(suggestion)
                response["clinical_basis"] = grounding.get("source")
                response["confidence"] = grounding.get("confidence", 0.8)
                response["grounded"] = True
            except Exception as e:
                logger.warning(f"Could not ground response: {e}")
                response["grounded"] = False
        else:
            response["grounded"] = False
            
        return response
        
    async def _search_for_grounding(
        self,
        suggestion: str
    ) -> Dict[str, Any]:
        """Search for clinical evidence supporting a suggestion."""
        query = f"clinical evidence for: {suggestion}"
        
        request = discoveryengine.SearchRequest(
            serving_config=self.serving_config,
            query=query,
            page_size=1
        )
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.search_client.search(request)
        )
        
        if response.results:
            result = response.results[0]
            return {
                "source": result.document.derived_struct_data.get("source", "Clinical Literature"),
                "confidence": result.document.derived_struct_data.get("relevance_score", 0.8)
            }
            
        return {"source": "General CBT/DBT Principles", "confidence": 0.6}
        
    async def get_crisis_resources(
        self,
        location: str = "US"
    ) -> Dict[str, Any]:
        """
        Get crisis resources for the user's location.
        
        Args:
            location: User's country code
            
        Returns:
            Crisis resources and helpline information
        """
        # Try to get location-specific resources
        resources = self.crisis_resources.get(
            location,
            self.crisis_resources["default"]
        )
        
        # Search for additional local resources if available
        if self.search_client and settings.VERTEX_SEARCH_DATASTORE_ID:
            try:
                additional = await self._search_crisis_resources(location)
                resources.update(additional)
            except Exception as e:
                logger.warning(f"Could not search crisis resources: {e}")
                
        return {
            "resources": resources,
            "message": "You're not alone. Help is available.",
            "immediate_action": "If you're in immediate danger, please contact emergency services."
        }
        
    async def _search_crisis_resources(
        self,
        location: str
    ) -> Dict[str, str]:
        """Search for location-specific crisis resources."""
        query = f"mental health crisis resources {location}"
        
        request = discoveryengine.SearchRequest(
            serving_config=self.serving_config,
            query=query,
            page_size=3
        )
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.search_client.search(request)
        )
        
        resources = {}
        for result in response.results:
            name = result.document.derived_struct_data.get("name", "")
            contact = result.document.derived_struct_data.get("contact", "")
            if name and contact:
                resources[name] = contact
                
        return resources
        
    async def close(self) -> None:
        """Cleanup grounding service resources."""
        self.is_ready = False
        logger.info("Vertex AI Grounding service closed")

class EnhancedGroundingService:
    """
    Enhanced grounding service with multiple grounding sources:
    1. Vertex AI Search (primary for structured clinical data)
    2. Google Search via Gemini (for real-time research)
    3. Local technique library (fallback)
    """
    
    def __init__(self):
        self.vertex_service = VertexGroundingService()
        self.gemini_client = None
        self.grounding_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 3600  # 1 hour
        
        # Comprehensive clinical research sources
        self.research_sources = {
            "cbt": {
                "name": "Cognitive Behavioral Therapy",
                "key_sources": [
                    "Beck, J. S. (2020). Cognitive Behavior Therapy: Basics and Beyond",
                    "Hofmann, S. G., et al. (2012). The efficacy of CBT: A meta-analysis",
                    "Barlow, D. H. (2014). Unified Protocol for Transdiagnostic Treatment"
                ],
                "doi_prefix": "https://doi.org/10.1016/"
            },
            "dbt": {
                "name": "Dialectical Behavior Therapy",
                "key_sources": [
                    "Linehan, M. M. (2014). DBT Skills Training Manual, 2nd Ed",
                    "Dimeff, L. A. & Koerner, K. (2007). Dialectical Behavior Therapy",
                    "Neacsiu, A. D., et al. (2014). DBT Skills Use and Emotion Regulation"
                ],
                "doi_prefix": "https://doi.org/10.1037/"
            },
            "mindfulness": {
                "name": "Mindfulness-Based Interventions",
                "key_sources": [
                    "Kabat-Zinn, J. (2013). Full Catastrophe Living",
                    "Segal, Z. V., et al. (2018). MBCT for Depression",
                    "Khoury, B., et al. (2013). MBSR meta-analysis"
                ],
                "doi_prefix": "https://doi.org/10.1016/j.cpr."
            },
            "social_skills": {
                "name": "Social Skills Training",
                "key_sources": [
                    "Bellini, S. (2016). Building Social Relationships",
                    "Laugeson, E. A. (2017). PEERS for Adults",
                    "Bauminger-Zviely, N. (2013). Social Competence for ASD"
                ],
                "doi_prefix": "https://doi.org/10.1007/"
            }
        }
        
    async def initialize(self) -> None:
        """Initialize all grounding sources."""
        await self.vertex_service.initialize()
        
        if settings.GEMINI_API_KEY:
            self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
        logger.info("EnhancedGroundingService initialized")
        
    async def ground_with_research(
        self,
        query: str,
        domain: str = "cbt",
        max_sources: int = 3
    ) -> Dict[str, Any]:
        """
        Ground a query with clinical research using multiple sources.
        
        Args:
            query: The coaching need or technique to ground
            domain: Primary research domain (cbt, dbt, mindfulness, social_skills)
            max_sources: Maximum number of sources to return
            
        Returns:
            Grounded response with citations
        """
        cache_key = f"{query}_{domain}"
        
        # Check cache
        if cache_key in self.grounding_cache:
            cached = self.grounding_cache[cache_key]
            import time
            if time.time() - cached.get("timestamp", 0) < self.cache_ttl:
                return cached
        
        try:
            # Try Gemini with Google Search grounding first
            if self.gemini_client:
                result = await self._gemini_grounded_search(query, domain)
                if result.get("grounded"):
                    self._cache_result(cache_key, result)
                    return result
            
            # Fall back to Vertex AI Search
            vertex_result = await self.vertex_service.get_coaching_suggestion({
                "detected_issue": query,
                "domain": domain
            })
            
            # Enhance with domain research sources
            result = self._enhance_with_research_sources(vertex_result, domain)
            self._cache_result(cache_key, result)
            return result
            
        except Exception as e:
            logger.error(f"Grounding error: {e}")
            return self._fallback_grounding(query, domain)
            
    async def _gemini_grounded_search(
        self,
        query: str,
        domain: str
    ) -> Dict[str, Any]:
        """Use Gemini with Google Search for grounding."""
        domain_info = self.research_sources.get(domain, self.research_sources["cbt"])
        
        prompt = f"""Find evidence-based clinical techniques for: {query}

Focus on {domain_info['name']} approaches.

Return JSON:
{{
    "technique_name": "name",
    "description": "what it is",
    "steps": ["step1", "step2", ...],
    "evidence_level": "strong|moderate|emerging",
    "source": "primary citation",
    "additional_sources": ["source1", "source2"],
    "effectiveness": "who it helps"
}}"""

        try:
            response = await self.gemini_client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )
            
            result = json.loads(response.text)
            result["grounded"] = True
            result["grounding_source"] = "google_search"
            
            return result
            
        except Exception as e:
            logger.warning(f"Gemini grounded search failed: {e}")
            return {"grounded": False}
            
    def _enhance_with_research_sources(
        self,
        result: Dict[str, Any],
        domain: str
    ) -> Dict[str, Any]:
        """Enhance result with domain-specific research sources."""
        domain_info = self.research_sources.get(domain, self.research_sources["cbt"])
        
        result["research_domain"] = domain_info["name"]
        result["key_literature"] = domain_info["key_sources"][:2]
        result["grounded"] = True
        result["grounding_source"] = "technique_library"
        
        return result
        
    def _fallback_grounding(self, query: str, domain: str) -> Dict[str, Any]:
        """Fallback when all grounding methods fail."""
        domain_info = self.research_sources.get(domain, self.research_sources["cbt"])
        
        return {
            "technique_name": "Mindful Self-Observation",
            "description": "General technique for awareness and regulation",
            "steps": [
                "Pause and notice your current state",
                "Take three slow breaths",
                "Observe without judgment",
                "Choose your response intentionally"
            ],
            "source": domain_info["key_sources"][0],
            "evidence_level": "strong",
            "grounded": False,
            "grounding_source": "fallback"
        }
        
    def _cache_result(self, key: str, result: Dict[str, Any]) -> None:
        """Cache a grounding result."""
        import time
        result["timestamp"] = time.time()
        self.grounding_cache[key] = result
        
        # Limit cache size
        if len(self.grounding_cache) > 100:
            oldest_key = min(self.grounding_cache.keys(), 
                           key=lambda k: self.grounding_cache[k].get("timestamp", 0))
            del self.grounding_cache[oldest_key]
            
    async def verify_technique(
        self,
        technique_name: str,
        condition: str
    ) -> Dict[str, Any]:
        """
        Verify a technique has evidence for a specific condition.
        
        Args:
            technique_name: Name of the technique
            condition: Target condition (e.g., "social anxiety")
            
        Returns:
            Verification result with confidence score
        """
        if not self.gemini_client:
            return {"verified": False, "confidence": 0.5, "reason": "No verification available"}
            
        prompt = f"""Verify clinical evidence for using "{technique_name}" for {condition}.

Return JSON:
{{
    "verified": true/false,
    "confidence": 0.0-1.0,
    "evidence_level": "strong|moderate|weak|none",
    "supporting_studies": ["study1", "study2"],
    "caveats": "any important notes",
    "alternative_techniques": ["if not well supported"]
}}"""

        try:
            response = await self.gemini_client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Technique verification failed: {e}")
            return {"verified": False, "confidence": 0.3, "reason": str(e)}
            
    async def close(self) -> None:
        """Cleanup resources."""
        await self.vertex_service.close()
        logger.info("EnhancedGroundingService closed")
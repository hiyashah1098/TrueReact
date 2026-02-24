"""
TrueReact - Vertex AI Search Grounding Service

Provides evidence-based grounding for coaching suggestions using
Vertex AI Search with CBT/DBT clinical techniques.
"""

import asyncio
from typing import Dict, Any, List, Optional

from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import aiplatform

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

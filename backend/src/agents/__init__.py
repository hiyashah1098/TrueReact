"""TrueReact - ADK Agent modules

Multi-agent architecture for real-time social-emotional coaching:
- EmotionAgent: Facial/vocal emotion analysis
- SafetyAgent: Distress monitoring and crisis detection  
- ResearchAgent: Evidence-based technique grounding
- CoachingAgent: Coaching response generation
- AgentOrchestrator: Coordinates all agents
"""

from src.agents.emotion_agent import EmotionAgent, EmotionState, EmotionCategory
from src.agents.safety_agent import SafetyAgent, SafetyAssessment, DistressLevel, SafetyAction
from src.agents.research_agent import ResearchAgent, GroundingResult, GroundedTechnique, ResearchDomain
from src.agents.coaching_agent import TrueReactAgent, AgentPersona, CoachingContext
from src.agents.orchestrator import AgentOrchestrator, OrchestratorMode, OrchestratedResponse

__all__ = [
    # Emotion Agent
    "EmotionAgent",
    "EmotionState", 
    "EmotionCategory",
    
    # Safety Agent
    "SafetyAgent",
    "SafetyAssessment",
    "DistressLevel",
    "SafetyAction",
    
    # Research Agent
    "ResearchAgent",
    "GroundingResult",
    "GroundedTechnique",
    "ResearchDomain",
    
    # Coaching Agent
    "TrueReactAgent",
    "AgentPersona",
    "CoachingContext",
    
    # Orchestrator
    "AgentOrchestrator",
    "OrchestratorMode",
    "OrchestratedResponse",
]

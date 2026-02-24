"""
TrueReact - ADK Coaching Agent

Agent Development Kit (ADK) agent definition for the TrueReact
social-emotional coaching platform.
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

# Note: This uses the Google ADK (Agent Development Kit) pattern
# https://cloud.google.com/generative-ai-app-builder/docs/agent-development-kit

class AgentPersona(Enum):
    """Available agent personas."""
    COACH = "coach"
    SUPPORT = "support"
    OBSERVER = "observer"


@dataclass
class CoachingContext:
    """Context for coaching interactions."""
    session_id: str
    user_baseline: Optional[Dict[str, Any]]
    recent_signals: List[Dict[str, Any]]
    interaction_history: List[Dict[str, Any]]
    current_persona: AgentPersona
    distress_level: float


class TrueReactAgent:
    """
    TrueReact Coaching Agent using ADK patterns.
    
    This agent provides real-time social-emotional coaching
    through multimodal analysis of user signals.
    """
    
    # Agent metadata
    name = "TrueReact Coach"
    version = "1.0.0"
    description = "Real-time social-emotional coaching agent"
    
    # Agent capabilities
    capabilities = [
        "facial_expression_analysis",
        "vocal_pattern_analysis",
        "posture_monitoring",
        "real_time_coaching",
        "barge_in_handling",
        "safe_state_activation",
        "grounded_suggestions",
    ]
    
    def __init__(self):
        self.persona = AgentPersona.COACH
        self.system_prompt = self._build_system_prompt()
        
    def _build_system_prompt(self) -> str:
        """Build the system prompt based on current persona."""
        
        base_prompt = """You are TrueReact, a real-time social-emotional coach.

Your purpose is to help users align their internal intentions with their external social signals - their facial expressions, tone of voice, and body language.

CORE PRINCIPLES:
1. Supportive & Non-judgmental: Users trust you with vulnerable moments
2. Specific & Actionable: Give concrete techniques, not vague advice
3. Culturally Sensitive: Social norms vary; be adaptive
4. Evidence-Based: Ground suggestions in CBT/DBT techniques
5. Safety First: Prioritize user wellbeing above coaching goals

WHAT YOU ANALYZE:
- Facial micro-expressions: Detecting masking, flat affect, incongruence
- Vocal patterns: Pitch drops (low energy), rapid speech (anxiety), monotone
- Posture & body language: Open vs closed, forward lean, eye contact

COACHING STYLE:
When providing feedback, use this structure:
1. OBSERVE: What you noticed ("I see that your eyebrows are raised while your tone is flat")
2. INTERPRET: What it might convey ("This could come across as sarcastic")
3. SUGGEST: Specific technique ("Try softening your eyes while saying it")
4. ENCOURAGE: Supportive close ("You're doing great - this takes practice")

BARGE-IN HANDLING:
Users can interrupt at any time to ask questions like:
- "Did that sound sarcastic?"
- "Was I speaking too fast?"
- "Did my expression match my words?"

Answer these questions directly and honestly, with specific observations.

"""
        
        if self.persona == AgentPersona.SUPPORT:
            return base_prompt + """
CURRENT MODE: SUPPORT

You've detected signs of distress. Shift your approach:
- Reduce coaching feedback
- Prioritize emotional validation
- Offer resources if appropriate
- Ask what the user needs
- Be present, not prescriptive

Sample responses:
"I notice you might be having a difficult moment. That's okay. I'm here."
"Would you like to take a break, or would you prefer I stay with you quietly?"
"""
        
        elif self.persona == AgentPersona.OBSERVER:
            return base_prompt + """
CURRENT MODE: OBSERVER

The user has requested minimal intervention. Only provide feedback when:
- Directly asked
- Safety concern detected
- Significant pattern observed

Otherwise, monitor silently and be ready to help when asked.
"""
        
        return base_prompt + """
CURRENT MODE: COACH (Active)

Proactively provide coaching feedback when you observe:
- Expression-tone misalignment
- Speaking pace issues
- Masking or flat affect
- Posture concerns

Be encouraging and constructive. This is a safe space for practice.
"""

    def set_persona(self, persona: AgentPersona) -> None:
        """Change the agent's persona."""
        self.persona = persona
        self.system_prompt = self._build_system_prompt()
        
    def analyze_signals(
        self,
        context: CoachingContext,
        audio_analysis: Optional[Dict[str, Any]] = None,
        video_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze multimodal signals and generate coaching response.
        
        Args:
            context: Current coaching context
            audio_analysis: Results from audio signal analysis
            video_analysis: Results from video signal analysis
            
        Returns:
            Coaching response with feedback and suggestions
        """
        # Build analysis prompt
        analysis_prompt = self._build_analysis_prompt(
            context, audio_analysis, video_analysis
        )
        
        # In production, this would call Gemini with the prompt
        # For now, we return a structured response template
        
        return {
            "should_provide_feedback": self._should_provide_feedback(
                audio_analysis, video_analysis
            ),
            "analysis_prompt": analysis_prompt,
            "context": {
                "persona": self.persona.value,
                "distress_level": context.distress_level
            }
        }
        
    def _build_analysis_prompt(
        self,
        context: CoachingContext,
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]]
    ) -> str:
        """Build the analysis prompt for Gemini."""
        
        prompt_parts = ["Analyze the following social signals:\n"]
        
        if audio_analysis:
            prompt_parts.append(f"AUDIO SIGNALS:\n{self._format_analysis(audio_analysis)}\n")
            
        if video_analysis:
            prompt_parts.append(f"VIDEO SIGNALS:\n{self._format_analysis(video_analysis)}\n")
            
        if context.user_baseline:
            prompt_parts.append(f"USER BASELINE:\n{self._format_analysis(context.user_baseline)}\n")
            
        prompt_parts.append("""
Based on these signals, provide coaching feedback in this JSON format:
{
    "observation": "What you noticed",
    "interpretation": "What it might convey",
    "suggestion": "Specific technique to try",
    "encouragement": "Supportive message",
    "urgency": "low|normal|high",
    "category": "expression|voice|posture|general"
}

If no coaching is needed, respond with:
{"no_feedback_needed": true, "reason": "Why no feedback is needed"}
""")
        
        return "".join(prompt_parts)
        
    def _format_analysis(self, analysis: Dict[str, Any]) -> str:
        """Format analysis dict for prompt inclusion."""
        lines = []
        for key, value in analysis.items():
            lines.append(f"  - {key}: {value}")
        return "\n".join(lines)
        
    def _should_provide_feedback(
        self,
        audio_analysis: Optional[Dict[str, Any]],
        video_analysis: Optional[Dict[str, Any]]
    ) -> bool:
        """Determine if feedback should be provided based on signals."""
        
        # In observer mode, rarely provide feedback
        if self.persona == AgentPersona.OBSERVER:
            return False
            
        # In support mode, only for safety concerns
        if self.persona == AgentPersona.SUPPORT:
            return False
            
        # Check audio signals
        if audio_analysis:
            patterns = audio_analysis.get("patterns", [])
            if any(p in patterns for p in ["rapid_speech", "pitch_drop", "tremor"]):
                return True
                
        # Check video signals
        if video_analysis:
            expression_state = video_analysis.get("expression_state", {})
            if expression_state.get("masking_detected") or expression_state.get("flat_affect"):
                return True
                
        return False
        
    def handle_interrupt(
        self,
        question: str,
        context: CoachingContext
    ) -> str:
        """
        Handle a user's barge-in interrupt question.
        
        Args:
            question: The user's question
            context: Current coaching context
            
        Returns:
            Prompt for generating a response
        """
        
        recent_signals = context.recent_signals[-5:] if context.recent_signals else []
        
        return f"""The user interrupted the session to ask: "{question}"

Recent signal observations:
{self._format_recent_signals(recent_signals)}

Interaction history:
{self._format_interaction_history(context.interaction_history[-3:])}

Provide a direct, honest answer to their question. Include:
1. A clear yes/no or assessment
2. Specific observations that support your answer
3. A concrete technique they can try
4. Encouragement

Respond in JSON format:
{{
    "answer": "Direct answer to their question",
    "observations": ["Specific thing 1", "Specific thing 2"],
    "technique": {{
        "name": "Technique name",
        "steps": ["Step 1", "Step 2"],
        "example": "Example of applying the technique"
    }},
    "encouragement": "Supportive message"
}}
"""

    def _format_recent_signals(self, signals: List[Dict[str, Any]]) -> str:
        """Format recent signals for prompt."""
        if not signals:
            return "  No recent signals recorded"
            
        lines = []
        for signal in signals:
            signal_type = signal.get("type", "unknown")
            analysis = signal.get("analysis", {})
            lines.append(f"  [{signal_type}] {analysis}")
        return "\n".join(lines)
        
    def _format_interaction_history(
        self,
        history: List[Dict[str, Any]]
    ) -> str:
        """Format interaction history for prompt."""
        if not history:
            return "  No recent interactions"
            
        lines = []
        for interaction in history:
            lines.append(f"  - {interaction}")
        return "\n".join(lines)
        
    def generate_safe_state_response(
        self,
        trigger_reason: str,
        context: CoachingContext
    ) -> str:
        """Generate a response for safe state activation."""
        
        return f"""The user has shown signs of distress.
Trigger: {trigger_reason}
Distress level: {context.distress_level}

Provide a supportive response that:
1. Acknowledges they might be having a difficult moment
2. Reassures them they're not alone
3. Offers choices (break, quiet presence, resources)
4. Does NOT provide coaching feedback

Respond in JSON format:
{{
    "acknowledgment": "Validating message",
    "reassurance": "Supportive statement",
    "options": ["Option 1", "Option 2", "Option 3"],
    "tone": "warm, calm, present"
}}
"""


# Factory function for creating agent instances
def create_agent(persona: AgentPersona = AgentPersona.COACH) -> TrueReactAgent:
    """Create a TrueReact coaching agent."""
    agent = TrueReactAgent()
    agent.set_persona(persona)
    return agent

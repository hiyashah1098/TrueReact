# TrueReact 🧠💬

**A Real-Time, Multimodal Social-Emotional Coach**

TrueReact helps users align their internal intent with their external social signals (facial expressions, tone, and pacing) using the power of Gemini Live API and a sophisticated multi-agent architecture.

## 🎯 Mission

TrueReact isn't a chatbot—it's a persistent, "eyes-on" companion that provides:

- **Visual Calibration**: Monitors micro-expressions and posture to detect "Masking" or "Flat Affect"
- **Vocal Pacing & Affect**: Listens for pitch drops (low energy) or rapid speech (anxiety)
- **"Barge-in" Coaching**: Users can interrupt mid-session for real-time feedback
- **Real-time Emotion Visualization**: Live emotion ring with congruence tracking
- **Evidence-Based Techniques**: CBT/DBT grounded coaching suggestions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TrueReact Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     WebSocket      ┌──────────────────────────────┐  │
│  │   React Native   │◄──────────────────►│       Cloud Run (ADK)        │  │
│  │   Mobile App     │    (Secure)        │    Multi-Agent Orchestrator  │  │
│  │                  │                    │                              │  │
│  │  • Camera Feed   │                    │  ┌────────────────────────┐  │  │
│  │  • Microphone    │                    │  │   Agent Pipeline       │  │  │
│  │  • Emotion Ring  │                    │  │   Emotion → Safety →   │  │  │
│  │  • UI Overlays   │                    │  │   Research → Coaching  │  │  │
│  └──────────────────┘                    │  └────────────────────────┘  │  │
│                                          └──────────────┬───────────────┘  │
│                                                         │                   │
│                                                         │ gRPC/REST         │
│                                                         ▼                   │
│                                          ┌──────────────────────────────┐  │
│                                          │     Gemini Live API          │  │
│                                          │  (Multimodal Processing)     │  │
│                                          │                              │  │
│                                          │  • Video Analysis            │  │
│                                          │  • Audio Processing          │  │
│                                          │  • Real-time Inference       │  │
│                                          └──────────────┬───────────────┘  │
│                                                         │                   │
│                                                         │ Grounding         │
│                                                         ▼                   │
│                                          ┌──────────────────────────────┐  │
│                                          │   Enhanced Grounding Layer   │  │
│                                          │  (Multi-Source Fallback)     │  │
│                                          │                              │  │
│                                          │  • Vertex AI Search          │  │
│                                          │  • Google Search Grounding   │  │
│                                          │  • Local CBT/DBT Library     │  │
│                                          └──────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Cloud Logging & Monitoring                     │  │
│  │                      (Observability & GCP Proof)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🤖 Multi-Agent Architecture (ADK)

TrueReact uses a sophisticated **Agent Development Kit (ADK)** pipeline with specialized agents:

| Agent | Role | Capabilities |
|-------|------|--------------|
| **EmotionAgent** | Real-time emotion detection | Facial/vocal analysis, congruence scoring, masking detection, emotion trending |
| **SafetyAgent** | Distress monitoring | Crisis keyword detection, risk assessment, safe-state triggers, resource recommendations |
| **ResearchAgent** | Evidence-based grounding | CBT/DBT technique library (14+ techniques), Google Search grounding, citation generation |
| **CoachingAgent** | Personalized coaching | Context-aware suggestions, neurodivergent-friendly feedback, progressive guidance |
| **Orchestrator** | Pipeline coordination | Mode management, safety overrides, response composition, agent state tracking |

### Agent Pipeline Flow
```
User Input (Video + Audio)
        │
        ▼
┌───────────────┐
│ EmotionAgent  │ ── Detects emotions, congruence, masking
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ SafetyAgent   │ ── Checks for distress, can trigger safe-state
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ ResearchAgent │ ── Grounds response in CBT/DBT evidence
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ CoachingAgent │ ── Generates personalized coaching
└───────┬───────┘
        │
        ▼
   User Feedback
```

## 📊 Real-Time Emotion Visualization

The mobile app features **live emotion feedback**:

- **Emotion Ring**: Animated visualization that pulses based on intensity
- **Congruence Meter**: Shows alignment between internal intent and external signals
- **Masking Indicator**: Alerts when emotion masking is detected
- **Trend Graph**: Historical emotion data with bar chart visualization
- **Haptic Feedback**: Vibration alerts for significant emotional changes

## 🛠️ Technical Stack

| Component | Technology | Role |
|-----------|------------|------|
| Frontend | React Native + Expo SDK 54 | Captures real-time audio/video streams, emotion visualization |
| Live Logic | Gemini Live API | Processes bidirectional, low-latency multimodal streams |
| Backend | FastAPI + Cloud Run | Hosts multi-agent orchestration layer (ADK pattern) |
| Grounding | Vertex AI Search + Google Search | Multi-source evidence-based grounding with fallback |
| Database | Firebase Firestore | User data, session history, techniques progress |
| Auth | Firebase Auth | Secure user authentication |
| Observability | Cloud Logging | Provides the "GCP Proof" required for submission |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Google Cloud SDK
- React Native CLI
- Expo CLI

### Installation

1. **Clone and install frontend dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Set up backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure GCP credentials:**
   ```bash
   export GOOGLE_CLOUD_PROJECT=your-project-id
   gcloud auth application-default login
   ```

4. **Run locally:**
   ```bash
   # Backend
   cd backend && python main.py

   # Mobile (in separate terminal)
   cd mobile && npx expo start
   ```

## 📁 Project Structure

```
TrueReact/
├── mobile/                     # React Native app (Expo SDK 54)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CoachingFeedbackOverlay.tsx  # Real-time coaching UI
│   │   │   ├── EmotionVisualizer.tsx        # Animated emotion ring
│   │   │   ├── EmotionTrendGraph.tsx        # Emotion history chart
│   │   │   └── InterruptModal.tsx           # Barge-in question modal
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx               # Main dashboard
│   │   │   ├── SessionScreen.tsx            # Live coaching session
│   │   │   ├── CalibrationScreen.tsx        # Initial calibration
│   │   │   ├── SafeStateScreen.tsx          # Crisis support screen
│   │   │   ├── HistoryScreen.tsx            # Session history
│   │   │   ├── TechniquesScreen.tsx         # CBT/DBT techniques library
│   │   │   └── SettingsScreen.tsx           # User preferences
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts              # WebSocket connection
│   │   │   └── useAudioRecorder.ts          # Audio capture
│   │   ├── context/
│   │   │   ├── SessionContext.tsx           # Session state management
│   │   │   ├── AuthContext.tsx              # Firebase auth
│   │   │   └── ThemeContext.tsx             # Theme preferences
│   │   └── services/
│   │       └── firebase.ts                  # Firebase integration
│   └── app.json
├── backend/                    # FastAPI Cloud Run service
│   ├── src/
│   │   ├── agents/
│   │   │   ├── emotion_agent.py             # Emotion detection agent
│   │   │   ├── safety_agent.py              # Distress monitoring agent
│   │   │   ├── research_agent.py            # CBT/DBT grounding agent
│   │   │   ├── coaching_agent.py            # Personalized coaching agent
│   │   │   └── orchestrator.py              # Multi-agent coordinator
│   │   ├── services/
│   │   │   ├── gemini_live.py               # Gemini Live API integration
│   │   │   ├── vertex_grounding.py          # Multi-source grounding
│   │   │   └── signal_analyzer.py           # Signal processing
│   │   ├── websocket/
│   │   │   ├── connection_manager.py        # WebSocket management
│   │   │   └── session_handler.py           # Session lifecycle
│   │   └── utils/
│   │       └── logging.py                   # Cloud Logging
│   ├── Dockerfile
│   └── requirements.txt
├── infrastructure/             # GCP deployment configs
│   ├── cloudbuild.yaml
│   └── terraform/
└── docs/                       # Documentation
    ├── ARCHITECTURE.md
    └── DEPLOYMENT.md
```

## 🧠 CBT/DBT Technique Library

TrueReact includes a built-in library of **14+ evidence-based techniques**:

| Category | Techniques |
|----------|------------|
| **Emotional Regulation** | Four-Square Breathing, Grounding (5-4-3-2-1), TIPP Skills |
| **Social Skills** | Active Listening, I-Statements, Reflective Listening |
| **Cognitive Restructuring** | Thought Challenging, Cognitive Defusion, Reframing |
| **Mindfulness** | Body Scan, Observing & Describing, Non-judgmental Stance |
| **Interpersonal** | DEAR MAN, GIVE Skills, Assertiveness Training |

## 🔒 Safety Features

TrueReact implements comprehensive **Safe-State Logic** via the SafetyAgent:

- **Multi-Layer Distress Detection**: 
  - Crisis keyword monitoring (verbal triggers)
  - Emotional intensity thresholds
  - Congruence collapse detection
  - Sustained distress pattern recognition
- **Automatic Persona Shift**: Transitions from "Coach" to "Support" mode when needed
- **Crisis Resources**: Provides localized crisis resources via Google Search grounding
- **Session Boundaries**: Respects user-defined session limits and breaks
- **Haptic Alerts**: Vibration feedback for significant emotional changes

## 🏆 Innovation Highlights

1. **Multi-Agent ADK Architecture**: Specialized agents for emotion, safety, research, and coaching work in a coordinated pipeline
2. **Real-Time Emotion Visualization**: Live emotion ring with congruence tracking and masking detection
3. **Latency Gap Solution**: Real-time "In-the-Moment Calibration" vs. traditional record-and-review
4. **Neurodivergent-Friendly**: Specifically designed to help with masking and flat affect
5. **Evidence-Based Grounding**: Multi-source fallback (Vertex AI → Google Search → Local Library)
6. **Privacy-First**: On-device processing where possible, encrypted streams
7. **Demo Mode**: Full functionality offline for hackathon demonstrations

## 🎮 Demo Mode

TrueReact includes a fully-functional **offline demo mode** for presentations:

- Simulates real-time emotion updates every 3 seconds
- Provides sample coaching feedback every 10 seconds
- Demonstrates emotion visualization with varying intensities
- Shows congruence tracking and masking detection
- Works without backend connection

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for the Gemini Live Agent Challenge** 🏆

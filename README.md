# TrueReact 🧠💬

**A Real-Time, Multimodal Social-Emotional Coach**

TrueReact helps users align their internal intent with their external social signals (facial expressions, tone, and pacing) using the power of Gemini Live API.

## 🎯 Mission

TrueReact isn't a chatbot—it's a persistent, "eyes-on" companion that provides:

- **Visual Calibration**: Monitors micro-expressions and posture to detect "Masking" or "Flat Affect"
- **Vocal Pacing & Affect**: Listens for pitch drops (low energy) or rapid speech (anxiety)
- **"Barge-in" Coaching**: Users can interrupt mid-session for real-time feedback

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TrueReact Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     WebSocket      ┌──────────────────────────────┐  │
│  │   React Native   │◄──────────────────►│       Cloud Run (ADK)        │  │
│  │   Mobile App     │    (Secure)        │    Orchestration Layer       │  │
│  │                  │                    │                              │  │
│  │  • Camera Feed   │                    │  • Session Management        │  │
│  │  • Microphone    │                    │  • State Machine             │  │
│  │  • UI Overlays   │                    │  • Safe-State Logic          │  │
│  └──────────────────┘                    └──────────────┬───────────────┘  │
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
│                                          │    Vertex AI Search          │  │
│                                          │  (CBT/DBT Knowledge Base)    │  │
│                                          │                              │  │
│                                          │  • Evidence-based practices  │  │
│                                          │  • Clinical techniques       │  │
│                                          │  • Crisis resources          │  │
│                                          └──────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Cloud Logging & Monitoring                     │  │
│  │                      (Observability & GCP Proof)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technical Stack

| Component | Technology | Role |
|-----------|------------|------|
| Frontend | React Native | Captures real-time audio/video streams |
| Live Logic | Gemini Live API | Processes bidirectional, low-latency multimodal streams |
| Backend | Google Cloud Run | Hosts the orchestration layer (using ADK) |
| Grounding | Vertex AI Search | Ensures coaching tips are grounded in evidence-based CBT/DBT practices |
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
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── screens/        # App screens
│   │   ├── services/       # API & WebSocket services
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utility functions
│   └── app.json
├── backend/                # Cloud Run service
│   ├── src/
│   │   ├── agents/         # ADK agent definitions
│   │   ├── services/       # Gemini, Vertex AI integrations
│   │   ├── websocket/      # WebSocket handlers
│   │   └── utils/          # Utilities & logging
│   ├── Dockerfile
│   └── requirements.txt
├── infrastructure/         # GCP deployment configs
│   ├── cloudbuild.yaml
│   └── terraform/
└── docs/                   # Documentation
```

## 🔒 Safety Features

TrueReact implements **Safe-State Logic**:

- **Distress Detection**: Monitors for key distress markers in voice and expression
- **Persona Shift**: Automatically transitions from "Coach" to "Support" mode
- **Crisis Resources**: Provides local crisis resources via Google Search grounding
- **Session Boundaries**: Respects user-defined session limits and breaks

## 🏆 Innovation Highlights

1. **Latency Gap Solution**: Real-time "In-the-Moment Calibration" vs. traditional record-and-review
2. **Neurodivergent-Friendly**: Specifically designed to help with masking and flat affect
3. **Evidence-Based**: Grounded in clinical social skills training manuals
4. **Privacy-First**: On-device processing where possible, encrypted streams

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built for Hacklytics 2026 🚀*

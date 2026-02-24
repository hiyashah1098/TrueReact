# TrueReact Architecture Documentation

## Overview

TrueReact is a real-time, multimodal social-emotional coaching platform that helps users align their internal intent with their external social signals (facial expressions, tone, and pacing).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    TrueReact                                         │
│                         Real-Time Social-Emotional Coach                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                          CLIENT LAYER                                        │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    React Native Mobile App                           │   │   │
│  │  │                                                                      │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │   │
│  │  │  │   Camera     │  │  Microphone  │  │    UI        │              │   │   │
│  │  │  │   Module     │  │   Module     │  │  Overlays    │              │   │   │
│  │  │  │              │  │              │  │              │              │   │   │
│  │  │  │ • Capture    │  │ • Record     │  │ • Feedback   │              │   │   │
│  │  │  │ • Stream     │  │ • Stream     │  │ • Coaching   │              │   │   │
│  │  │  │ • Preview    │  │ • Analyze    │  │ • Safe State │              │   │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │   │
│  │  │                                                                      │   │   │
│  │  │  ┌──────────────────────────────────────────────────────────────┐  │   │   │
│  │  │  │              WebSocket Connection Manager                      │  │   │   │
│  │  │  │  • Bidirectional streaming • Auto-reconnect • Heartbeat       │  │   │   │
│  │  │  └──────────────────────────────────────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        │ WebSocket (Secure)                         │
│                                        │ • Audio frames                             │
│                                        │ • Video frames                             │
│                                        │ • Control messages                         │
│                                        │ • Coaching feedback                        │
│                                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         ORCHESTRATION LAYER                                  │   │
│  │                        Google Cloud Run (ADK)                                │   │
│  │                                                                              │   │
│  │  ┌──────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                     FastAPI Application                               │  │   │
│  │  │                                                                       │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │   │
│  │  │  │  WebSocket  │  │   Session   │  │   Signal    │  │   State    │  │  │   │
│  │  │  │   Handler   │  │   Manager   │  │  Analyzer   │  │  Machine   │  │  │   │
│  │  │  │             │  │             │  │             │  │            │  │  │   │
│  │  │  │ • Connect   │  │ • Create    │  │ • Audio     │  │ • Coach    │  │  │   │
│  │  │  │ • Route     │  │ • Track     │  │ • Video     │  │ • Support  │  │  │   │
│  │  │  │ • Stream    │  │ • Cleanup   │  │ • Combined  │  │ • Observer │  │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │   │
│  │  │                                                                       │  │   │
│  │  │  ┌────────────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │                    ADK Coaching Agent                           │  │  │   │
│  │  │  │  • Persona management • Prompt construction • Response parsing  │  │  │   │
│  │  │  └────────────────────────────────────────────────────────────────┘  │  │   │
│  │  └──────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                        │                               │                            │
│                        │ gRPC/REST                     │ REST                       │
│                        ▼                               ▼                            │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │       PROCESSING LAYER           │  │         GROUNDING LAYER               │   │
│  │      Gemini Live API             │  │       Vertex AI Search                │   │
│  │                                  │  │                                        │   │
│  │  ┌────────────────────────────┐  │  │  ┌────────────────────────────────┐  │   │
│  │  │   Multimodal Processing    │  │  │  │    CBT/DBT Knowledge Base      │  │   │
│  │  │                            │  │  │  │                                │  │   │
│  │  │  • Video analysis          │  │  │  │  • Clinical techniques         │  │   │
│  │  │  • Audio processing        │  │  │  │  • Evidence-based practices    │  │   │
│  │  │  • Expression detection    │  │  │  │  • Social skills literature    │  │   │
│  │  │  • Sentiment analysis      │  │  │  │  • Crisis resources            │  │   │
│  │  │  • Real-time inference     │  │  │  │                                │  │   │
│  │  └────────────────────────────┘  │  │  └────────────────────────────────┘  │   │
│  │                                  │  │                                        │   │
│  │  ┌────────────────────────────┐  │  │  ┌────────────────────────────────┐  │   │
│  │  │   Bidirectional Streaming  │  │  │  │     Grounding Search           │  │   │
│  │  │                            │  │  │  │                                │  │   │
│  │  │  • Low-latency responses   │  │  │  │  • Technique verification      │  │   │
│  │  │  • Function calling        │  │  │  │  • Citation retrieval          │  │   │
│  │  │  • Interrupt handling      │  │  │  │  • Confidence scoring          │  │   │
│  │  └────────────────────────────┘  │  │  └────────────────────────────────┘  │   │
│  └──────────────────────────────────┘  └──────────────────────────────────────┘   │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        OBSERVABILITY LAYER                                   │   │
│  │                        Google Cloud Logging                                  │   │
│  │                                                                              │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │   │
│  │  │  Session Logs    │  │  Signal Metrics  │  │    Alert Policies        │  │   │
│  │  │                  │  │                  │  │                          │  │   │
│  │  │  • Start/end     │  │  • Distress      │  │  • Error rate            │  │   │
│  │  │  • Feedback      │  │  • Patterns      │  │  • Safe state triggers   │  │   │
│  │  │  • Safe state    │  │  • Engagement    │  │  • Latency thresholds    │  │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Session Initialization
```
User Opens App → Request Camera/Mic Permissions → Connect WebSocket → 
Start Calibration → Establish Baseline → Begin Active Coaching
```

### 2. Real-Time Coaching Loop
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────┐      ┌──────────────┐      ┌────────────────────────┐ │
│  │ Capture │ ───▶ │   Process    │ ───▶ │    Generate Feedback   │ │
│  │ A/V     │      │   Signals    │      │    (if warranted)      │ │
│  └─────────┘      └──────────────┘      └────────────────────────┘ │
│       │                                           │                 │
│       │                                           │                 │
│       │           ┌──────────────┐               │                 │
│       └───────────│   Display    │◀──────────────┘                 │
│                   │   Overlay    │                                  │
│                   └──────────────┘                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Barge-In Interrupt Flow
```
User Interrupts → "Did that sound sarcastic?" → Pause Session →
Analyze Recent Context → Generate Response → Ground in CBT/DBT →
Display Answer → Resume Session
```

### 4. Safe State Activation
```
Detect Distress Markers → Calculate Distress Score → 
Threshold Exceeded → Shift Persona to "Support" →
Provide Crisis Resources → Offer Support Options
```

## Component Details

### Client Layer (React Native)

| Component | Purpose |
|-----------|---------|
| Camera Module | Captures and streams video frames to backend |
| Microphone Module | Records and streams audio for voice analysis |
| WebSocket Manager | Maintains bidirectional connection with server |
| UI Overlays | Displays coaching feedback and safe state screens |
| Session Context | Manages application state across screens |

### Orchestration Layer (Cloud Run)

| Component | Purpose |
|-----------|---------|
| FastAPI Application | HTTP/WebSocket server, routing, middleware |
| Session Handler | Manages individual coaching session lifecycle |
| Signal Analyzer | Local pre-processing of audio/video signals |
| ADK Coaching Agent | Agent logic, prompt construction, persona management |
| Connection Manager | WebSocket connection pooling and health monitoring |

### Processing Layer (Gemini Live API)

| Capability | Use Case |
|------------|----------|
| Video Analysis | Facial expression detection, posture analysis |
| Audio Processing | Voice pitch, pace, energy analysis |
| Multimodal Fusion | Combined signal interpretation |
| Function Calling | Structured coaching feedback generation |
| Interrupt Handling | "Barge-in" question processing |

### Grounding Layer (Vertex AI Search)

| Data Source | Content |
|-------------|---------|
| CBT Techniques | Cognitive Behavioral Therapy practices |
| DBT Skills | Dialectical Behavior Therapy techniques |
| Social Skills | Communication and expression guidance |
| Crisis Resources | Localized mental health resources |

### Observability Layer (Cloud Logging)

| Log Type | Purpose |
|----------|---------|
| Session Logs | Track session lifecycle events |
| Signal Logs | Record analysis results for debugging |
| Feedback Logs | Audit coaching suggestions |
| Safe State Logs | Monitor distress detection accuracy |

## Security Considerations

### Data Privacy
- Audio/video streams processed in real-time, not stored
- Session data encrypted in transit (TLS 1.3)
- User consent required for camera/microphone access
- No PII stored without explicit consent

### Authentication
- Cloud Run service-to-service authentication
- Secrets managed via Secret Manager
- API keys rotated regularly

### Safety
- Distress detection with automatic safe state
- Crisis resources cached locally
- Rate limiting on API endpoints
- Content filtering on generated responses

## Scalability

### Horizontal Scaling
- Cloud Run auto-scales based on request load
- Min 1 instance for low latency cold starts
- Max 10 instances configurable per environment

### Performance Targets
- WebSocket latency: < 100ms
- Feedback generation: < 500ms
- Video frame processing: < 200ms
- Audio chunk processing: < 150ms

## Deployment

### Environments
| Environment | Purpose | Min Instances |
|-------------|---------|---------------|
| dev | Development testing | 0 |
| staging | Pre-production validation | 1 |
| prod | Production users | 1 |

### CI/CD Pipeline
```
Push to main → Cloud Build triggered → 
Build Docker image → Push to Container Registry →
Deploy to Cloud Run → Health check → 
Route traffic (if healthy)
```

## Monitoring & Alerts

### Key Metrics
- Request latency (p50, p95, p99)
- Error rate (5xx responses)
- Active WebSocket connections
- Safe state activations
- Feedback delivery rate

### Alert Thresholds
- Error rate > 5% for 5 minutes
- Latency p95 > 2s for 5 minutes
- Safe state activations > 10/hour
- WebSocket connection failures > 20%

---

*Architecture Version: 1.0*
*Last Updated: February 2026*

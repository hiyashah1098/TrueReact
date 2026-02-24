"""
TrueReact Backend - Main FastAPI Application

This is the orchestration layer for the TrueReact social-emotional coaching platform.
It handles WebSocket connections for real-time multimodal streaming and coordinates
with Gemini Live API for processing.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.websocket.connection_manager import ConnectionManager
from src.websocket.session_handler import SessionHandler
from src.services.gemini_live import GeminiLiveService
from src.services.vertex_grounding import VertexGroundingService
from src.utils.logging import setup_cloud_logging, get_logger

# Initialize logging
setup_cloud_logging()
logger = get_logger(__name__)

# Global services
connection_manager = ConnectionManager()
gemini_service: GeminiLiveService = None
grounding_service: VertexGroundingService = None
active_sessions: Dict[str, SessionHandler] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    global gemini_service, grounding_service
    
    logger.info("🚀 Starting TrueReact Backend...")
    
    # Initialize services
    gemini_service = GeminiLiveService()
    grounding_service = VertexGroundingService()
    
    await gemini_service.initialize()
    await grounding_service.initialize()
    
    logger.info("✅ All services initialized successfully")
    
    yield
    
    # Cleanup on shutdown
    logger.info("🔄 Shutting down TrueReact Backend...")
    
    # Close all active sessions
    for session_id, handler in active_sessions.items():
        await handler.close()
    
    await gemini_service.close()
    await grounding_service.close()
    
    logger.info("👋 Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="TrueReact API",
    description="Real-time multimodal social-emotional coaching platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "service": "TrueReact API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {
        "status": "healthy",
        "services": {
            "gemini": gemini_service.is_ready if gemini_service else False,
            "grounding": grounding_service.is_ready if grounding_service else False,
        },
        "active_sessions": len(active_sessions)
    }


@app.websocket("/ws/session/{client_id}")
async def websocket_session(websocket: WebSocket, client_id: str):
    """
    Main WebSocket endpoint for coaching sessions.
    
    Handles bidirectional streaming of audio/video data and coaching feedback.
    """
    await connection_manager.connect(websocket, client_id)
    
    logger.info(f"📱 Client connected: {client_id}")
    
    try:
        # Create session handler
        session_handler = SessionHandler(
            client_id=client_id,
            websocket=websocket,
            gemini_service=gemini_service,
            grounding_service=grounding_service
        )
        active_sessions[client_id] = session_handler
        
        # Start the session
        await session_handler.start()
        
        # Main message loop
        while True:
            # Receive data from client (audio/video frames or control messages)
            data = await websocket.receive_json()
            
            # Process the incoming data
            await session_handler.process_message(data)
            
    except WebSocketDisconnect:
        logger.info(f"📴 Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"❌ Session error for {client_id}: {str(e)}")
        await websocket.close(code=1011, reason=str(e))
    finally:
        # Cleanup session
        if client_id in active_sessions:
            await active_sessions[client_id].close()
            del active_sessions[client_id]
        connection_manager.disconnect(client_id)


@app.post("/api/session/{client_id}/interrupt")
async def interrupt_session(client_id: str, feedback_request: dict):
    """
    Handle 'barge-in' interrupts from clients.
    
    Allows users to pause and ask questions like:
    "Wait, stop—did that sound sarcastic?"
    """
    if client_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[client_id]
    response = await session.handle_interrupt(feedback_request)
    
    return response


@app.get("/api/session/{client_id}/state")
async def get_session_state(client_id: str):
    """Get the current state of a coaching session."""
    if client_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[client_id]
    return session.get_state()


@app.post("/api/session/{client_id}/safe-state")
async def trigger_safe_state(client_id: str):
    """
    Manually trigger safe-state mode.
    
    Transitions the agent from 'Coach' to 'Support' persona
    and provides crisis resources.
    """
    if client_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[client_id]
    await session.activate_safe_state()
    
    return {"status": "safe_state_activated"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )

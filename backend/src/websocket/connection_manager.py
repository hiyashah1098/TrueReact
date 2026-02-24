"""
TrueReact - WebSocket Connection Manager

Manages WebSocket connections for real-time coaching sessions.
"""

from typing import Dict, Optional
from fastapi import WebSocket

from src.utils.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections.
    
    Handles connection lifecycle, message broadcasting, and
    connection health monitoring.
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """
        Accept a new WebSocket connection.
        
        Args:
            websocket: The WebSocket connection
            client_id: Unique identifier for the client
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Connection established: {client_id}")
        logger.info(f"Active connections: {len(self.active_connections)}")
        
    def disconnect(self, client_id: str) -> None:
        """
        Remove a WebSocket connection.
        
        Args:
            client_id: The client identifier to disconnect
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Connection closed: {client_id}")
            logger.info(f"Active connections: {len(self.active_connections)}")
            
    def get_connection(self, client_id: str) -> Optional[WebSocket]:
        """
        Get a WebSocket connection by client ID.
        
        Args:
            client_id: The client identifier
            
        Returns:
            WebSocket connection or None if not found
        """
        return self.active_connections.get(client_id)
    
    async def send_message(self, client_id: str, message: dict) -> bool:
        """
        Send a message to a specific client.
        
        Args:
            client_id: The target client identifier
            message: The message to send (will be JSON encoded)
            
        Returns:
            True if sent successfully, False otherwise
        """
        websocket = self.get_connection(client_id)
        if websocket:
            try:
                await websocket.send_json(message)
                return True
            except Exception as e:
                logger.error(f"Failed to send message to {client_id}: {e}")
                return False
        return False
    
    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> None:
        """
        Broadcast a message to all connected clients.
        
        Args:
            message: The message to broadcast
            exclude: Optional client ID to exclude from broadcast
        """
        for client_id, websocket in self.active_connections.items():
            if client_id != exclude:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to {client_id}: {e}")
                    
    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
    
    def is_connected(self, client_id: str) -> bool:
        """Check if a client is currently connected."""
        return client_id in self.active_connections

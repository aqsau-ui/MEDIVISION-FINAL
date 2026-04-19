"""WebSocket Connection Manager for Patient-Doctor Chat"""
from fastapi import WebSocket
from typing import Dict, List
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections grouped by session_id."""

    def __init__(self):
        # session_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"WS connected: session={session_id} total={len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            try:
                self.active_connections[session_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"WS disconnected: session={session_id}")

    async def broadcast(self, session_id: str, payload: dict):
        """Send JSON payload to all connections in a session."""
        connections = self.active_connections.get(session_id, [])
        dead = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, session_id)

    async def send_personal(self, websocket: WebSocket, payload: dict):
        try:
            await websocket.send_json(payload)
        except Exception as e:
            logger.warning(f"Failed to send personal WS message: {e}")


# Singleton
ws_manager = ConnectionManager()

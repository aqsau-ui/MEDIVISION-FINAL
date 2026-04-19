"""WebSocket + REST router for Patient-Doctor chat sessions."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional
import json
import logging
from datetime import datetime

from ..config import mysql_db
from ..services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_conn():
    return mysql_db.get_connection()


def _row_to_dict(cursor, row):
    if row is None:
        return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def _rows_to_list(cursor, rows):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in rows]


def _format_dt(dt) -> str:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Database initializer  (called once at startup)
# ---------------------------------------------------------------------------

def create_chat_tables():
    """Create chat_sessions and chat_messages tables if they don't exist."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_email VARCHAR(255) NOT NULL,
                doctor_id INT NOT NULL,
                status ENUM('pending','open','closed') DEFAULT 'pending',
                scheduled_open DATETIME NULL,
                scheduled_close DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_patient (patient_email),
                INDEX idx_doctor (doctor_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                sender_type ENUM('patient','doctor') NOT NULL,
                sender_id VARCHAR(255) NOT NULL,
                message_type ENUM('text','voice','image','file') DEFAULT 'text',
                content TEXT,
                audio_base64 LONGTEXT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_read TINYINT(1) DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                INDEX idx_session (session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        conn.commit()

        # Add new columns idempotently (MySQL does not support IF NOT EXISTS in ALTER TABLE)
        for alter_sql in [
            "ALTER TABLE chat_sessions ADD COLUMN patient_name VARCHAR(255) NULL",
            "ALTER TABLE chat_messages ADD COLUMN file_mime VARCHAR(100) NULL",
        ]:
            try:
                cursor.execute(alter_sql)
                conn.commit()
            except Exception:
                pass  # Column already exists

        logger.info("✅ Chat tables ensured")
    except Exception as e:
        logger.error(f"❌ Failed to create chat tables: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: int,
    token: Optional[str] = Query(None),
):
    """
    Real-time chat WebSocket.
    Expected JSON frames:
      { "type": "text",  "content": "Hello" }
      { "type": "voice", "audio_base64": "<b64>", "sender_type": "patient"|"doctor", "sender_id": "..." }
      { "type": "ping" }
    """
    await ws_manager.connect(websocket, str(session_id))
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_personal(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type", "text")

            if msg_type == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong"})
                continue

            sender_type = data.get("sender_type", "patient")
            sender_id   = data.get("sender_id", "unknown")

            # Persist message
            conn = _get_conn()
            cursor = conn.cursor()
            try:
                if msg_type == "voice":
                    cursor.execute(
                        """INSERT INTO chat_messages
                           (session_id, sender_type, sender_id, message_type, audio_base64, file_mime)
                           VALUES (%s, %s, %s, 'voice', %s, %s)""",
                        (session_id, sender_type, sender_id,
                         data.get("audio_base64", ""),
                         data.get("file_mime", "audio/webm"))
                    )
                else:
                    cursor.execute(
                        """INSERT INTO chat_messages
                           (session_id, sender_type, sender_id, message_type, content)
                           VALUES (%s, %s, %s, 'text', %s)""",
                        (session_id, sender_type, sender_id, data.get("content", ""))
                    )
                conn.commit()
                msg_id = cursor.lastrowid
            except Exception as e:
                logger.error(f"DB error saving message: {e}")
                conn.rollback()
                msg_id = None
            finally:
                cursor.close()
                conn.close()

            # Broadcast to all session participants
            broadcast_payload = {
                "type": msg_type,
                "id": msg_id,
                "client_id": data.get("client_id"),
                "session_id": session_id,
                "sender_type": sender_type,
                "sender_id": sender_id,
                "content": data.get("content"),
                "audio_base64": data.get("audio_base64") if msg_type == "voice" else None,
                "file_mime": data.get("file_mime") if msg_type == "voice" else None,
                "file_name": data.get("file_name"),
                "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            await ws_manager.broadcast(str(session_id), broadcast_payload)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, str(session_id))


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.post("/sessions")
async def create_session(body: dict):
    """
    Create a new chat session.
    Body: { "patient_email": str, "doctor_id": int,
            "scheduled_open": "YYYY-MM-DD HH:MM:SS" (opt),
            "scheduled_close": "YYYY-MM-DD HH:MM:SS" (opt) }
    """
    patient_email   = body.get("patient_email")
    doctor_id       = body.get("doctor_id")
    patient_name    = body.get("patient_name")
    scheduled_open  = body.get("scheduled_open")
    scheduled_close = body.get("scheduled_close")

    if not patient_email or not doctor_id:
        raise HTTPException(status_code=400, detail="patient_email and doctor_id required")

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        # Check for existing open/pending session
        cursor.execute(
            """SELECT id FROM chat_sessions
               WHERE patient_email=%s AND doctor_id=%s AND status != 'closed'
               LIMIT 1""",
            (patient_email, doctor_id)
        )
        existing = cursor.fetchone()
        if existing:
            # Update patient_name if provided and not already stored
            if patient_name:
                try:
                    cursor.execute(
                        "UPDATE chat_sessions SET patient_name=%s WHERE id=%s AND (patient_name IS NULL OR patient_name='')",
                        (patient_name, existing[0])
                    )
                    conn.commit()
                except Exception:
                    pass
            return {"success": True, "session_id": existing[0], "reused": True}

        cursor.execute(
            """INSERT INTO chat_sessions
               (patient_email, doctor_id, patient_name, status, scheduled_open, scheduled_close)
               VALUES (%s, %s, %s, 'pending', %s, %s)""",
            (patient_email, doctor_id, patient_name, scheduled_open, scheduled_close)
        )
        conn.commit()
        session_id = cursor.lastrowid
        return {"success": True, "session_id": session_id, "reused": False}
    except Exception as e:
        conn.rollback()
        logger.error(f"create_session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/patient/{patient_email}")
async def get_patient_sessions(patient_email: str):
    """All sessions for a patient."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM chat_sessions WHERE patient_email=%s ORDER BY created_at DESC",
            (patient_email,)
        )
        rows = cursor.fetchall()
        sessions = _rows_to_list(cursor, rows)
        for s in sessions:
            if s.get("created_at"): s["created_at"] = _format_dt(s["created_at"])
            if s.get("updated_at"): s["updated_at"] = _format_dt(s["updated_at"])
            if s.get("scheduled_open"): s["scheduled_open"] = _format_dt(s["scheduled_open"])
            if s.get("scheduled_close"): s["scheduled_close"] = _format_dt(s["scheduled_close"])
        return {"success": True, "sessions": sessions}
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/doctor/{doctor_id}")
async def get_doctor_sessions(doctor_id: int):
    """All sessions for a doctor."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM chat_sessions WHERE doctor_id=%s ORDER BY updated_at DESC",
            (doctor_id,)
        )
        rows = cursor.fetchall()
        sessions = _rows_to_list(cursor, rows)
        for s in sessions:
            if s.get("created_at"): s["created_at"] = _format_dt(s["created_at"])
            if s.get("updated_at"): s["updated_at"] = _format_dt(s["updated_at"])
            if s.get("scheduled_open"): s["scheduled_open"] = _format_dt(s["scheduled_open"])
            if s.get("scheduled_close"): s["scheduled_close"] = _format_dt(s["scheduled_close"])

        # Deduplicate: one entry per patient_email (keep the most recently updated session)
        seen = {}
        for s in sessions:
            key = s.get("patient_email", "")
            if key not in seen:
                seen[key] = s
            else:
                existing_time = seen[key].get("updated_at") or ""
                current_time = s.get("updated_at") or ""
                if current_time > existing_time:
                    seen[key] = s
        deduped = list(seen.values())
        deduped.sort(key=lambda x: x.get("updated_at") or "", reverse=True)

        return {"success": True, "sessions": deduped}
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/{session_id}")
async def get_session(session_id: int):
    """Get a single session by ID."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM chat_sessions WHERE id=%s", (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        session = _row_to_dict(cursor, row)
        for k in ("created_at", "updated_at", "scheduled_open", "scheduled_close"):
            if session.get(k): session[k] = _format_dt(session[k])
        return {"success": True, "session": session}
    finally:
        cursor.close()
        conn.close()


@router.patch("/sessions/{session_id}/status")
async def update_session_status(session_id: int, body: dict):
    """
    Open or close a session.
    Body: { "status": "open"|"closed"|"pending" }
    Broadcasts a control event to all WS clients in that session.
    """
    status = body.get("status")
    if status not in ("open", "closed", "pending"):
        raise HTTPException(status_code=400, detail="status must be open, closed, or pending")

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE chat_sessions SET status=%s WHERE id=%s",
            (status, session_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")

        # Broadcast control event
        event_type = "chat_unlocked" if status == "open" else "chat_locked"
        await ws_manager.broadcast(str(session_id), {
            "type": event_type,
            "session_id": session_id,
            "status": status,
        })
        return {"success": True, "session_id": session_id, "status": status}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: int, limit: int = 100, offset: int = 0):
    """Fetch messages for a session (newest last)."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT * FROM chat_messages WHERE session_id=%s
               ORDER BY sent_at ASC LIMIT %s OFFSET %s""",
            (session_id, limit, offset)
        )
        rows = cursor.fetchall()
        messages = _rows_to_list(cursor, rows)
        for m in messages:
            if m.get("sent_at"): m["sent_at"] = _format_dt(m["sent_at"])
        return {"success": True, "messages": messages}
    finally:
        cursor.close()
        conn.close()


@router.post("/sessions/{session_id}/messages")
async def post_message(session_id: int, body: dict):
    """
    Send a REST message (fallback for non-WS clients).
    Body: { "sender_type": "patient"|"doctor", "sender_id": str,
            "message_type": "text"|"voice",
            "content": str (text), "audio_base64": str (voice) }
    """
    sender_type  = body.get("sender_type", "patient")
    sender_id    = body.get("sender_id", "unknown")
    message_type = body.get("message_type", "text")
    content      = body.get("content")
    audio_b64    = body.get("audio_base64")
    file_mime    = body.get("file_mime", "audio/webm")
    file_name    = body.get("file_name")
    client_id    = body.get("client_id")

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        if message_type == "voice":
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, audio_base64, file_mime)
                   VALUES (%s, %s, %s, 'voice', %s, %s)""",
                (session_id, sender_type, sender_id, audio_b64, file_mime)
            )
        elif message_type in ("image", "file"):
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, content, audio_base64, file_mime)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (session_id, sender_type, sender_id, message_type, content, audio_b64, file_mime)
            )
        else:
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, content)
                   VALUES (%s, %s, %s, 'text', %s)""",
                (session_id, sender_type, sender_id, content)
            )
        conn.commit()
        msg_id = cursor.lastrowid
        sent_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Broadcast via WS
        await ws_manager.broadcast(str(session_id), {
            "type": message_type,
            "id": msg_id,
            "client_id": client_id,
            "session_id": session_id,
            "sender_type": sender_type,
            "sender_id": sender_id,
            "content": content,
            "audio_base64": audio_b64 if message_type == "voice" else None,
            "file_mime": file_mime if message_type in ("voice", "image", "file") else None,
            "file_name": file_name,
            "sent_at": sent_at,
        })
        return {"success": True, "message_id": msg_id, "sent_at": sent_at}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.patch("/sessions/{session_id}/messages/read")
async def mark_messages_read(session_id: int, body: dict):
    """
    Mark messages as read.
    Body: { "reader_type": "patient"|"doctor" }
    Marks all messages NOT sent by reader_type as read.
    """
    reader_type = body.get("reader_type", "patient")
    sender_to_mark = "doctor" if reader_type == "patient" else "patient"

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """UPDATE chat_messages
               SET is_read=1
               WHERE session_id=%s AND sender_type=%s AND is_read=0""",
            (session_id, sender_to_mark)
        )
        conn.commit()
        return {"success": True, "marked": cursor.rowcount}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/unread/doctor/{doctor_id}")
async def get_doctor_unread_count(doctor_id: int):
    """Count of unread messages across all sessions for a doctor."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT COUNT(m.id)
               FROM chat_messages m
               JOIN chat_sessions s ON m.session_id = s.id
               WHERE s.doctor_id=%s
                 AND m.sender_type='patient'
                 AND m.is_read=0""",
            (doctor_id,)
        )
        row = cursor.fetchone()
        return {"success": True, "unread_count": row[0] if row else 0}
    finally:
        cursor.close()
        conn.close()


@router.get("/unread/patient/{patient_email}")
async def get_patient_unread_count(patient_email: str):
    """Count of unread messages for a patient."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT COUNT(m.id)
               FROM chat_messages m
               JOIN chat_sessions s ON m.session_id = s.id
               WHERE s.patient_email=%s
                 AND m.sender_type='doctor'
                 AND m.is_read=0""",
            (patient_email,)
        )
        row = cursor.fetchone()
        return {"success": True, "unread_count": row[0] if row else 0}
    finally:
        cursor.close()
        conn.close()


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int):
    """Hard-delete a session and all its messages."""
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM chat_sessions WHERE id=%s", (session_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True, "deleted_session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

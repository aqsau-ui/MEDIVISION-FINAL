"""WebSocket + REST router for Patient-Doctor chat sessions."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import Optional
import json
import logging
from datetime import datetime

from ..config import mysql_db
from ..config.mongodb import mongodb
from ..services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/patient-chat", tags=["patient-doctor-chat"])

# ---------------------------------------------------------------------------
# Lazy table creation
# ---------------------------------------------------------------------------

_tables_ready = False

def _ensure_tables():
    global _tables_ready
    if _tables_ready:
        return
    try:
        create_chat_tables()
        _tables_ready = True
    except Exception as e:
        logger.error(f"_ensure_tables failed: {e}")


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
# Database initializer
# ---------------------------------------------------------------------------

def create_chat_tables():
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
                file_name VARCHAR(255) NULL,
                file_mime VARCHAR(100) NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_read TINYINT(1) DEFAULT 0,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                INDEX idx_session (session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doctor_consultation_hours (
                id INT AUTO_INCREMENT PRIMARY KEY,
                doctor_id INT NOT NULL UNIQUE,
                hours_json TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        conn.commit()
        # Safe migrations for existing tables
        for sql in [
            "ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255) NULL",
            "ALTER TABLE chat_messages ADD COLUMN file_mime VARCHAR(100) NULL",
            "ALTER TABLE chat_messages MODIFY COLUMN message_type ENUM('text','voice','image','file') DEFAULT 'text'",
            "ALTER TABLE chat_sessions ADD COLUMN patient_name VARCHAR(255) NULL",
        ]:
            try:
                cursor.execute(sql)
                conn.commit()
            except Exception:
                conn.rollback()
        logger.info("Chat tables ensured")
    except Exception as e:
        logger.error(f"Failed to create chat tables: {e}")
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
    await ws_manager.connect(websocket, str(session_id))
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws_manager.send_personal(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            msg_type  = data.get("type", "text")
            client_id = data.get("client_id")  # echoed back for dedup

            if msg_type == "ping":
                await ws_manager.send_personal(websocket, {"type": "pong"})
                continue

            sender_type = data.get("sender_type", "patient")
            sender_id   = data.get("sender_id", "unknown")

            conn   = _get_conn()
            cursor = conn.cursor()
            msg_id = None
            try:
                if msg_type == "voice":
                    cursor.execute(
                        """INSERT INTO chat_messages
                           (session_id, sender_type, sender_id, message_type, audio_base64)
                           VALUES (%s, %s, %s, 'voice', %s)""",
                        (session_id, sender_type, sender_id, data.get("audio_base64", ""))
                    )
                elif msg_type in ("image", "file"):
                    cursor.execute(
                        """INSERT INTO chat_messages
                           (session_id, sender_type, sender_id, message_type, audio_base64, file_name, file_mime)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (session_id, sender_type, sender_id, msg_type,
                         data.get("file_data", ""), data.get("file_name", ""), data.get("file_mime", ""))
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
                logger.error(f"DB error saving WS message: {e}")
                conn.rollback()
            finally:
                cursor.close()
                conn.close()

            await ws_manager.broadcast(str(session_id), {
                "type":        msg_type,
                "id":          msg_id,
                "client_id":   client_id,
                "session_id":  session_id,
                "sender_type": sender_type,
                "sender_id":   sender_id,
                "content":     data.get("content"),
                "audio_base64": data.get("audio_base64") if msg_type == "voice" else None,
                "file_data":   data.get("file_data") if msg_type in ("image","file") else None,
                "file_name":   data.get("file_name"),
                "file_mime":   data.get("file_mime"),
                "sent_at":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, str(session_id))


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.post("/sessions")
async def create_session(body: dict):
    _ensure_tables()
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
        cursor.execute(
            """SELECT id FROM chat_sessions
               WHERE patient_email=%s AND doctor_id=%s AND status != 'closed'
               LIMIT 1""",
            (patient_email, doctor_id)
        )
        existing = cursor.fetchone()
        if existing:
            return {"success": True, "session_id": existing[0], "reused": True}

        cursor.execute(
            """INSERT INTO chat_sessions
               (patient_email, doctor_id, status, scheduled_open, scheduled_close, patient_name)
               VALUES (%s, %s, 'pending', %s, %s, %s)""",
            (patient_email, doctor_id, scheduled_open, scheduled_close, patient_name)
        )
        conn.commit()
        return {"success": True, "session_id": cursor.lastrowid, "reused": False}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/patient/{patient_email}")
async def get_patient_sessions(patient_email: str):
    _ensure_tables()
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
            for k in ("created_at","updated_at","scheduled_open","scheduled_close"):
                if s.get(k): s[k] = _format_dt(s[k])
        return {"success": True, "sessions": sessions}
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/doctor/{doctor_id}")
async def get_doctor_sessions(doctor_id: int):
    _ensure_tables()
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                s.*,
                (SELECT cm.content FROM chat_messages cm
                 WHERE cm.session_id=s.id AND cm.message_type='text'
                 ORDER BY cm.sent_at DESC LIMIT 1) AS last_message_text,
                (SELECT cm2.sent_at FROM chat_messages cm2
                 WHERE cm2.session_id=s.id
                 ORDER BY cm2.sent_at DESC LIMIT 1) AS last_message_at,
                (SELECT COUNT(*) FROM chat_messages cm3
                 WHERE cm3.session_id=s.id AND cm3.sender_type='patient'
                   AND cm3.is_read=0) AS unread_count,
                (SELECT COUNT(*) FROM chat_messages cm4
                 WHERE cm4.session_id=s.id) AS message_count
            FROM chat_sessions s
            WHERE s.doctor_id=%s
            HAVING message_count > 0
            ORDER BY last_message_at DESC
        """, (doctor_id,))
        rows = cursor.fetchall()
        sessions = _rows_to_list(cursor, rows)
        for s in sessions:
            for k in ("created_at","updated_at","scheduled_open","scheduled_close","last_message_at"):
                if s.get(k): s[k] = _format_dt(s[k])
        # Deduplicate: show only the latest/most-active session per unique patient
        seen = {}
        for s in sessions:
            email = s.get("patient_email", "")
            if email not in seen:
                seen[email] = s
        sessions = list(seen.values())

        return {"success": True, "sessions": sessions}
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/{session_id}")
async def get_session(session_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM chat_sessions WHERE id=%s", (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        session = _row_to_dict(cursor, row)
        for k in ("created_at","updated_at","scheduled_open","scheduled_close"):
            if session.get(k): session[k] = _format_dt(session[k])
        return {"success": True, "session": session}
    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/{session_id}/context")
async def get_session_context(session_id: int):
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT patient_email FROM chat_sessions WHERE id=%s", (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        patient_email = row[0]
    finally:
        cursor.close()
        conn.close()

    try:
        def _serialize(doc):
            if not doc: return None
            doc = dict(doc)
            doc["_id"] = str(doc["_id"])
            for k, v in list(doc.items()):
                if hasattr(v, "isoformat"): doc[k] = v.isoformat()
                if k in ("xray_image","heatmap_image","doctor_signature") and isinstance(v,str) and len(v)>500:
                    doc[k] = "[image_data]"
            return doc

        reports_col       = mongodb.get_collection("patient_reports")
        prescriptions_col = mongodb.get_collection("doctor_prescriptions")

        ai_report    = await reports_col.find_one({"patient_id": patient_email}, sort=[("created_at",-1)])
        prescription = await prescriptions_col.find_one({"patient_id": patient_email}, sort=[("created_at",-1)])

        return {
            "success": True, "patient_email": patient_email,
            "ai_report": _serialize(ai_report),
            "prescription": _serialize(prescription),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_session_context error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient-reports/{patient_email}")
async def get_patient_reports(patient_email: str):
    """Latest AI report + prescription for a patient — used by patient chat panel."""
    try:
        def _serialize(doc):
            if not doc: return None
            doc = dict(doc)
            doc["_id"] = str(doc["_id"])
            for k, v in list(doc.items()):
                if hasattr(v, "isoformat"): doc[k] = v.isoformat()
                if k in ("xray_image","heatmap_image","doctor_signature") and isinstance(v,str) and len(v)>500:
                    doc[k] = "[image_data]"
            return doc

        reports_col       = mongodb.get_collection("patient_reports")
        prescriptions_col = mongodb.get_collection("doctor_prescriptions")

        ai_report    = await reports_col.find_one({"patient_id": patient_email}, sort=[("created_at",-1)])
        prescription = await prescriptions_col.find_one({"patient_id": patient_email}, sort=[("created_at",-1)])

        return {
            "success": True,
            "ai_report": _serialize(ai_report),
            "prescription": _serialize(prescription),
        }
    except Exception as e:
        logger.error(f"get_patient_reports error: {e}")
        return {"success": False, "ai_report": None, "prescription": None}


@router.patch("/sessions/{session_id}/status")
async def update_session_status(session_id: int, body: dict):
    status = body.get("status")
    if status not in ("open","closed","pending"):
        raise HTTPException(status_code=400, detail="status must be open, closed, or pending")

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE chat_sessions SET status=%s WHERE id=%s", (status, session_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        event_type = "chat_unlocked" if status == "open" else "chat_locked"
        await ws_manager.broadcast(str(session_id), {"type": event_type, "session_id": session_id, "status": status})
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
    _ensure_tables()
    sender_type  = body.get("sender_type", "patient")
    sender_id    = body.get("sender_id", "unknown")
    message_type = body.get("message_type", "text")
    content      = body.get("content")
    audio_b64    = body.get("audio_base64")
    file_data    = body.get("file_data")
    file_name    = body.get("file_name")
    file_mime    = body.get("file_mime")
    client_id    = body.get("client_id")  # echoed back for dedup

    conn = _get_conn()
    cursor = conn.cursor()
    try:
        if message_type == "voice":
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, audio_base64)
                   VALUES (%s, %s, %s, 'voice', %s)""",
                (session_id, sender_type, sender_id, audio_b64)
            )
        elif message_type in ("image", "file"):
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, audio_base64, file_name, file_mime)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (session_id, sender_type, sender_id, message_type,
                 file_data or audio_b64, file_name, file_mime)
            )
        else:
            cursor.execute(
                """INSERT INTO chat_messages
                   (session_id, sender_type, sender_id, message_type, content)
                   VALUES (%s, %s, %s, 'text', %s)""",
                (session_id, sender_type, sender_id, content)
            )
        conn.commit()
        msg_id  = cursor.lastrowid
        sent_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        await ws_manager.broadcast(str(session_id), {
            "type":        message_type,
            "id":          msg_id,
            "client_id":   client_id,
            "session_id":  session_id,
            "sender_type": sender_type,
            "sender_id":   sender_id,
            "content":     content,
            "audio_base64": audio_b64 if message_type == "voice" else None,
            "file_data":   file_data if message_type in ("image","file") else None,
            "file_name":   file_name,
            "file_mime":   file_mime,
            "sent_at":     sent_at,
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
    reader_type    = body.get("reader_type", "patient")
    sender_to_mark = "doctor" if reader_type == "patient" else "patient"
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """UPDATE chat_messages SET is_read=1
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
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT COUNT(m.id) FROM chat_messages m
               JOIN chat_sessions s ON m.session_id=s.id
               WHERE s.doctor_id=%s AND m.sender_type='patient' AND m.is_read=0""",
            (doctor_id,)
        )
        row = cursor.fetchone()
        return {"success": True, "unread_count": row[0] if row else 0}
    finally:
        cursor.close()
        conn.close()


@router.get("/unread/patient/{patient_email}")
async def get_patient_unread_count(patient_email: str):
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """SELECT COUNT(m.id) FROM chat_messages m
               JOIN chat_sessions s ON m.session_id=s.id
               WHERE s.patient_email=%s AND m.sender_type='doctor' AND m.is_read=0""",
            (patient_email,)
        )
        row = cursor.fetchone()
        return {"success": True, "unread_count": row[0] if row else 0}
    finally:
        cursor.close()
        conn.close()


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int):
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


DEFAULT_HOURS = {
    "monday":    {"enabled": True,  "open": "09:00", "close": "17:00"},
    "tuesday":   {"enabled": True,  "open": "09:00", "close": "17:00"},
    "wednesday": {"enabled": True,  "open": "09:00", "close": "17:00"},
    "thursday":  {"enabled": True,  "open": "09:00", "close": "17:00"},
    "friday":    {"enabled": True,  "open": "09:00", "close": "17:00"},
    "saturday":  {"enabled": True,  "open": "09:00", "close": "13:00"},
    "sunday":    {"enabled": False, "open": "",      "close": ""},
}


@router.get("/doctor/{doctor_id}/hours")
async def get_consultation_hours(doctor_id: int):
    _ensure_tables()
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT hours_json FROM doctor_consultation_hours WHERE doctor_id=%s", (doctor_id,))
        row = cursor.fetchone()
        if row:
            return {"success": True, "hours": json.loads(row[0])}
        return {"success": True, "hours": DEFAULT_HOURS}
    finally:
        cursor.close()
        conn.close()


@router.post("/doctor/{doctor_id}/hours")
async def set_consultation_hours(doctor_id: int, body: dict):
    _ensure_tables()
    hours = body.get("hours")
    if not hours:
        raise HTTPException(status_code=400, detail="hours required")
    conn = _get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO doctor_consultation_hours (doctor_id, hours_json)
               VALUES (%s, %s)
               ON DUPLICATE KEY UPDATE hours_json=%s, updated_at=NOW()""",
            (doctor_id, json.dumps(hours), json.dumps(hours))
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

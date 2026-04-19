import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatModule.css';

const API = 'http://localhost:5000/api/chat';
const WS_BASE = 'ws://localhost:5000/api/chat/ws';

// ── SVG icons ────────────────────────────────────────────────────────────────
const Ic = {
  chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  close: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  chevDown: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevUp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  expand: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  ),
  compress: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  ),
  mic: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  attach: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  lock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  clock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

// Detect best audio MIME type for this browser
function getBestMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export default function PatientChatPanel({ doctorId, doctorName, availabilityTime, onClose }) {
  const [expanded,     setExpanded]     = useState(true);
  const [maximized,    setMaximized]    = useState(false);
  const [sessionId,    setSessionId]    = useState(null);
  const [sessionStatus,setSessionStatus]= useState('pending');
  const [messages,     setMessages]     = useState([]);
  const [inputText,    setInputText]    = useState('');
  const [recording,    setRecording]    = useState(false);
  const [connecting,   setConnecting]   = useState(false);

  const wsRef        = useRef(null);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const bottomRef    = useRef(null);
  const pingTimer    = useRef(null);
  const sessionRef   = useRef(null);   // always-current session ID for async closures
  const mimeRef      = useRef('');
  const fileInputRef = useRef(null);

  const patientData  = JSON.parse(localStorage.getItem('patientData') || '{}');
  const patientEmail = patientData.email || patientData.Email || '';
  const patientName  = patientData.name || patientData.Name || patientData.fullName || patientEmail;

  // ── Create / resume session ─────────────────────────────────────────────
  useEffect(() => {
    if (!patientEmail || !doctorId) return;
    (async () => {
      try {
        const res  = await fetch(`${API}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_email: patientEmail,
            doctor_id:     doctorId,
            patient_name:  patientName,
          }),
        });
        const data = await res.json();
        if (data.success) {
          sessionRef.current = data.session_id;
          setSessionId(data.session_id);
        }
      } catch (e) {
        console.error('PatientChatPanel: session init error', e);
      }
    })();
  }, [patientEmail, doctorId]); // eslint-disable-line

  // ── Load history & session status ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const [msgRes, sesRes] = await Promise.all([
          fetch(`${API}/sessions/${sessionId}/messages`),
          fetch(`${API}/sessions/${sessionId}`),
        ]);
        const msgData = await msgRes.json();
        const sesData = await sesRes.json();
        if (msgData.success) setMessages(msgData.messages || []);
        if (sesData.success) setSessionStatus(sesData.session.status);
      } catch (e) {
        console.error('PatientChatPanel: load error', e);
      }
    })();
  }, [sessionId]);

  // ── WebSocket ───────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    const sid = sessionRef.current;
    if (!sid) return;
    if (wsRef.current && wsRef.current.readyState < 2) return;

    setConnecting(true);
    const ws = new WebSocket(`${WS_BASE}/${sid}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'pong') return;
        if (payload.type === 'chat_unlocked') { setSessionStatus('open');   return; }
        if (payload.type === 'chat_locked')   { setSessionStatus('closed'); return; }

        if (['text', 'voice', 'image', 'file'].includes(payload.type)) {
          setMessages(prev => {
            // Replace optimistic message that shares this client_id
            if (payload.client_id) {
              const idx = prev.findIndex(m => m.id === payload.client_id);
              if (idx !== -1) {
                const updated = [...prev];
                // Preserve local_url so voice note keeps playing immediately
                updated[idx] = { ...payload, local_url: prev[idx].local_url };
                return updated;
              }
            }
            // Dedup by server id
            if (payload.id && prev.some(m => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      } catch (_) {}
    };

    ws.onerror  = () => setConnecting(false);
    ws.onclose  = () => { clearInterval(pingTimer.current); setConnecting(false); };
  }, []);

  useEffect(() => {
    if (sessionId) connectWS();
    return () => {
      wsRef.current?.close();
      clearInterval(pingTimer.current);
    };
  }, [sessionId, connectWS]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Mark as read ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !expanded) return;
    fetch(`${API}/sessions/${sessionId}/messages/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reader_type: 'patient' }),
    }).catch(() => {});
  }, [sessionId, expanded, messages.length]);

  // ── Send text (REST-first, WS dedup via client_id) ──────────────────────
  const sendTextMsg = (textToSend) => {
    const text = textToSend.trim();
    const sid  = sessionRef.current;
    // Allow sending in 'pending' (doctor offline) — message queues until session opens
    if (!text || sessionStatus === 'closed' || !sid) return;

    const cid = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id:           cid,
      session_id:   sid,
      sender_type:  'patient',
      message_type: 'text',
      content:      text,
      sent_at:      new Date().toISOString(),
    }]);
    setInputText('');

    fetch(`${API}/sessions/${sid}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_type:  'patient',
        sender_id:    patientEmail,
        message_type: 'text',
        content:      text,
        client_id:    cid,
      }),
    }).catch(console.error);
  };

  const sendText = () => sendTextMsg(inputText);

  // ── Voice recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    if (sessionStatus !== 'open') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const mime = getBestMime();
      mimeRef.current = mime;
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const actualMime = mr.mimeType || mime || 'audio/webm';
        const blob = new Blob(audioChunks.current, { type: actualMime });
        if (blob.size === 0) return;

        const sid       = sessionRef.current;
        const cid       = `opt-${Date.now()}`;
        const local_url = URL.createObjectURL(blob);

        // Immediately show voice note with local playback URL
        setMessages(prev => [...prev, {
          id:           cid,
          sender_type:  'patient',
          message_type: 'voice',
          sent_at:      new Date().toISOString(),
          local_url,
          file_mime:    actualMime,
        }]);

        // Convert to base64 and POST to REST
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result.split(',')[1];
          fetch(`${API}/sessions/${sid}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_type:  'patient',
              sender_id:    patientEmail,
              message_type: 'voice',
              audio_base64: b64,
              file_mime:    actualMime,
              client_id:    cid,
            }),
          }).catch(console.error);
        };
        reader.readAsDataURL(blob);
      };

      mr.start(250);
      setRecording(true);
    } catch (e) {
      console.error('Microphone access denied', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && recording) {
      mediaRecRef.current.stop();
      setRecording(false);
    }
  };

  // ── File / image upload ─────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sid = sessionRef.current;
    if (!sid || sessionStatus !== 'open') return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl   = reader.result;
      const b64       = dataUrl.split(',')[1];
      const isImage   = file.type.startsWith('image/');
      const cid       = `opt-${Date.now()}`;

      setMessages(prev => [...prev, {
        id:           cid,
        sender_type:  'patient',
        message_type: isImage ? 'image' : 'file',
        file_name:    file.name,
        file_mime:    file.type,
        content:      isImage ? dataUrl : null,
        sent_at:      new Date().toISOString(),
      }]);

      fetch(`${API}/sessions/${sid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type:  'patient',
          sender_id:    patientEmail,
          message_type: isImage ? 'image' : 'file',
          content:      isImage ? dataUrl : null,
          audio_base64: isImage ? null : b64,
          file_name:    file.name,
          file_mime:    file.type,
          client_id:    cid,
        }),
      }).catch(console.error);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Message renderer ────────────────────────────────────────────────────
  const renderMsg = (msg, i) => {
    const isMe = msg.sender_type === 'patient';
    const time  = msg.sent_at
      ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    let body;
    if (msg.message_type === 'voice') {
      const src = msg.local_url
        ? msg.local_url
        : msg.audio_base64
        ? `data:${msg.file_mime || 'audio/webm'};base64,${msg.audio_base64}`
        : null;
      body = src
        ? <audio controls src={src} style={{ maxWidth: '200px', display: 'block' }} />
        : <span style={{ fontSize: '12px', color: '#94a3b8' }}>Voice note (processing…)</span>;
    } else if (msg.message_type === 'image' && msg.content) {
      body = <img src={msg.content} alt="attachment" style={{ maxWidth: '180px', borderRadius: '6px', display: 'block' }} />;
    } else if (msg.message_type === 'file') {
      body = (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Ic.attach}
          <span>{msg.file_name || 'File'}</span>
        </span>
      );
    } else {
      body = <span>{msg.content}</span>;
    }

    return (
      <div key={msg.id || i} className={`cp-bubble-wrap ${isMe ? 'cp-me' : 'cp-them'}`}>
        <div className={`cp-bubble ${isMe ? 'cp-bubble-me' : 'cp-bubble-them'}`}>
          {body}
          <span className="cp-time">{time}</span>
        </div>
      </div>
    );
  };

  // ── Status ──────────────────────────────────────────────────────────────
  const statusLabel = sessionStatus === 'open'   ? 'Live'
    : sessionStatus === 'closed' ? 'Closed'
    : 'Awaiting Doctor';
  const statusColor = sessionStatus === 'open'   ? '#22c55e'
    : sessionStatus === 'closed' ? '#ef4444'
    : '#f59e0b';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`cp-panel${expanded ? '' : ' cp-collapsed'}${maximized ? ' cp-maximized' : ''}`}>
      {/* Header */}
      <div className="cp-header" onClick={() => setExpanded(v => !v)}>
        <div className="cp-header-left">
          <div className="cp-avatar-wrap">{Ic.chat}</div>
          <div>
            <p className="cp-doctor-name">{doctorName || 'Your Doctor'}</p>
            <span className="cp-status-dot" style={{ background: statusColor }} />
            <span className="cp-status-label">{statusLabel}</span>
            {availabilityTime && (
              <p style={{fontSize:11, color:'#38B2AC', margin:0, fontWeight:600}}>
                {availabilityTime}
              </p>
            )}
          </div>
        </div>
        <div className="cp-header-right" onClick={e => e.stopPropagation()}>
          {connecting && <span className="cp-connecting-dot" title="Connecting…">●</span>}
          <button
            className="cp-icon-btn"
            title={maximized ? 'Restore size' : 'Expand panel'}
            onClick={() => setMaximized(v => !v)}
          >
            {maximized ? Ic.compress : Ic.expand}
          </button>
          <button
            className="cp-icon-btn"
            title={expanded ? 'Minimise' : 'Open'}
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? Ic.chevDown : Ic.chevUp}
          </button>
          <button className="cp-icon-btn" title="Close" onClick={onClose}>
            {Ic.close}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Messages */}
          <div className="cp-messages">
            {messages.length === 0 && (
              <div className="cp-empty">
                {sessionStatus === 'pending'
                  ? 'Waiting for the doctor to open this session.'
                  : 'No messages yet.'}
              </div>
            )}
            {messages.length === 0 && sessionStatus !== 'closed' && (
              <div style={{padding:'12px 16px'}}>
                <button
                  className="dci-consult-btn"
                  style={{width:'100%', textAlign:'left', cursor:'pointer'}}
                  onClick={() => {
                    const msg = "Hello! I would like to consult with you regarding my health condition.";
                    sendTextMsg(msg);
                  }}
                >
                  💬 Hello! I would like to consult with you.
                </button>
              </div>
            )}
            {messages.map(renderMsg)}
            <div ref={bottomRef} />
          </div>

          {/* Input bar or locked notice */}
          {sessionStatus !== 'closed' ? (
            <div className="cp-input-bar">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button
                className="cp-icon-btn"
                title="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                {Ic.attach}
              </button>
              <input
                className="cp-input"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendText()}
                placeholder="Type a message…"
              />
              <button
                className={`cp-icon-btn${recording ? ' cp-recording' : ''}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                title="Hold to record voice note"
              >
                {Ic.mic}
              </button>
              <button className="cp-send-btn" onClick={sendText} title="Send">
                {Ic.send}
              </button>
            </div>
          ) : (
            <div className="cp-locked-bar">
              {Ic.lock}
              <span style={{ marginLeft: 8 }}>
                {sessionStatus === 'closed'
                  ? 'Session closed by doctor'
                  : 'Waiting for doctor to open session'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

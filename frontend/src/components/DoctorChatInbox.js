import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatModule.css';

const API     = 'http://localhost:8001/api/patient-chat';
const WS_BASE = 'ws://localhost:8001/api/patient-chat/ws';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

// -- Professional inline SVG icons --------------------------------------------
const Ic = {
  chat:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  clock:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mic:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  send:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  close:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  expand:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  compress:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>,
  attach:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  lock:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  person:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  download:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  fileDoc:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  brain:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.96-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.96-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2"/></svg>,
  pill:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
};

export default function DoctorChatInbox({ doctorId, onClose }) {
  const [sessions,        setSessions]        = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession,   setActiveSession]   = useState(null);
  const [messages,        setMessages]        = useState([]);
  const [inputText,       setInputText]       = useState('');
  const [recording,       setRecording]       = useState(false);
  const [fullscreen,      setFullscreen]      = useState(false);

  // Context panel — AI report + prescription
  const [reportContext,   setReportContext]   = useState(null);
  const [loadingContext,  setLoadingContext]  = useState(false);
  const [reportModal,     setReportModal]     = useState(null); // 'ai' | 'rx' | null

  // Consultation hours
  const [showHoursModal,  setShowHoursModal]  = useState(false);
  const [consultHours,    setConsultHours]    = useState({
    monday:    { enabled: true,  open: '09:00', close: '17:00' },
    tuesday:   { enabled: true,  open: '09:00', close: '17:00' },
    wednesday: { enabled: true,  open: '09:00', close: '17:00' },
    thursday:  { enabled: true,  open: '09:00', close: '17:00' },
    friday:    { enabled: true,  open: '09:00', close: '17:00' },
    saturday:  { enabled: true,  open: '09:00', close: '13:00' },
    sunday:    { enabled: false, open: '',      close: ''       },
  });
  const [hoursSaving, setHoursSaving] = useState(false);

  const wsRef        = useRef(null);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const bottomRef    = useRef(null);
  const pingTimer    = useRef(null);
  const fileInputRef = useRef(null);

  const doctorIdNum = parseInt(doctorId, 10) || doctorId;

  // -- Load consultation hours -----------------------------------------------
  useEffect(() => {
    if (!doctorIdNum) return;
    fetch(`${API}/doctor/${doctorIdNum}/hours`)
      .then(r => r.json())
      .then(d => { if (d.success && d.hours) setConsultHours(d.hours); })
      .catch(() => {});
  }, [doctorIdNum]);

  // -- Load sessions ---------------------------------------------------------
  const loadSessions = useCallback(async () => {
    if (!doctorIdNum) return;
    try {
      const res  = await fetch(`${API}/sessions/doctor/${doctorIdNum}`);
      const data = await res.json();
      if (data.success) setSessions(data.sessions || []);
    } catch (e) { console.error('load sessions error', e); }
  }, [doctorIdNum]);

  useEffect(() => {
    loadSessions();
    const iv = setInterval(loadSessions, 8000);
    return () => clearInterval(iv);
  }, [loadSessions]);

  // -- Load messages + session detail when session selected ------------------
  useEffect(() => {
    if (!activeSessionId) return;
    (async () => {
      try {
        const [msgRes, sesRes] = await Promise.all([
          fetch(`${API}/sessions/${activeSessionId}/messages`),
          fetch(`${API}/sessions/${activeSessionId}`),
        ]);
        const msgData = await msgRes.json();
        const sesData = await sesRes.json();
        if (msgData.success) setMessages(msgData.messages || []);
        if (sesData.success) setActiveSession(sesData.session);
      } catch (e) { console.error('load messages error', e); }
    })();

    // Load medical context (right panel)
    setReportContext(null);
    setLoadingContext(true);
    fetch(`${API}/sessions/${activeSessionId}/context`)
      .then(r => r.json())
      .then(d => { if (d.success) setReportContext(d); })
      .catch(() => {})
      .finally(() => setLoadingContext(false));
  }, [activeSessionId]);

  // -- Mark read -------------------------------------------------------------
  useEffect(() => {
    if (!activeSessionId) return;
    fetch(`${API}/sessions/${activeSessionId}/messages/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reader_type: 'doctor' }),
    })
      .then(() => setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, unread_count: 0 } : s)))
      .catch(() => {});
  }, [activeSessionId, messages.length]);

  // -- WebSocket -------------------------------------------------------------
  useEffect(() => {
    if (!activeSessionId) return;
    if (wsRef.current) { wsRef.current.close(); clearInterval(pingTimer.current); }

    const ws = new WebSocket(`${WS_BASE}/${activeSessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };

    ws.onmessage = event => {
      try {
        const p = JSON.parse(event.data);
        if (p.type === 'pong') return;
        if (p.type === 'chat_unlocked') {
          setActiveSession(prev => prev ? { ...prev, status: 'open'   } : prev);
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: 'open'   } : s));
          return;
        }
        if (p.type === 'chat_locked') {
          setActiveSession(prev => prev ? { ...prev, status: 'closed' } : prev);
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: 'closed' } : s));
          return;
        }
        if (['text','voice','image','file'].includes(p.type)) {
          setMessages(prev => {
            // Replace optimistic via client_id
            if (p.client_id) {
              const idx = prev.findIndex(m => m.id === p.client_id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...p, local_url: prev[idx].local_url };
                return updated;
              }
            }
            if (p.id && prev.some(m => String(m.id) === String(p.id))) return prev;
            return [...prev, p];
          });
          setSessions(prev => prev.map(s =>
            s.id === activeSessionId
              ? { ...s, last_message_text: p.content || (p.type !== 'text' ? `[${p.type}]` : ''), last_message_at: p.sent_at }
              : s
          ));
        }
      } catch (_) {}
    };

    ws.onclose = () => clearInterval(pingTimer.current);
    return () => { ws.close(); clearInterval(pingTimer.current); };
  }, [activeSessionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // -- Toggle session --------------------------------------------------------
  const toggleSession = async () => {
    if (!activeSession) return;
    const newStatus = activeSession.status === 'open' ? 'closed' : 'open';
    await fetch(`${API}/sessions/${activeSessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setActiveSession(prev => ({ ...prev, status: newStatus }));
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: newStatus } : s));
  };

  // -- Send text (REST-first, no duplicate) ---------------------------------
  const sendText = async () => {
    const text = inputText.trim();
    if (!text || activeSession?.status !== 'open') return;

    const doctorIdStr = String(doctorIdNum);
    const cid         = `opt-${Date.now()}`;

    setMessages(prev => [...prev, {
      id: cid, session_id: activeSessionId,
      sender_type: 'doctor', sender_id: doctorIdStr,
      message_type: 'text', content: text, sent_at: new Date().toISOString(),
    }]);
    setInputText('');

    try {
      await fetch(`${API}/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'doctor', sender_id: doctorIdStr,
          message_type: 'text', content: text, client_id: cid,
        }),
      });
    } catch (e) { console.error('send error', e); }
  };

  // -- Send file / image -----------------------------------------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSessionId || activeSession?.status !== 'open') return;
    e.target.value = '';

    const isImage  = file.type.startsWith('image/');
    const msgType  = isImage ? 'image' : 'file';
    const cid      = `opt-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const doctorIdStr = String(doctorIdNum);

    setMessages(prev => [...prev, {
      id: cid, session_id: activeSessionId, sender_type: 'doctor', sender_id: doctorIdStr,
      message_type: msgType, file_name: file.name, file_mime: file.type,
      local_url: localUrl, sent_at: new Date().toISOString(),
    }]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result.split(',')[1];
      try {
        await fetch(`${API}/sessions/${activeSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_type: 'doctor', sender_id: doctorIdStr,
            message_type: msgType, file_data: b64,
            file_name: file.name, file_mime: file.type, client_id: cid,
          }),
        });
      } catch (err) { console.error('file send error', err); }
    };
    reader.readAsDataURL(file);
  };

  // -- Voice recording -------------------------------------------------------
  const startRecording = async () => {
    if (activeSession?.status !== 'open') return;
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mr.onstop = async () => {
        const blob        = new Blob(audioChunks.current, { type: mr.mimeType || 'audio/webm' });
        const localUrl    = URL.createObjectURL(blob);
        const cid         = `opt-${Date.now()}`;
        const doctorIdStr = String(doctorIdNum);
        const sid         = activeSessionId;

        setMessages(prev => [...prev, {
          id: cid, session_id: sid, sender_type: 'doctor', sender_id: doctorIdStr,
          message_type: 'voice', local_url: localUrl, sent_at: new Date().toISOString(),
        }]);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result.split(',')[1];
          try {
            await fetch(`${API}/sessions/${sid}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender_type: 'doctor', sender_id: doctorIdStr,
                message_type: 'voice', audio_base64: b64, client_id: cid,
              }),
            });
          } catch (err) { console.error('voice send error', err); }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(250);
      setRecording(true);
    } catch (e) { console.error('Mic error', e); }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && recording) { mediaRecRef.current.stop(); setRecording(false); }
  };

  // -- Save consultation hours -----------------------------------------------
  const saveHours = async () => {
    setHoursSaving(true);
    try {
      const res  = await fetch(`${API}/doctor/${doctorIdNum}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: consultHours }),
      });
      const data = await res.json();
      if (data.success) setShowHoursModal(false);
      else alert('Failed to save hours. Please try again.');
    } catch (e) { console.error(e); alert('Network error saving hours.'); }
    setHoursSaving(false);
  };

  // -- Render message content ------------------------------------------------
  const renderMsg = (msg) => {
    if (msg.message_type === 'voice') {
      const src = msg.local_url || (msg.audio_base64 ? `data:audio/webm;base64,${msg.audio_base64}` : null);
      return src
        ? <audio controls src={src} style={{ maxWidth: 220, outline: 'none', display: 'block' }} />
        : <span style={{ fontSize: 12, opacity: 0.8 }}>Voice note (processing…)</span>;
    }
    if (msg.message_type === 'image') {
      const src = msg.local_url || (msg.audio_base64 ? `data:${msg.file_mime || 'image/jpeg'};base64,${msg.audio_base64}` : null);
      return src
        ? <div><img src={src} alt={msg.file_name || 'Image'} style={{ maxWidth: 220, borderRadius: 8, display: 'block' }} />
            {msg.file_name && <span style={{ fontSize: 11, opacity: 0.7, marginTop: 3, display: 'block' }}>{msg.file_name}</span>}
          </div>
        : <span style={{ fontSize: 12 }}>{msg.file_name || 'Image'}</span>;
    }
    if (msg.message_type === 'file') {
      const href = msg.local_url || (msg.audio_base64 ? `data:${msg.file_mime || 'application/octet-stream'};base64,${msg.audio_base64}` : null);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'inherit', opacity: 0.8 }}>{Ic.fileDoc}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{msg.file_name || 'File'}</div>
            {href && <a href={href} download={msg.file_name} style={{ fontSize: 11, color: 'inherit', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Ic.download} Download</a>}
          </div>
        </div>
      );
    }
    return <span>{msg.content}</span>;
  };

  // -- Helpers ---------------------------------------------------------------
  const statusDot = s => s === 'open' ? '#22c55e' : s === 'closed' ? '#ef4444' : '#f59e0b';
  const fmtTime   = ts => {
    if (!ts) return '';
    const d = new Date(ts), today = new Date();
    return d.toDateString() === today.toDateString()
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const ai = reportContext?.ai_report;
  const rx = reportContext?.prescription;

  // -- Render ----------------------------------------------------------------
  return (
    <div className="dci-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`dci-modal${fullscreen ? ' dci-fullscreen' : ''}`}>

        {/* Header */}
        <div className="dci-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#5eead4' }}>{Ic.chat}</span>
            <span className="dci-title">Patient Consultations</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="dci-hours-btn" onClick={() => setShowHoursModal(true)}>
              <span style={{ marginRight: 6 }}>{Ic.clock}</span>Set Hours
            </button>
            <button className="dci-icon-btn-hdr" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => setFullscreen(v => !v)}>
              {fullscreen ? Ic.compress : Ic.expand}
            </button>
            <button className="dci-close" onClick={onClose}>{Ic.close}</button>
          </div>
        </div>

        {/* 3-column body */}
        <div className="dci-body">

          {/* - Column 1: Session list - */}
          <div className="dci-col-sessions">
            <p className="dci-col-head">
              Patient Messages
              {sessions.length > 0 && (
                <span style={{ marginLeft: 8, background: '#38B2AC', color: '#fff', borderRadius: '50%', fontSize: 11, fontWeight: 700, padding: '1px 6px' }}>
                  {sessions.length}
                </span>
              )}
            </p>

            {sessions.length === 0 && (
              <p className="dci-empty">No messages yet.<br />Patients contact you from the Recommendations page.</p>
            )}

            {sessions.map(s => (
              <div
                key={s.id}
                className={`dci-session-item${activeSessionId === s.id ? ' dci-session-active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="dci-session-avatar">
                  <span>{Ic.person}</span>
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: statusDot(s.status), border: '1.5px solid #0a1120' }} />
                </div>
                <div className="dci-session-info">
                  <p className="dci-session-email">{s.patient_email}</p>
                  {s.last_message_text && (
                    <p style={{ margin: 0, fontSize: 11.5, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {s.last_message_text}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10.5, color: '#475569' }}>{fmtTime(s.last_message_at)}</span>
                  {s.unread_count > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.unread_count > 9 ? '9+' : s.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* - Column 2: Chat - */}
          <div className="dci-col-chat">
            {!activeSessionId ? (
              <div className="dci-no-chat">
                <span style={{ color: '#334155' }}>{Ic.chat}</span>
                <p style={{ marginTop: 12, color: '#475569', fontSize: 14 }}>Select a patient to view the conversation</p>
              </div>
            ) : (
              <>
                {/* Topbar */}
                <div className="dci-chat-topbar">
                  <div>
                    <span className="dci-chat-patient">{activeSession?.patient_email || '—'}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: statusDot(activeSession?.status) }}>
                      ● {activeSession?.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <button
                    className={`dci-toggle-btn${activeSession?.status === 'open' ? ' dci-toggle-open' : ' dci-toggle-closed'}`}
                    onClick={toggleSession}
                  >
                    <span style={{ marginRight: 5 }}>{activeSession?.status === 'open' ? Ic.lock : Ic.unlock}</span>
                    {activeSession?.status === 'open' ? 'Close Session' : 'Open Session'}
                  </button>
                </div>

                {/* Messages */}
                <div className="dci-messages">
                  {messages.length === 0 && <div className="dci-empty">No messages yet.</div>}
                  {messages.map((msg, i) => {
                    const isMe     = msg.sender_type === 'doctor';
                    const isSystem = msg.sender_type === 'system';
                    return (
                      <div key={msg.id || i} className={`cp-bubble-wrap${isMe ? ' cp-me' : isSystem ? '' : ' cp-them'}`}>
                        <div className={`cp-bubble${isSystem ? ' cp-bubble-system' : isMe ? ' dci-bubble-me' : ' dci-bubble-them'}`}>
                          {renderMsg(msg)}
                          {!isSystem && (
                            <span className="cp-time">
                              {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                {activeSession?.status === 'open' ? (
                  <div className="dci-input-bar">
                    <input type="file" ref={fileInputRef} accept="image/*,application/pdf,.doc,.docx"
                      style={{ display: 'none' }} onChange={handleFileSelect} />
                    <button className="dci-icon-btn" title="Attach file"
                      onClick={() => fileInputRef.current?.click()}>{Ic.attach}</button>
                    <input
                      className="dci-input"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
                      placeholder="Type a message…"
                    />
                    <button
                      className={`dci-mic-btn${recording ? ' cp-recording' : ''}`}
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={e => { e.preventDefault(); startRecording(); }}
                      onTouchEnd={stopRecording}
                      title={recording ? 'Release to send' : 'Hold to record'}
                    >{Ic.mic}</button>
                    <button className="dci-send-btn" onClick={sendText}>{Ic.send}</button>
                  </div>
                ) : (
                  <div className="dci-locked-bar">
                    <span style={{ marginRight: 6 }}>{Ic.lock}</span>
                    {activeSession?.status === 'closed'
                      ? 'Session closed — click "Open Session" to resume'
                      : 'Click "Open Session" to start chatting with the patient'
                    }
                  </div>
                )}
              </>
            )}
          </div>

          {/* - Column 3: Medical context - */}
          <div className="dci-col-context">
            <p className="dci-col-head">Patient Reports</p>

            {!activeSessionId && (
              <p className="dci-empty">Select a patient to view their reports.</p>
            )}

            {activeSessionId && loadingContext && (
              <p style={{ fontSize: 13, color: '#475569', padding: '12px 0' }}>Loading reports…</p>
            )}

            {activeSessionId && !loadingContext && reportContext && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* AI Report button */}
                <button
                  onClick={() => ai ? setReportModal('ai') : null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: ai ? 'linear-gradient(135deg,#0f2027,#1a3a4a)' : '#1e293b',
                    border: '1px solid #38B2AC',
                    borderRadius: 8, cursor: ai ? 'pointer' : 'default',
                    opacity: ai ? 1 : 0.5, width: '100%', textAlign: 'left'
                  }}
                >
                  {Ic.fileDoc}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>AI Medical Report</div>
                    {ai ? (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {ai.analysis?.prediction || ai.diagnosis || ai.predicted_disease || 'Unknown'} &bull; {ai.createdAt || ai.created_at ? new Date(ai.createdAt || ai.created_at).toLocaleDateString() : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#64748b' }}>No report on file</div>
                    )}
                  </div>
                  {ai && <span style={{ marginLeft: 'auto', color: '#38B2AC', fontSize: 16 }}>›</span>}
                </button>

                {/* Prescription button */}
                <button
                  onClick={() => rx ? setReportModal('rx') : null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: rx ? 'linear-gradient(135deg,#0f2027,#1a3a4a)' : '#1e293b',
                    border: '1px solid #38B2AC',
                    borderRadius: 8, cursor: rx ? 'pointer' : 'default',
                    opacity: rx ? 1 : 0.5, width: '100%', textAlign: 'left'
                  }}
                >
                  {Ic.pill}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Doctor Prescription</div>
                    {rx ? (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Dr. {rx.doctor_name || '—'} &bull; {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ''}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#64748b' }}>No prescription on file</div>
                    )}
                  </div>
                  {rx && <span style={{ marginLeft: 'auto', color: '#38B2AC', fontSize: 16 }}>›</span>}
                </button>
              </div>
            )}

            {activeSessionId && !loadingContext && !reportContext && (
              <p style={{ fontSize: 12, color: '#475569', padding: '12px 0' }}>Could not load reports for this patient.</p>
            )}
          </div>
        </div>
      </div>

      {/* Consultation Hours Modal */}
      {showHoursModal && (
        <div className="dci-hours-overlay" onClick={e => e.target === e.currentTarget && setShowHoursModal(false)}>
          <div className="dci-hours-modal">
            <div className="dci-hours-header">
              <span><span style={{ marginRight: 8 }}>{Ic.clock}</span>Consultation Hours</span>
              <button className="dci-close" onClick={() => setShowHoursModal(false)}>{Ic.close}</button>
            </div>
            <p className="dci-hours-sub">Set your weekly availability. Patients can only message during these hours (they can always send an initial request).</p>
            <div className="dci-hours-grid">
              {DAYS.map(day => {
                const d     = consultHours[day] || { enabled: false, open: '', close: '' };
                const isSun = day === 'sunday';
                return (
                  <div key={day} className={`dci-hours-row${!d.enabled ? ' dci-hours-off' : ''}`}>
                    <div className="dci-hours-day">
                      <span className="dci-hours-dayname">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      {isSun ? (
                        <span className="dci-hours-off-badge">Off</span>
                      ) : (
                        <label className="dci-hours-toggle">
                          <input type="checkbox" checked={!!d.enabled}
                            onChange={e => setConsultHours(prev => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))} />
                          <span className="dci-hours-slider" />
                        </label>
                      )}
                    </div>
                    {!isSun && d.enabled && (
                      <div className="dci-hours-times">
                        <input type="time" value={d.open || '09:00'} className="dci-time-input"
                          onChange={e => setConsultHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))} />
                        <span className="dci-hours-to">to</span>
                        <input type="time" value={d.close || '17:00'} className="dci-time-input"
                          onChange={e => setConsultHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))} />
                      </div>
                    )}
                    {!isSun && !d.enabled && <div className="dci-hours-times dci-hours-unavail">Not available</div>}
                  </div>
                );
              })}
            </div>
            <div className="dci-hours-footer">
              <button className="dci-hours-cancel" onClick={() => setShowHoursModal(false)}>Cancel</button>
              <button className="dci-hours-save" onClick={saveHours} disabled={hoursSaving}>
                {hoursSaving ? 'Saving…' : 'Save Hours'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report detail modal */}
      {reportModal && reportContext && (
        <div
          onClick={() => setReportModal(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 40, 55, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, width: '100%', maxWidth: 960,
              maxHeight: '92vh', overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
              fontFamily: '"Times New Roman", Georgia, serif'
            }}
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg,#1a3a4a,#38B2AC)',
              padding: '16px 24px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '12px 12px 0 0', position: 'sticky', top: 0, zIndex: 2
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
                {reportModal === 'ai' ? 'AI Medical Report' : 'Doctor Prescription'}
              </span>
              <button
                onClick={() => setReportModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: '50%', width: 32, height: 32,
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >×</button>
            </div>

            {/* AI Report content — uses correct nested field paths from MongoDB */}
            {reportModal === 'ai' && ai && (() => {
              const pred   = ai.analysis?.prediction || ai.diagnosis || ai.predicted_disease || '';
              const conf   = parseFloat(ai.analysis?.confidence ?? ai.confidence ?? 0);
              const sev    = ai.analysis?.severity || ai.severity || '';
              const expl   = ai.analysis?.heatmapExplanation || ai.medical_context || '';
              const pName  = ai.patient?.name  || ai.patient_name  || '—';
              const pAge   = ai.patient?.age   || ai.patient_age   || '—';
              const pGend  = ai.patient?.gender|| ai.patient_gender|| '—';
              const pSmoke = ai.patient?.smokingStatus || ai.smoking_status || '—';
              const pCough = ai.patient?.hasCough || '—';
              const symp   = ai.medicalInfo?.symptoms || ai.symptoms || '';
              const hist   = ai.medicalInfo?.medicalHistory || ai.medical_history || '';
              const rDate  = ai.createdAt || ai.created_at || ai.timestamp;
              const isNorm = pred === 'Normal';
              return (
                <div style={{ padding: '24px 30px' }}>
                  {/* MEDIVISION header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #38B2AC', paddingBottom: 12, marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#38B2AC', letterSpacing: 1 }}>MEDIVISION</div>
                      <div style={{ fontSize: 12, color: '#718096' }}>AI-Powered Radiology Platform</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#4a5568', lineHeight: 2, textAlign: 'right' }}>
                      <div><strong>Report ID:</strong> {ai.reportId || ai.report_id || 'N/A'}</div>
                      <div><strong>Date:</strong> {rDate ? new Date(rDate).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</div>
                      <div><strong>Patient ID:</strong> {reportContext.patient_email?.split('@')[0].toUpperCase() || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 12 }}>Patient Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                      {[['Full Name', pName], ['Age', pAge !== '—' ? `${pAge} yrs` : '—'], ['Gender', pGend], ['Smoking', pSmoke]].map(([label, val]) => (
                        <div key={label} style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a202c' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      {symp && (
                        <div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Symptoms</div>
                          <div style={{ fontSize: 13, color: '#1a202c' }}>{symp}</div>
                        </div>
                      )}
                      {hist && (
                        <div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Medical History</div>
                          <div style={{ fontSize: 13, color: '#1a202c' }}>{hist}</div>
                        </div>
                      )}
                      <div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Cough Status</div>
                        <div style={{ fontSize: 13, color: '#1a202c' }}>{pCough}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 12 }}>AI Analysis</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center', background: '#fff' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Predicted Condition</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: isNorm ? '#2e7d32' : '#c62828', textTransform: 'uppercase' }}>{pred || 'Unknown'}</div>
                      </div>
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center', background: '#fff' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Probability Score</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1565c0' }}>{conf > 0 ? `${(conf * 100).toFixed(1)}%` : '—'}</div>
                      </div>
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center', background: '#fff' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity Level</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: sev === 'Severe' ? '#c62828' : sev === 'Moderate' ? '#e65100' : '#2e7d32', textTransform: 'uppercase' }}>
                          {sev || (conf > 0.8 ? 'Severe' : conf > 0.5 ? 'Moderate' : conf > 0 ? 'Mild' : '—')}
                        </div>
                      </div>
                    </div>
                    {expl && (
                      <div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '12px 16px', fontSize: 13, lineHeight: 1.7, color: '#6b5d47' }}>
                        <strong style={{ color: '#6c5ce7' }}>AI Analysis:</strong> {expl}
                      </div>
                    )}
                  </div>

                  {/* Clinical Impression */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 10 }}>Clinical Impression</div>
                    <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', fontSize: 14, lineHeight: 1.9, color: '#2d3748', textAlign: 'justify' }}>
                      {isNorm
                        ? 'The radiographic examination reveals lung fields within normal limits. No significant consolidation, infiltrates, or pleural effusion identified. Cardiothoracic ratio appears normal. AI analysis confirms absence of pathological findings with high confidence. Clinical correlation recommended for comprehensive patient assessment.'
                        : `The AI analysis indicates radiological patterns consistent with ${pred} showing a diagnostic probability of ${(conf * 100).toFixed(1)}%. Observed opacity regions suggest possible inflammatory infiltration within the lung fields. Severity classification: ${sev || 'Moderate'}. Correlation with clinical symptoms, laboratory investigations, and professional radiological interpretation is recommended.`
                      }
                    </div>
                  </div>

                  {/* X-Ray Images */}
                  {(ai.images?.original || ai.images?.heatmap) && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 12 }}>Chest X-Ray Images</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {ai.images?.original && (<div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#718096', marginBottom: 6 }}>Original X-Ray</div>
                          <img src={ai.images.original} alt="X-Ray" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </div>)}
                        {ai.images?.heatmap && (<div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#718096', marginBottom: 6 }}>AI Heatmap Analysis</div>
                          <img src={ai.images.heatmap} alt="Heatmap" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </div>)}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#78350f' }}>
                    <strong>⚠ Medical Disclaimer:</strong> This AI report is generated for clinical decision support only. It does not replace diagnosis or treatment by a licensed medical professional. All findings must be correlated with clinical examination, patient history, and professional radiological interpretation.
                  </div>
                </div>
              );
            })()}

            {/* Prescription content */}
            {reportModal === 'rx' && rx && (
              <div style={{ padding: '24px 30px' }}>
                {/* Doctor header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2c5f6f', paddingBottom: 14, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#2c5f6f' }}>Dr. {rx.doctor_name || '—'}</div>
                    <div style={{ fontSize: 13, color: '#4a5568', marginTop: 2 }}>{rx.doctor_qualifications || 'MBBS'}</div>
                    <div style={{ fontSize: 13, color: '#718096', fontStyle: 'italic' }}>Specialist in {rx.doctor_specialization || 'General Medicine'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#4a5568' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#38B2AC' }}>+ MEDIVISION</div>
                    <div style={{ marginTop: 4 }}>PMDC: {rx.doctor_license || '—'}</div>
                    <div>{rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : '—'}</div>
                  </div>
                </div>

                {/* Patient row */}
                <div style={{ display: 'flex', gap: 30, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
                  <span><strong>Patient:</strong> {rx.patient_name || reportContext.patient_email}</span>
                  {rx.patient_age && <span><strong>Age:</strong> {rx.patient_age}</span>}
                </div>

                {/* AI Diagnosis Verification */}
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #38B2AC', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#718096', marginBottom: 4, letterSpacing: 0.5 }}>AI Diagnosis Verification</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                    {rx.diagnosis_confirmation === 'confirm' ? '✓ Confirmed — AI diagnosis verified' : rx.diagnosis_confirmation === 'modify' ? 'Modified — See doctor\'s diagnosis below' : 'Inconclusive — Further tests recommended'}
                  </div>
                </div>

                {/* Diagnosis */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Diagnosis</div>
                  <div style={{ fontSize: 15, color: '#1a202c', lineHeight: 1.8 }}>{rx.doctor_diagnosis || '—'}</div>
                </div>

                {rx.medications && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Medications</div>
                    {rx.medications.split('\n').map((m, i) => m.trim() && (
                      <div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '5px 0', borderBottom: '1px dashed #e2e8f0' }}>• {m}</div>
                    ))}
                  </div>
                )}

                {rx.diet_recommendations && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Dietary Recommendations</div>
                    {rx.diet_recommendations.split('\n').map((d, i) => d.trim() && (
                      <div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '3px 0' }}>• {d}</div>
                    ))}
                  </div>
                )}

                {rx.precautions && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Precautions</div>
                    {rx.precautions.split('\n').map((p, i) => p.trim() && (
                      <div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '3px 0' }}>• {p}</div>
                    ))}
                  </div>
                )}

                {rx.hospital_visit_required && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#b91c1c', fontWeight: 600, fontSize: 14 }}>
                    ⚠ Patient is advised to visit a hospital for comprehensive physical examination and further diagnostic tests.
                  </div>
                )}

                {/* Signature */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'right', fontSize: 13, color: '#4a5568' }}>
                  {rx.doctor_signature && <img src={rx.doctor_signature} alt="Signature" style={{ height: 60, marginBottom: 6, display: 'inline-block' }} />}
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2c5f6f' }}>Dr. {rx.doctor_name || '—'}</div>
                  <div>{rx.doctor_license ? `PMDC: ${rx.doctor_license}` : ''}{rx.doctor_specialization ? ` | ${rx.doctor_specialization}` : ''}</div>
                  <div style={{ fontStyle: 'italic', marginTop: 4 }}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : ''}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

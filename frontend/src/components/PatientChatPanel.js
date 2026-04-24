import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatModule.css';

const API     = 'http://localhost:8001/api/patient-chat';
const WS_BASE = 'ws://localhost:8001/api/patient-chat/ws';
const DAYS    = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// -- Professional inline SVG icons --------------------------------------------
const Ic = {
  chat:      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  clock:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mic:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  send:      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  close:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevDown:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevUp:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>,
  expand:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  compress:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>,
  attach:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  report:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  pill:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
  lock:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  download:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  fileDoc:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
};

const STARTER_MESSAGE =
  'Hello Doctor, I would like to consult regarding my recent X-ray results and AI diagnostic report. ' +
  'Please review my case at your earliest convenience. Thank you.';

function isWithinHours(hours) {
  if (!hours) return false;
  const now     = new Date();
  const dayName = DAYS[now.getDay()];
  const d       = hours[dayName];
  if (!d || !d.enabled) return false;
  const [oh, om] = (d.open  || '00:00').split(':').map(Number);
  const [ch, cm] = (d.close || '00:00').split(':').map(Number);
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  return nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm;
}

function todayHoursLabel(hours) {
  if (!hours) return null;
  const now = new Date();
  const d   = hours[DAYS[now.getDay()]];
  if (!d || !d.enabled) return 'Not available today';
  return `${d.open} – ${d.close}`;
}

function formatHoursDisplay(hours) {
  if (!hours) return [];
  return ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
    const d     = hours[day];
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    if (!d || !d.enabled) return { day: label, time: 'Off', off: true };
    return { day: label, time: `${d.open} – ${d.close}`, off: false };
  });
}

// -----------------------------------------------------------------------------
export default function PatientChatPanel({ doctorId, doctorName, reportData, onClose }) {
  const [expanded,      setExpanded]      = useState(true);
  const [maximized,     setMaximized]     = useState(false);
  const [sessionId,     setSessionId]     = useState(null);
  const [sessionStatus, setSessionStatus] = useState('pending');
  const [messages,      setMessages]      = useState([]);
  const [inputText,     setInputText]     = useState('');
  const [recording,     setRecording]     = useState(false);
  const [connecting,    setConnecting]    = useState(false);
  const [consultHours,  setConsultHours]  = useState(null);
  const [showHours,     setShowHours]     = useState(false);
  const [starterSent,   setStarterSent]   = useState(false);
  const [showReport,    setShowReport]    = useState(null); // null | 'ai' | 'rx'
  const [patientDocs,   setPatientDocs]   = useState(null);
  const [loadingDocs,   setLoadingDocs]   = useState(false);

  const wsRef       = useRef(null);
  const mediaRecRef = useRef(null);
  const audioChunks = useRef([]);
  const bottomRef   = useRef(null);
  const pingTimer   = useRef(null);
  const fileInputRef= useRef(null);
  const sessionRef  = useRef(null); // always up-to-date sessionId for async closures

  const patientData  = JSON.parse(localStorage.getItem('patientData') || '{}');
  const patientEmail = patientData.email || patientData.Email || '';
  const doctorIdNum  = parseInt(doctorId, 10) || doctorId;

  const isOnline = isWithinHours(consultHours);
  const canChat  = sessionStatus === 'open' || isOnline;

  // Keep ref in sync
  useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);

  // -- Load consultation hours -----------------------------------------------
  useEffect(() => {
    if (!doctorIdNum) return;
    fetch(`${API}/doctor/${doctorIdNum}/hours`)
      .then(r => r.json())
      .then(d => { if (d.success && d.hours) setConsultHours(d.hours); })
      .catch(() => {});
  }, [doctorIdNum]);

  // -- Init / reuse session --------------------------------------------------
  useEffect(() => {
    if (!patientEmail || !doctorIdNum) return;
    (async () => {
      try {
        const res  = await fetch(`${API}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_email: patientEmail, doctor_id: doctorIdNum }),
        });
        const data = await res.json();
        if (data.success) {
          setSessionId(data.session_id);
          localStorage.setItem('activeChatSession', JSON.stringify({
            sessionId: data.session_id, doctorId: doctorIdNum, doctorName,
          }));
        }
      } catch (e) { console.error('session init', e); }
    })();
  }, [patientEmail, doctorIdNum, doctorName]);

  // -- Load messages + status ------------------------------------------------
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
        if (sesData.success) {
          setSessionStatus(sesData.session.status);
          if ((msgData.messages || []).some(m => m.sender_type === 'patient')) setStarterSent(true);
        }
      } catch (e) { console.error('load session', e); }
    })();
  }, [sessionId]);

  // -- WebSocket -------------------------------------------------------------
  const connectWS = useCallback(() => {
    if (!sessionId) return;
    if (wsRef.current && wsRef.current.readyState < 2) return;
    setConnecting(true);
    const ws = new WebSocket(`${WS_BASE}/${sessionId}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnecting(false);
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
    ws.onmessage = event => {
      try {
        const p = JSON.parse(event.data);
        if (p.type === 'pong') return;
        if (p.type === 'chat_unlocked') { setSessionStatus('open');   return; }
        if (p.type === 'chat_locked')   { setSessionStatus('closed'); return; }
        if (['text','voice','image','file'].includes(p.type)) {
          setMessages(prev => {
            // Replace optimistic message if client_id matches
            if (p.client_id) {
              const idx = prev.findIndex(m => m.id === p.client_id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...p, local_url: prev[idx].local_url };
                return updated;
              }
            }
            // Dedup by real DB id
            if (p.id && prev.some(m => String(m.id) === String(p.id))) return prev;
            return [...prev, p];
          });
        }
      } catch (_) {}
    };
    ws.onerror  = () => setConnecting(false);
    ws.onclose  = () => { clearInterval(pingTimer.current); setConnecting(false); };
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); clearInterval(pingTimer.current); };
  }, [sessionId, connectWS]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Mark read
  useEffect(() => {
    if (!sessionId || !expanded) return;
    fetch(`${API}/sessions/${sessionId}/messages/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reader_type: 'patient' }),
    }).catch(() => {});
  }, [sessionId, expanded, messages.length]);

  // -- Ensure session exists, return sid ------------------------------------
  const ensureSession = async () => {
    if (sessionRef.current) return sessionRef.current;
    const res  = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_email: patientEmail, doctor_id: doctorIdNum }),
    });
    const data = await res.json();
    if (data.success) {
      setSessionId(data.session_id);
      localStorage.setItem('activeChatSession', JSON.stringify({
        sessionId: data.session_id, doctorId: doctorIdNum, doctorName,
      }));
      return data.session_id;
    }
    throw new Error('Failed to create session');
  };

  // -- Send text -------------------------------------------------------------
  const sendText = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!text) return;

    let sid;
    try { sid = await ensureSession(); } catch (e) { return; }

    const cid = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: cid, session_id: sid, sender_type: 'patient', sender_id: patientEmail,
      message_type: 'text', content: text, sent_at: new Date().toISOString(),
    }]);
    if (overrideText === undefined) setInputText('');
    setStarterSent(true);

    try {
      await fetch(`${API}/sessions/${sid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'patient', sender_id: patientEmail,
          message_type: 'text', content: text, client_id: cid,
        }),
      });
    } catch (e) { console.error('send error', e); }
  };

  const sendStarter = () => sendText(STARTER_MESSAGE);

  // -- Send file / image -----------------------------------------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let sid;
    try { sid = await ensureSession(); } catch (err) { return; }

    const isImage = file.type.startsWith('image/');
    const msgType = isImage ? 'image' : 'file';
    const cid     = `opt-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);

    setMessages(prev => [...prev, {
      id: cid, session_id: sid, sender_type: 'patient', sender_id: patientEmail,
      message_type: msgType, file_name: file.name, file_mime: file.type,
      local_url: localUrl, sent_at: new Date().toISOString(),
    }]);
    setStarterSent(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result.split(',')[1];
      try {
        await fetch(`${API}/sessions/${sid}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_type: 'patient', sender_id: patientEmail,
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
    if (!canChat) return;
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
        const blob     = new Blob(audioChunks.current, { type: mr.mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        const cid      = `opt-${Date.now()}`;
        const sid      = sessionRef.current;

        setMessages(prev => [...prev, {
          id: cid, session_id: sid, sender_type: 'patient', sender_id: patientEmail,
          message_type: 'voice', local_url: localUrl, sent_at: new Date().toISOString(),
        }]);
        setStarterSent(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result.split(',')[1];
          try {
            await fetch(`${API}/sessions/${sid}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender_type: 'patient', sender_id: patientEmail,
                message_type: 'voice', audio_base64: b64, client_id: cid,
              }),
            });
          } catch (err) { console.error('voice send error', err); }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(250); // collect chunks every 250ms
      setRecording(true);
    } catch (e) { console.error('Mic error', e); alert('Microphone access denied. Please allow microphone access.'); }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && recording) { mediaRecRef.current.stop(); setRecording(false); }
  };

  // -- Report viewer ---------------------------------------------------------
  const openReport = async (type) => {
    setShowReport(type);
    if (patientDocs) return;
    // If reportData passed as props (from DoctorRecommendation), use it
    if (reportData) {
      setPatientDocs({ aiReport: reportData.aiReport, prescription: reportData.prescription });
      return;
    }
    // Otherwise fetch from API
    setLoadingDocs(true);
    try {
      const res  = await fetch(`${API}/patient-reports/${encodeURIComponent(patientEmail)}`);
      const data = await res.json();
      if (data.success) setPatientDocs({ aiReport: data.ai_report, prescription: data.prescription });
    } catch (e) { console.error(e); }
    setLoadingDocs(false);
  };

  // -- Render message content ------------------------------------------------
  const renderMsg = (msg) => {
    if (msg.message_type === 'voice') {
      const src = msg.local_url || (msg.audio_base64 ? `data:audio/webm;base64,${msg.audio_base64}` : null);
      return src
        ? <audio controls src={src} style={{ maxWidth: 200, outline: 'none', display: 'block' }} />
        : <span style={{ fontSize: 12, opacity: 0.8 }}>Voice note (processing…)</span>;
    }
    if (msg.message_type === 'image') {
      const src = msg.local_url || (msg.audio_base64 ? `data:${msg.file_mime || 'image/jpeg'};base64,${msg.audio_base64}` : null);
      return src
        ? <div><img src={src} alt={msg.file_name || 'Image'} style={{ maxWidth: 200, borderRadius: 8, display: 'block' }} />
            {msg.file_name && <span style={{ fontSize: 11, opacity: 0.7, marginTop: 3, display: 'block' }}>{msg.file_name}</span>}
          </div>
        : <span style={{ fontSize: 12 }}>{msg.file_name || 'Image'}</span>;
    }
    if (msg.message_type === 'file') {
      const href = msg.local_url || (msg.audio_base64 ? `data:${msg.file_mime || 'application/octet-stream'};base64,${msg.audio_base64}` : null);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flexShrink: 0, color: 'inherit', opacity: 0.8 }}>{Ic.fileDoc}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{msg.file_name || 'File'}</div>
            {href && (
              <a href={href} download={msg.file_name} style={{ fontSize: 11, color: 'inherit', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {Ic.download} Download
              </a>
            )}
          </div>
        </div>
      );
    }
    return <span>{msg.content}</span>;
  };

  // -- Status helpers --------------------------------------------------------
  const statusLabel = sessionStatus === 'open'  ? 'Live'
    : sessionStatus === 'closed'                ? 'Closed'
    : isOnline                                  ? 'Available'
    : 'Offline';
  const statusColor = sessionStatus === 'open'  ? '#22c55e'
    : sessionStatus === 'closed'                ? '#ef4444'
    : isOnline                                  ? '#22c55e'
    : '#94a3b8';

  const hoursRows  = formatHoursDisplay(consultHours);
  const todayLabel = todayHoursLabel(consultHours);

  // Report field helpers
  const aiR  = patientDocs?.aiReport;
  const rxR  = patientDocs?.prescription;
  const getDiagnosis = d => d?.analysis?.prediction || d?.predicted_disease || d?.diagnosis || '—';
  const getConf      = d => {
    const c = d?.analysis?.confidence ?? d?.confidence;
    if (c == null) return '—';
    return `${(parseFloat(c) * (parseFloat(c) > 1 ? 1 : 100)).toFixed(1)}%`;
  };
  const getSeverity  = d => d?.analysis?.severity || d?.severity || '—';
  const getDate      = d => d?.created_at ? new Date(d.created_at).toLocaleDateString() : '—';

  // -- Render ----------------------------------------------------------------
  return (
    <>
    <div className={`cp-panel${expanded ? '' : ' cp-collapsed'}${maximized ? ' cp-maximized' : ''}`}>

      {/* Header */}
      <div className="cp-header" onClick={() => setExpanded(e => !e)}>
        <div className="cp-header-left">
          <span className="cp-avatar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <div>
            <p className="cp-doctor-name">{doctorName || 'Your Doctor'}</p>
            <span className="cp-status-dot" style={{ background: statusColor }} />
            <span className="cp-status-label">{statusLabel}</span>
          </div>
        </div>
        <div className="cp-header-right" onClick={e => e.stopPropagation()}>
          {connecting && <span className="cp-connecting" title="Connecting…">●</span>}
          <button className="cp-header-btn" title="AI Diagnostic Report"
            onClick={() => openReport('ai')}>{Ic.report}</button>
          <button className="cp-header-btn" title="Prescription"
            onClick={() => openReport('rx')}>{Ic.pill}</button>
          <button className="cp-header-btn" title="Consultation Hours"
            onClick={() => setShowHours(v => !v)}>{Ic.clock}</button>
          <button className="cp-header-btn" title={maximized ? 'Restore' : 'Expand'}
            onClick={() => setMaximized(v => !v)}>
            {maximized ? Ic.compress : Ic.expand}
          </button>
          <button className="cp-header-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? Ic.chevDown : Ic.chevUp}
          </button>
          <button className="cp-header-btn" onClick={onClose}>{Ic.close}</button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Hours panel */}
          {showHours && hoursRows.length > 0 && (
            <div className="cp-hours-panel">
              <p className="cp-hours-title">Consultation Hours</p>
              {hoursRows.map(h => (
                <div key={h.day} className="cp-hours-row">
                  <span className="cp-hours-day">{h.day}</span>
                  <span className={`cp-hours-time${h.off ? ' cp-hours-off' : ''}`}>{h.time}</span>
                </div>
              ))}
            </div>
          )}

          {/* Availability banner */}
          <div className="cp-avail-banner" style={{
            background: sessionStatus === 'open' ? '#dcfce7' : isOnline ? '#dcfce7' : '#fef3c7',
            borderLeft: `3px solid ${sessionStatus === 'open' || isOnline ? '#22c55e' : '#f59e0b'}`,
          }}>
            {sessionStatus === 'open'
              ? 'Live consultation active — the doctor is connected'
              : isOnline
              ? `Consultation hours active — you may send messages`
              : `Consultation hours: ${todayLabel || 'Not set'}. Messages are saved for doctor review.`
            }
          </div>

          {/* Messages */}
          <div className="cp-messages">
            {messages.length === 0 && (
              <div className="cp-empty">Send a message to begin your consultation.</div>
            )}
            {messages.map((msg, i) => {
              const isMe     = msg.sender_type === 'patient';
              const isSystem = msg.sender_type === 'system';
              return (
                <div key={msg.id || i} className={`cp-bubble-wrap${isMe ? ' cp-me' : isSystem ? '' : ' cp-them'}`}>
                  <div className={`cp-bubble${isSystem ? ' cp-bubble-system' : isMe ? ' cp-bubble-me' : ' cp-bubble-them'}`}>
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
          {sessionStatus === 'closed' ? (
            <div className="cp-locked-bar">
              <span style={{ marginRight: 6 }}>{Ic.lock}</span>Session closed by doctor
            </div>
          ) : canChat ? (
            <div className="cp-input-bar">
              <input type="file" ref={fileInputRef} accept="image/*,application/pdf,.doc,.docx"
                style={{ display: 'none' }} onChange={handleFileSelect} />
              <button className="cp-icon-btn" title="Attach file"
                onClick={() => fileInputRef.current?.click()}>{Ic.attach}</button>
              <input
                className="cp-input"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
                placeholder="Type a message…"
              />
              <button
                className={`cp-mic-btn${recording ? ' cp-recording' : ''}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={e => { e.preventDefault(); startRecording(); }}
                onTouchEnd={stopRecording}
                title={recording ? 'Release to send' : 'Hold to record voice note'}
              >{Ic.mic}</button>
              <button className="cp-send-btn" onClick={() => sendText()}>{Ic.send}</button>
            </div>
          ) : (
            <div style={{ padding: '10px' }}>
              <div className="cp-locked-bar" style={{ marginBottom: 8, borderRadius: 8 }}>
                <span style={{ marginRight: 6 }}>{Ic.lock}</span>Messaging is available during consultation hours only
              </div>
              {!starterSent && (
                <button onClick={sendStarter} className="cp-starter-btn">
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>
                    Send Consultation Request
                  </span>
                  <span style={{ display: 'block', fontWeight: 400, opacity: 0.8, marginTop: 2, fontSize: 11.5 }}>
                    "I would like to consult regarding my recent X-ray results…"
                  </span>
                </button>
              )}
              {starterSent && (
                <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  Message sent — the doctor will respond during consultation hours.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>

    {/* Report modals — full-page styled like PDF */}
    {showReport && (
      <div
        onClick={() => setShowReport(null)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,40,55,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 12, width: '100%', maxWidth: 960,
            maxHeight: '92vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
            fontFamily: '"Times New Roman", Georgia, serif'
          }}
        >
          {/* Header bar */}
          <div style={{
            background: 'linear-gradient(135deg,#1a3a4a,#38B2AC)',
            padding: '16px 24px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            borderRadius: '12px 12px 0 0', position: 'sticky', top: 0, zIndex: 2
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
              {showReport === 'ai' ? 'AI Medical Report' : 'Doctor Prescription'}
            </span>
            <button
              onClick={() => setShowReport(null)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: '50%', width: 32, height: 32,
                color: '#fff', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >×</button>
          </div>

          {loadingDocs ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>Loading report…</p>
          ) : showReport === 'ai' ? (
            aiR ? (() => {
              const pred   = aiR.analysis?.prediction || aiR.diagnosis || aiR.predicted_disease || '';
              const conf   = parseFloat(aiR.analysis?.confidence ?? aiR.confidence ?? 0);
              const sev    = aiR.analysis?.severity || aiR.severity || '';
              const expl   = aiR.analysis?.heatmapExplanation || aiR.medical_context || '';
              const pName  = aiR.patient?.name  || aiR.patient_name  || '—';
              const pAge   = aiR.patient?.age   || aiR.patient_age   || '—';
              const pGend  = aiR.patient?.gender|| aiR.patient_gender|| '—';
              const pSmoke = aiR.patient?.smokingStatus || aiR.smoking_status || '—';
              const pCough = aiR.patient?.hasCough || '—';
              const symp   = aiR.medicalInfo?.symptoms || aiR.symptoms || '';
              const hist   = aiR.medicalInfo?.medicalHistory || aiR.medical_history || '';
              const rDate  = aiR.createdAt || aiR.created_at || aiR.timestamp;
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
                      <div><strong>Report ID:</strong> {aiR.reportId || aiR.report_id || 'N/A'}</div>
                      <div><strong>Date:</strong> {rDate ? new Date(rDate).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</div>
                      <div><strong>Patient ID:</strong> {(aiR.patient?.email || patientEmail)?.split('@')[0].toUpperCase() || 'N/A'}</div>
                    </div>
                  </div>
                  {/* Patient Info */}
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
                      {symp && (<div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Symptoms</div>
                        <div style={{ fontSize: 13, color: '#1a202c' }}>{symp}</div>
                      </div>)}
                      {hist && (<div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#718096', textTransform: 'uppercase', marginBottom: 4 }}>Medical History</div>
                        <div style={{ fontSize: 13, color: '#1a202c' }}>{hist}</div>
                      </div>)}
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
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase' }}>Predicted Condition</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: isNorm ? '#2e7d32' : '#c62828', textTransform: 'uppercase' }}>{pred || 'Unknown'}</div>
                      </div>
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase' }}>Probability Score</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1565c0' }}>{conf > 0 ? `${(conf * 100).toFixed(1)}%` : '—'}</div>
                      </div>
                      <div style={{ border: '2px solid #38B2AC', borderRadius: 8, padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#718096', marginBottom: 6, textTransform: 'uppercase' }}>Severity Level</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: sev === 'Severe' ? '#c62828' : sev === 'Moderate' ? '#e65100' : '#2e7d32', textTransform: 'uppercase' }}>
                          {sev || (conf > 0.8 ? 'Severe' : conf > 0.5 ? 'Moderate' : conf > 0 ? 'Mild' : '—')}
                        </div>
                      </div>
                    </div>
                    {expl && (<div style={{ background: '#F5F1E8', border: '1px solid #E6E0D6', borderRadius: 8, padding: '12px 16px', fontSize: 13, lineHeight: 1.7, color: '#6b5d47' }}>
                      <strong style={{ color: '#6c5ce7' }}>AI Analysis:</strong> {expl}
                    </div>)}
                  </div>
                  {/* Clinical Impression */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 10 }}>Clinical Impression</div>
                    <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', fontSize: 14, lineHeight: 1.9, color: '#2d3748', textAlign: 'justify' }}>
                      {isNorm
                        ? 'The radiographic examination reveals lung fields within normal limits. No significant consolidation, infiltrates, or pleural effusion identified. Cardiothoracic ratio appears normal. AI analysis confirms absence of pathological findings with high confidence. Clinical correlation recommended.'
                        : `The AI analysis indicates radiological patterns consistent with ${pred} showing a diagnostic probability of ${(conf * 100).toFixed(1)}%. Observed opacity regions suggest possible inflammatory infiltration within the lung fields. Severity classification: ${sev || 'Moderate'}. Correlation with clinical symptoms, laboratory investigations, and professional radiological interpretation is recommended.`
                      }
                    </div>
                  </div>
                  {/* Images */}
                  {(aiR.images?.original || aiR.images?.heatmap) && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #38B2AC', paddingBottom: 5, marginBottom: 12 }}>Chest X-Ray Images</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {aiR.images?.original && (<div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#718096', marginBottom: 6 }}>Original X-Ray</div>
                          <img src={aiR.images.original} alt="X-Ray" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </div>)}
                        {aiR.images?.heatmap && (<div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#718096', marginBottom: 6 }}>AI Heatmap Analysis</div>
                          <img src={aiR.images.heatmap} alt="Heatmap" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
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
            })() : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No AI report found for your account.</p>
          ) : (
            rxR ? (
              <div style={{ padding: '24px 30px' }}>
                {/* Doctor header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2c5f6f', paddingBottom: 14, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#2c5f6f' }}>Dr. {rxR.doctor_name || '—'}</div>
                    <div style={{ fontSize: 13, color: '#4a5568', marginTop: 2 }}>{rxR.doctor_qualifications || 'MBBS'}</div>
                    <div style={{ fontSize: 13, color: '#718096', fontStyle: 'italic' }}>Specialist in {rxR.doctor_specialization || 'General Medicine'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#4a5568' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#38B2AC' }}>+ MEDIVISION</div>
                    <div style={{ marginTop: 4 }}>PMDC: {rxR.doctor_license || '—'}</div>
                    <div>{rxR.created_at ? new Date(rxR.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : '—'}</div>
                  </div>
                </div>
                {/* Patient row */}
                <div style={{ display: 'flex', gap: 30, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
                  <span><strong>Patient:</strong> {rxR.patient_name || patientEmail}</span>
                  {rxR.patient_age && <span><strong>Age:</strong> {rxR.patient_age}</span>}
                </div>
                {/* AI Diagnosis Verification */}
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #38B2AC', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#718096', marginBottom: 4, letterSpacing: 0.5 }}>AI Diagnosis Verification</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                    {rxR.diagnosis_confirmation === 'confirm' ? '✓ Confirmed — AI diagnosis verified' : rxR.diagnosis_confirmation === 'modify' ? 'Modified — See doctor\'s diagnosis below' : 'Inconclusive — Further tests recommended'}
                  </div>
                </div>
                {/* Diagnosis */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Diagnosis</div>
                  <div style={{ fontSize: 15, color: '#1a202c', lineHeight: 1.8 }}>{rxR.doctor_diagnosis || '—'}</div>
                </div>
                {rxR.medications && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Medications</div>
                    {rxR.medications.split('\n').map((m, i) => m.trim() && (<div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '5px 0', borderBottom: '1px dashed #e2e8f0' }}>• {m}</div>))}
                  </div>
                )}
                {rxR.diet_recommendations && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Dietary Recommendations</div>
                    {rxR.diet_recommendations.split('\n').map((d, i) => d.trim() && (<div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '3px 0' }}>• {d}</div>))}
                  </div>
                )}
                {rxR.precautions && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Precautions</div>
                    {rxR.precautions.split('\n').map((p, i) => p.trim() && (<div key={i} style={{ fontSize: 14, color: '#2d3748', padding: '3px 0' }}>• {p}</div>))}
                  </div>
                )}
                {rxR.hospital_visit_required && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#b91c1c', fontWeight: 600, fontSize: 14 }}>
                    ⚠ Patient is advised to visit a hospital for comprehensive physical examination and further diagnostic tests.
                  </div>
                )}
                {rxR.follow_up && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: 5, marginBottom: 10 }}>Follow-up</div>
                    <div style={{ fontSize: 14, color: '#2d3748' }}>{rxR.follow_up}</div>
                  </div>
                )}
                {/* Signature */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', textAlign: 'right', fontSize: 13, color: '#4a5568' }}>
                  {rxR.doctor_signature && <img src={rxR.doctor_signature} alt="Signature" style={{ height: 60, marginBottom: 6 }} />}
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2c5f6f' }}>Dr. {rxR.doctor_name || '—'}</div>
                  <div>{rxR.doctor_license ? `PMDC: ${rxR.doctor_license}` : ''}{rxR.doctor_specialization ? ` | ${rxR.doctor_specialization}` : ''}</div>
                  <div style={{ fontStyle: 'italic', marginTop: 4 }}>{rxR.created_at ? new Date(rxR.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : ''}</div>
                </div>
              </div>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No prescription found for your account.</p>
          )}
        </div>
      </div>
    )}
    </>
  );
}

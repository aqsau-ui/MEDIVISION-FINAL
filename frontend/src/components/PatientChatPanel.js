import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatModule.css';

const API     = 'http://localhost:5000/api/patient-chat';
const WS_BASE = 'ws://localhost:5000/api/patient-chat/ws';
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

    {/* Report modals */}
    {showReport && (
      <div className="cp-report-overlay" onClick={() => setShowReport(null)}>
        <div className="cp-report-modal" onClick={e => e.stopPropagation()}>
          <div className="cp-report-modal-hdr">
            <span>{showReport === 'ai' ? 'AI Diagnostic Report' : 'Doctor Prescription'}</span>
            <button className="cp-report-close" onClick={() => setShowReport(null)}>{Ic.close}</button>
          </div>
          <div className="cp-report-modal-body">
            {loadingDocs ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Loading report…</p>
            ) : showReport === 'ai' ? (
              aiR ? (
                <div className="cp-report-card">
                  <div className="cp-rr"><strong>Diagnosis</strong><span style={{ color: '#dc2626', fontWeight: 600 }}>{getDiagnosis(aiR)}</span></div>
                  <div className="cp-rr"><strong>Confidence</strong><span>{getConf(aiR)}</span></div>
                  <div className="cp-rr"><strong>Severity</strong><span>{getSeverity(aiR)}</span></div>
                  <div className="cp-rr"><strong>Analysis Date</strong><span>{getDate(aiR)}</span></div>
                  {aiR.recommendations && <div className="cp-rr"><strong>Recommendations</strong><span>{aiR.recommendations}</span></div>}
                  {(aiR.medicalInfo?.symptoms || aiR.symptoms) && (
                    <div className="cp-rr"><strong>Reported Symptoms</strong><span>{aiR.medicalInfo?.symptoms || aiR.symptoms}</span></div>
                  )}
                </div>
              ) : <p style={{ color: '#9ca3af', textAlign: 'center' }}>No AI report found for your account.</p>
            ) : (
              rxR ? (
                <div className="cp-report-card">
                  <div className="cp-rr"><strong>Doctor</strong><span>Dr. {rxR.doctor_name || '—'}</span></div>
                  {rxR.doctor_specialization && <div className="cp-rr"><strong>Specialization</strong><span>{rxR.doctor_specialization}</span></div>}
                  <div className="cp-rr"><strong>Confirmed Diagnosis</strong><span style={{ fontWeight: 600 }}>{rxR.doctor_diagnosis || '—'}</span></div>
                  {rxR.medications && <div className="cp-rr"><strong>Medications</strong><span style={{ whiteSpace: 'pre-wrap' }}>{rxR.medications}</span></div>}
                  {rxR.follow_up && <div className="cp-rr"><strong>Follow-up</strong><span>{rxR.follow_up}</span></div>}
                  {rxR.hospital_visit_required && (
                    <div className="cp-rr-alert">Hospital visit required</div>
                  )}
                  <div className="cp-rr"><strong>Prescribed on</strong><span>{rxR.created_at ? new Date(rxR.created_at).toLocaleDateString() : '—'}</span></div>
                </div>
              ) : <p style={{ color: '#9ca3af', textAlign: 'center' }}>No prescription found for your account.</p>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

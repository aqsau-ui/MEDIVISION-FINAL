import React, { useState, useEffect, useRef, useCallback } from 'react';
import MedicalReport from './MedicalReport';
import DoctorPrescriptionReport from './DoctorPrescriptionReport';
import './ChatModule.css';

const API    = 'http://localhost:5000/api/chat';
const WS_BASE = 'ws://localhost:5000/api/chat/ws';

// ── SVG icons ─────────────────────────────────────────────────────────────
const Ic = {
  inbox: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  expand: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  ),
  compress: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
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
  unlock: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  ),
  report: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  pill: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
      <circle cx="18" cy="18" r="3"/>
      <path d="M22 22l-1.5-1.5"/>
    </svg>
  ),
};

function getBestMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export default function DoctorChatInbox({ doctorId, onClose }) {
  const [sessions,       setSessions]       = useState([]);
  const [activeSessionId,setActiveSessionId]= useState(null);
  const [messages,       setMessages]       = useState([]);
  const [inputText,      setInputText]      = useState('');
  const [recording,      setRecording]      = useState(false);
  const [activeSession,  setActiveSession]  = useState(null);
  const [fullscreen,     setFullscreen]     = useState(false);

  // Context panel
  const [patientReport,  setPatientReport]  = useState(null);
  const [prescription,   setPrescription]   = useState(null);
  const [loadingCtx,     setLoadingCtx]     = useState(false);

  // Full-report modals
  const [showAiModal,    setShowAiModal]    = useState(false);
  const [showRxModal,    setShowRxModal]    = useState(false);

  const wsRef        = useRef(null);
  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const bottomRef    = useRef(null);
  const pingTimer    = useRef(null);
  const fileInputRef = useRef(null);

  const doctorData  = JSON.parse(localStorage.getItem('doctorData') || '{}');
  const doctorProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`doctorProfile_${doctorData.id}`) || '{}'); }
    catch { return {}; }
  })();
  const doctorIdStr = String(doctorId || doctorData.id || '');

  const [availTime,     setAvailTime]     = useState(() => localStorage.getItem(`doctorAvailability_${String(doctorId || doctorData.id || '')}`) || '');
  const [editAvailTime, setEditAvailTime] = useState(() => localStorage.getItem(`doctorAvailability_${String(doctorId || doctorData.id || '')}`) || '');

  // ── Sync availTime when doctorIdStr changes ────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(`doctorAvailability_${doctorIdStr}`) || '';
    setAvailTime(saved);
    setEditAvailTime(saved);
  }, [doctorIdStr]);

  // ── Load session list ───────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!doctorIdStr) return;
    try {
      const res  = await fetch(`${API}/sessions/doctor/${doctorIdStr}`);
      const data = await res.json();
      if (data.success) setSessions(data.sessions || []);
    } catch (e) {
      console.error('DoctorChatInbox: load sessions error', e);
    }
  }, [doctorIdStr]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // ── Load messages + session + patient context when session selected ─────
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
      } catch (e) {
        console.error('DoctorChatInbox: load messages error', e);
      }
    })();
  }, [activeSessionId]);

  // ── Fetch patient's AI report + prescription when session selected ──────
  useEffect(() => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session?.patient_email) return;

    setPatientReport(null);
    setPrescription(null);
    setLoadingCtx(true);

    const email = session.patient_email;
    Promise.all([
      fetch(`http://localhost:5000/api/reports/patient/${encodeURIComponent(email)}/latest?doctor_id=${doctorIdStr}`)
        .then(r => r.json()).catch(() => null),
      fetch(`http://localhost:5000/api/reports/prescriptions/patient/${encodeURIComponent(email)}?doctor_id=${doctorIdStr}`)
        .then(r => r.json()).catch(() => null),
    ]).then(([rptData, rxData]) => {
      if (rptData?.success) setPatientReport(rptData.report);
      if (rxData?.success && rxData.prescriptions?.length > 0) setPrescription(rxData.prescriptions[0]);
    }).finally(() => setLoadingCtx(false));
  }, [activeSessionId]); // eslint-disable-line

  // ── Mark messages read ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    fetch(`${API}/sessions/${activeSessionId}/messages/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reader_type: 'doctor' }),
    }).catch(() => {});
  }, [activeSessionId, messages.length]);

  // ── WebSocket ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) return;
    wsRef.current?.close();
    clearInterval(pingTimer.current);

    const ws = new WebSocket(`${WS_BASE}/${activeSessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'pong') return;
        if (payload.type === 'chat_unlocked') {
          setActiveSession(prev => prev ? { ...prev, status: 'open' }   : prev);
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: 'open' }   : s));
          return;
        }
        if (payload.type === 'chat_locked') {
          setActiveSession(prev => prev ? { ...prev, status: 'closed' } : prev);
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: 'closed' } : s));
          return;
        }
        if (['text', 'voice', 'image', 'file'].includes(payload.type)) {
          setMessages(prev => {
            if (payload.client_id) {
              const idx = prev.findIndex(m => m.id === payload.client_id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...payload, local_url: prev[idx].local_url };
                return updated;
              }
            }
            if (payload.id && prev.some(m => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      } catch (_) {}
    };

    ws.onclose = () => clearInterval(pingTimer.current);

    return () => {
      ws.close();
      clearInterval(pingTimer.current);
    };
  }, [activeSessionId]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Toggle session open/closed ──────────────────────────────────────────
  const toggleSession = async () => {
    if (!activeSession) return;
    const newStatus = activeSession.status === 'open' ? 'closed' : 'open';
    try {
      await fetch(`${API}/sessions/${activeSessionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setActiveSession(prev => ({ ...prev, status: newStatus }));
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: newStatus } : s));
    } catch (e) {
      console.error('toggle session error', e);
    }
  };

  // ── Send text ───────────────────────────────────────────────────────────
  const sendText = () => {
    const text = inputText.trim();
    if (!text || activeSession?.status !== 'open') return;

    const cid = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id:           cid,
      session_id:   activeSessionId,
      sender_type:  'doctor',
      message_type: 'text',
      content:      text,
      sent_at:      new Date().toISOString(),
    }]);
    setInputText('');

    fetch(`${API}/sessions/${activeSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_type:  'doctor',
        sender_id:    doctorIdStr,
        message_type: 'text',
        content:      text,
        client_id:    cid,
      }),
    }).catch(console.error);
  };

  // ── Voice recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    if (activeSession?.status !== 'open') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const mime = getBestMime();
      const mr   = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const actualMime = mr.mimeType || mime || 'audio/webm';
        const blob       = new Blob(audioChunks.current, { type: actualMime });
        if (blob.size === 0) return;

        const cid       = `opt-${Date.now()}`;
        const local_url = URL.createObjectURL(blob);

        setMessages(prev => [...prev, {
          id:           cid,
          sender_type:  'doctor',
          message_type: 'voice',
          sent_at:      new Date().toISOString(),
          local_url,
          file_mime:    actualMime,
        }]);

        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result.split(',')[1];
          fetch(`${API}/sessions/${activeSessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_type:  'doctor',
              sender_id:    doctorIdStr,
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

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || activeSession?.status !== 'open') return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const b64     = dataUrl.split(',')[1];
      const isImage = file.type.startsWith('image/');
      const cid     = `opt-${Date.now()}`;

      setMessages(prev => [...prev, {
        id:           cid,
        sender_type:  'doctor',
        message_type: isImage ? 'image' : 'file',
        file_name:    file.name,
        file_mime:    file.type,
        content:      isImage ? dataUrl : null,
        sent_at:      new Date().toISOString(),
      }]);

      fetch(`${API}/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type:  'doctor',
          sender_id:    doctorIdStr,
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
    const isMe = msg.sender_type === 'doctor';
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
        ? <audio controls src={src} style={{ maxWidth: '220px', display: 'block' }} />
        : <span style={{ fontSize: '12px', color: '#94a3b8' }}>Voice note (processing…)</span>;
    } else if (msg.message_type === 'image' && msg.content) {
      body = <img src={msg.content} alt="attachment" style={{ maxWidth: '180px', borderRadius: '6px', display: 'block' }} />;
    } else if (msg.message_type === 'file') {
      body = (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Ic.attach} {msg.file_name || 'File'}
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

  // ── Helpers ─────────────────────────────────────────────────────────────
  const statusColor = (s) =>
    s === 'open' ? '#22c55e' : s === 'closed' ? '#ef4444' : '#f59e0b';

  const activeSessionData = sessions.find(s => s.id === activeSessionId);
  const patientLabel = activeSessionData
    ? (activeSessionData.patient_name || activeSessionData.patient_email || 'Patient')
    : '';

  // ── Download PDF helper for DoctorPrescriptionReport ───────────────────
  const handleDownloadPDF = async (reportRef) => {
    if (!reportRef?.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');
      const noprint = reportRef.current.querySelector('.no-print');
      if (noprint) noprint.style.display = 'none';
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      if (noprint) noprint.style.display = '';
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = 210, h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      pdf.save(`Prescription_${prescription?.patient_name || 'patient'}.pdf`);
    } catch (e) { console.error('PDF error', e); }
  };

  // ── Build props for DoctorPrescriptionReport ────────────────────────────
  const buildRxProps = () => {
    if (!prescription || !patientReport) return null;
    return {
      prescription,
      patientReport: {
        patient: {
          age:           patientReport.patient?.age || 'N/A',
          dateOfBirth:   null,
          gender:        patientReport.patient?.gender || 'Not specified',
          smokingStatus: patientReport.patient?.smokingStatus || 'Unknown',
          symptoms:      patientReport.medicalInfo?.symptoms || 'Not recorded',
          hasCough:      patientReport.patient?.hasCough || 'No',
          coughDuration: patientReport.patient?.coughDuration || 'N/A',
          coughType:     patientReport.patient?.coughType || 'N/A',
          medicalHistory:patientReport.medicalInfo?.medicalHistory || 'Not recorded',
        },
        analysis: {
          prediction: patientReport.analysis?.prediction || 'N/A',
          confidence: patientReport.analysis?.confidence || 0,
          severity:   patientReport.analysis?.severity || '',
        },
      },
      doctor: {
        fullName:      doctorData.fullName || 'Doctor',
        name:          doctorData.fullName || 'Doctor',
        pmdcNumber:    doctorData.pmdcNumber || '',
        specialization:doctorProfile.specialization || '',
        signature:     doctorProfile.signature || null,
        medicalDegrees:doctorProfile.medicalDegrees || ['MBBS'],
      },
      onDownloadPDF: handleDownloadPDF,
    };
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dci-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`dci-modal${fullscreen ? ' dci-fullscreen' : ''}`}>
        {/* Header */}
        <div className="dci-header">
          <span className="dci-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {Ic.inbox} Patient Consultations
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="dci-icon-btn-hdr"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => setFullscreen(v => !v)}
            >
              {fullscreen ? Ic.compress : Ic.expand}
            </button>
            <button className="dci-close" onClick={onClose}>{Ic.close}</button>
          </div>
        </div>

        <div className="dci-body">
          {/* ── Column 1: Session list ─────────────────────────────── */}
          <div className="dci-col-sessions">
            <p className="dci-col-head">Conversations</p>
            {sessions.length === 0 && <p className="dci-empty">No patient sessions yet.</p>}
            {sessions.map(s => (
              <div
                key={s.id}
                className={`dci-session-item ${activeSessionId === s.id ? 'dci-session-active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <div className="dci-session-avatar">{Ic.user}</div>
                <div className="dci-session-info">
                  <p className="dci-session-email">
                    {s.patient_name || s.patient_email}
                  </p>
                  <span className="dci-session-badge" style={{ background: statusColor(s.status) }}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Column 2: Active chat ──────────────────────────────── */}
          <div className="dci-col-chat">
            {!activeSessionId ? (
              <div className="dci-no-chat">Select a conversation to begin</div>
            ) : (
              <>
                {/* Chat sub-header */}
                <div className="dci-chat-topbar">
                  <span className="dci-chat-patient">{patientLabel}</span>
                  <button
                    className={`dci-toggle-btn ${activeSession?.status === 'open' ? 'dci-toggle-open' : 'dci-toggle-closed'}`}
                    onClick={toggleSession}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {activeSession?.status === 'open'
                      ? <>{Ic.lock}  Close Session</>
                      : <>{Ic.unlock} Open Session</>}
                  </button>
                </div>

                {/* Messages */}
                <div className="dci-messages">
                  {messages.length === 0 && <div className="dci-empty">No messages in this session.</div>}
                  {messages.map(renderMsg)}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                {activeSession?.status === 'open' ? (
                  <div className="cp-input-bar">
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                    <button className="cp-icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()}>
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
                      {activeSession?.status === 'closed'
                        ? 'Session closed — click "Open Session" to resume'
                        : 'Session pending — click "Open Session" to start'}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Column 3: Context sidebar ──────────────────────────── */}
          <div className="dci-col-context">
            <p className="dci-col-head">Context</p>

            {/* Availability */}
            <div className="dci-availability-box">
              <p style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',marginBottom:4}}>AVAILABILITY</p>
              {availTime
                ? <p style={{fontSize:13,color:'#38B2AC',fontWeight:600,margin:0}}>{availTime}</p>
                : <p style={{fontSize:12,color:'#64748b',margin:0}}>Not set</p>}
              <input
                type="text"
                className="dci-input"
                style={{fontSize:12, marginTop:8, padding:'4px 8px', width:'100%', boxSizing:'border-box'}}
                placeholder="e.g. Mon-Fri 9am-5pm"
                value={editAvailTime}
                onChange={e => setEditAvailTime(e.target.value)}
              />
              <button className="dci-ctx-report-btn" style={{marginTop:6}} onClick={() => {
                localStorage.setItem(`doctorAvailability_${doctorIdStr}`, editAvailTime);
                setAvailTime(editAvailTime);
                fetch(`http://localhost:5000/api/doctors/${doctorIdStr}/profile`, {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ availability_time: editAvailTime })
                }).catch(()=>{});
              }}>Save Availability</button>
            </div>

            {activeSession ? (
              <div className="dci-context-card">
                {loadingCtx ? (
                  <p className="dci-empty" style={{ fontSize: 12 }}>Loading records…</p>
                ) : (
                  <>
                    {/* AI Report button */}
                    <button
                      className="dci-ctx-report-btn"
                      disabled={!patientReport}
                      onClick={() => setShowAiModal(true)}
                      title={patientReport ? 'View full AI diagnostic report' : 'No AI report available'}
                    >
                      {Ic.report}
                      <span>AI Diagnostic Report</span>
                    </button>

                    {/* Prescription button */}
                    <button
                      className="dci-ctx-report-btn"
                      disabled={!prescription}
                      onClick={() => setShowRxModal(true)}
                      title={prescription ? 'View prescription' : 'No prescription issued yet'}
                      style={{ marginTop: 8 }}
                    >
                      {Ic.pill}
                      <span>Prescription</span>
                    </button>

                    {!patientReport && !loadingCtx && (
                      <p className="dci-ctx-hint" style={{ marginTop: 10 }}>
                        No reports found for this patient.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="dci-empty">Select a session to see context.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Report full-screen modal ─────────────────────────────────── */}
      {showAiModal && patientReport && (
        <div className="dci-report-overlay" onClick={() => setShowAiModal(false)}>
          <div className="dci-report-modal" onClick={e => e.stopPropagation()}>
            <div className="dci-report-modal-hdr">
              <span>AI Diagnostic Report</span>
              <button className="dci-close" onClick={() => setShowAiModal(false)}>{Ic.close}</button>
            </div>
            <div className="dci-report-modal-body">
              <MedicalReport
                reportData={{
                  date:       patientReport.sentAt || patientReport.createdAt || new Date().toISOString(),
                  patient: {
                    name:          patientReport.patient?.name || '',
                    email:         patientReport.patient?.email || '',
                    age:           patientReport.patient?.age || 0,
                    gender:        patientReport.patient?.gender || 'Not specified',
                    smokingStatus: patientReport.patient?.smokingStatus || 'Unknown',
                    hasCough:      patientReport.patient?.hasCough || 'No',
                    coughDuration: patientReport.patient?.coughDuration || 'N/A',
                    coughType:     patientReport.patient?.coughType || 'N/A',
                  },
                  medicalInfo: {
                    symptoms:       patientReport.medicalInfo?.symptoms || 'None reported',
                    medicalHistory: patientReport.medicalInfo?.medicalHistory || 'None',
                  },
                  analysis: {
                    prediction:         patientReport.analysis?.prediction || 'Unknown',
                    confidence:         patientReport.analysis?.confidence || 0,
                    severity:           patientReport.analysis?.severity || '',
                    heatmapExplanation: patientReport.analysis?.heatmapExplanation || '',
                  },
                  images: {
                    original: patientReport.images?.original || '',
                    heatmap:  patientReport.images?.heatmap || '',
                  },
                }}
                reportId={patientReport.reportId}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Prescription full-screen modal ─────────────────────────────── */}
      {showRxModal && prescription && buildRxProps() && (
        <div className="dci-report-overlay" onClick={() => setShowRxModal(false)}>
          <div className="dci-report-modal" onClick={e => e.stopPropagation()}>
            <div className="dci-report-modal-hdr">
              <span>Prescription</span>
              <button className="dci-close" onClick={() => setShowRxModal(false)}>{Ic.close}</button>
            </div>
            <div className="dci-report-modal-body">
              <DoctorPrescriptionReport {...buildRxProps()} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

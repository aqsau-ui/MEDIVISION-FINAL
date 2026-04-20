import React, { useState, useEffect, useRef } from 'react';
import PatientLayout from '../components/PatientLayout';
import './DrAvatar.css';

// ─── Location helpers ─────────────────────────────────────────────────────────

const CITY_COORDS = {
  islamabad:  { lat: 33.6844, lon: 73.0479 },
  isb:        { lat: 33.6844, lon: 73.0479 },
  rawalpindi: { lat: 33.5651, lon: 73.0169 },
  rwp:        { lat: 33.5651, lon: 73.0169 },
  karachi:    { lat: 24.8607, lon: 67.0011 },
  lahore:     { lat: 31.5204, lon: 74.3587 },
  peshawar:   { lat: 34.0151, lon: 71.5249 },
  quetta:     { lat: 30.1798, lon: 66.9750 },
  multan:     { lat: 30.1575, lon: 71.5249 },
  faisalabad: { lat: 31.4180, lon: 73.0790 },
  hyderabad:  { lat: 25.3960, lon: 68.3578 },
};

const TYPE_LABELS = {
  radiology:  'Radiology & X-Ray Centers',
  hospital:   'Hospitals & Clinics',
  laboratory: 'Diagnostic Laboratories',
  medical:    'Medical Facilities',
};

const detectLocationQuery = (text) => {
  const lower = text.toLowerCase();
  const medicalKw = ['radiol','x-ray','xray','x ray','hospital','diagnostic',' lab ','laboratory','clinic','medical center','medical centre','scan center','scan centre','imaging','mri','ct scan','ultrasound'];
  const locationKw = ['near me','nearby','near by','close by','around me','in my area','find','near','close to','locate','show me','where'];

  const hasMedical = medicalKw.some(k => lower.includes(k));
  if (!hasMedical) return null;

  const cityKey = Object.keys(CITY_COORDS).find(c => lower.includes(c));
  const hasLocationKw = locationKw.some(k => lower.includes(k));
  if (!cityKey && !hasLocationKw) return null;

  let searchType = 'medical';
  if (lower.includes('radiol') || lower.includes('xray') || lower.includes('x-ray') || lower.includes('x ray') || lower.includes('imaging'))
    searchType = 'radiology';
  else if (lower.includes('hospital'))
    searchType = 'hospital';
  else if (lower.includes('lab') || lower.includes('diagnostic'))
    searchType = 'laboratory';

  return { searchType, cityKey: cityKey || null };
};

const getUserCoords = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('NO_GEOLOCATION'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 300000 }
    );
  });

const fetchNearbyPlaces = async (lat, lon, searchType) => {
  // 15 km radius — Pakistan OSM data is sparse so we cast wide
  const r = 15000;

  // Common broad filters (work well even with thin OSM data in Pakistan)
  const broad = `
    node["amenity"~"^(hospital|clinic|doctors|health_post)$"](around:${r},${lat},${lon});
    way["amenity"~"^(hospital|clinic|doctors|health_post)$"](around:${r},${lat},${lon});
    node["healthcare"](around:${r},${lat},${lon});
    way["healthcare"](around:${r},${lat},${lon});
    node["name"~"hospital|clinic|medical|health|shifa|shifakhana|centre|center",i](around:${r},${lat},${lon});
    way["name"~"hospital|clinic|medical|health|shifa|shifakhana|centre|center",i](around:${r},${lat},${lon});
  `;

  // Type-specific extras
  const specific = {
    radiology: `
      node["healthcare"~"radiology|laboratory"](around:${r},${lat},${lon});
      node["name"~"radiol|x.ray|xray|diagnostic|imaging|scan|lab|idc|pims|pmrc",i](around:${r},${lat},${lon});
      way["name"~"radiol|x.ray|xray|diagnostic|imaging|scan|lab|idc|pims|pmrc",i](around:${r},${lat},${lon});
    `,
    hospital: `
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
    `,
    laboratory: `
      node["healthcare"~"laboratory|blood_bank"](around:${r},${lat},${lon});
      node["name"~"lab|diagnostic|patholog|blood|test|idc|cpc",i](around:${r},${lat},${lon});
      way["name"~"lab|diagnostic|patholog|blood|test|idc|cpc",i](around:${r},${lat},${lon});
    `,
  };

  const filters = (specific[searchType] || '') + broad;
  const query = `[out:json][timeout:30];(${filters});out center 15;`;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    if (!res.ok) throw new Error('Overpass error');
    const data = await res.json();
    const seen = new Set();
    return data.elements
      .filter(el => el.tags && el.tags.name && !seen.has(el.tags.name) && seen.add(el.tags.name))
      .map(el => ({
        name: el.tags.name,
        address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
          .filter(Boolean).join(', ') || el.tags['addr:full'] || '',
        phone: el.tags.phone || el.tags['contact:phone'] || '',
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      }))
      .filter(p => p.lat && p.lon)
      .slice(0, 10);
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
};

// ─── Location Result Card (dark glass themed) ─────────────────────────────────

const LocationResultCard = ({ places, center, searchType }) => {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const label = TYPE_LABELS[searchType] || 'Medical Facilities';

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const initMap = () => {
      const L = window.L;
      if (!L || !mapDivRef.current) return;
      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([center.lat, center.lon], 13);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(map);

      const userIcon = L.divIcon({
        html: '<div style="background:#38B2AC;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(56,178,172,0.9)"></div>',
        iconSize: [14,14], iconAnchor: [7,7], className: '',
      });
      L.marker([center.lat, center.lon], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Your Location</b>');

      const bounds = [[center.lat, center.lon]];
      places.forEach((place, i) => {
        if (!place.lat || !place.lon) return;
        bounds.push([place.lat, place.lon]);
        const icon = L.divIcon({
          html: `<div style="background:#e53e3e;color:white;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${i+1}</div>`,
          iconSize: [24,24], iconAnchor: [12,12], className: '',
        });
        L.marker([place.lat, place.lon], { icon })
          .addTo(map)
          .bindPopup(`<b>${place.name}</b>${place.address ? '<br><small>'+place.address+'</small>' : ''}`);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28,28], maxZoom: 14 });
    };

    if (window.L) { initMap(); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []); // eslint-disable-line

  // Coordinates-anchored Google Maps search (opens exactly at user's area)
  const gmapsSearch = `https://www.google.com/maps/search/${encodeURIComponent(label)}/@${center.lat},${center.lon},14z`;
  const mapsLink = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + (p.address ? ' ' + p.address : ''))}`;

  return (
    <div className="dra-loc-card">
      <div className="dra-loc-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span className="dra-loc-label">{label}</span>
        <span className="dra-loc-count">{places.length} found</span>
      </div>
      <div ref={mapDivRef} className="dra-loc-map" />
      {places.length === 0 ? (
        <div className="dra-loc-empty">
          <p>OpenStreetMap has limited medical data for this area.</p>
          <p className="dra-loc-empty-sub">Use Google Maps to find nearby centers — it will open centered on your location:</p>
          <a href={gmapsSearch} target="_blank" rel="noopener noreferrer" className="dra-gmaps-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Open Google Maps → {label}
          </a>
        </div>
      ) : (
        <div className="dra-loc-list">
          {places.map((place, i) => (
            <div key={i} className="dra-loc-item">
              <div className="dra-loc-num">{i+1}</div>
              <div className="dra-loc-info">
                <h4>{place.name}</h4>
                {place.address && <p>📍 {place.address}</p>}
                {place.phone && <p>📞 {place.phone}</p>}
              </div>
              <a href={mapsLink(place)} target="_blank" rel="noopener noreferrer" className="dra-dir-btn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Go
              </a>
            </div>
          ))}
        </div>
      )}
      <div className="dra-loc-footer">
        <span>© OpenStreetMap contributors</span>
        <a href={gmapsSearch} target="_blank" rel="noopener noreferrer">Open Google Maps</a>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: 'Pneumonia symptoms?', icon: '🫁' },
  { label: 'How is pneumonia treated?', icon: '💊' },
  { label: 'X-ray centers near me', icon: '📍' },
  { label: 'Upload my report', icon: '📋' },
];

const DrAvatar = () => {
  const [messages, setMessages] = useState([{
    id: 1,
    text: "Hello! I'm Dr. Jarvis, your AI medical assistant.\n\nI specialize in Pneumonia — I can help you:\n\n• Understand Pneumonia symptoms, causes & stages\n• Explain your chest X-ray or medical report in simple language\n• Break down AI diagnosis findings\n• Find nearby radiology centers, hospitals, or diagnostic labs\n\n⚠️ I'm an AI assistant, not a licensed physician. Always consult a real doctor for diagnosis and treatment.\n\nHow can I assist you today?",
    sender: 'bot',
    timestamp: new Date(),
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [uploadedReport, setUploadedReport] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const cachedCoordsRef = useRef(null); // cache geolocation for session

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) || !('speechSynthesis' in window)) {
      setVoiceEnabled(false); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (e) => { setInputMessage(e.results[0][0].transcript); setIsListening(false); };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    return () => { recognitionRef.current?.stop(); synthRef.current?.cancel(); };
  }, []);

  const speakText = (text) => {
    if (!voiceEnabled) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[•\n*]/g, ' '));
    u.rate = 0.9; u.pitch = 1.1; u.volume = 1;
    const femaleVoice = synthRef.current.getVoices().find(v =>
      ['female','woman','zira','susan','samantha','karen'].some(n => v.name.toLowerCase().includes(n)));
    if (femaleVoice) u.voice = femaleVoice;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(u);
  };

  const stopSpeaking = () => { synthRef.current.cancel(); setIsSpeaking(false); };

  const startListening = () => {
    if (!recognitionRef.current) { alert('Voice input not supported. Try Chrome or Edge.'); return; }
    if (!isListening) { try { setIsListening(true); recognitionRef.current.start(); } catch { setIsListening(false); } }
  };
  const stopListening = () => { if (recognitionRef.current && isListening) { recognitionRef.current.stop(); setIsListening(false); } };

  // ── Location handler with caching + retry + fallback ──────────────────────
  const handleLocationQuery = async (locationInfo) => {
    try {
      let coords;
      if (locationInfo.cityKey) {
        coords = CITY_COORDS[locationInfo.cityKey];
      } else if (cachedCoordsRef.current) {
        coords = cachedCoordsRef.current;
      } else {
        coords = await getUserCoords();
        cachedCoordsRef.current = coords;
      }

      let places = [];
      try {
        places = await fetchNearbyPlaces(coords.lat, coords.lon, locationInfo.searchType);
      } catch {
        // retry once
        try { places = await fetchNearbyPlaces(coords.lat, coords.lon, locationInfo.searchType); }
        catch { places = []; }
      }

      setMessages(prev => [...prev, {
        id: Date.now(), type: 'location', sender: 'bot', timestamp: new Date(),
        locationData: { places, center: coords, searchType: locationInfo.searchType },
      }]);
    } catch (err) {
      const label = TYPE_LABELS[locationInfo.searchType] || 'Medical Centers';
      const gmaps = `https://www.google.com/maps/search/${encodeURIComponent(label + ' near me')}`;
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'location-fallback', sender: 'bot', timestamp: new Date(),
        fallbackData: { label, gmaps },
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── TB topic guard ─────────────────────────────────────────────────────────
  const TB_REDIRECT = "I'm specialized in Pneumonia only and cannot answer questions about Tuberculosis (TB).\n\nFor TB-related concerns, please visit a pulmonologist or a government TB clinic.\n\nI can help you with:\n• Pneumonia symptoms, causes & stages\n• Understanding your chest X-ray\n• Finding nearby radiology or diagnostic centers\n• Pneumonia treatment & recovery\n\nWhat would you like to know about Pneumonia?";

  const isTBQuery = (t) => /\b(tb|tuberculosis|tubercul)\b/i.test(t);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', timestamp: new Date() }]);
    setInputMessage('');
    setIsTyping(true);

    // TB guard — respond before hitting backend
    if (isTBQuery(text)) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now(), text: TB_REDIRECT, sender: 'bot', timestamp: new Date() }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    const locInfo = detectLocationQuery(text);
    if (locInfo) { await handleLocationQuery(locInfo); return; }

    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const res = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: userData.id || 'anon-' + Date.now(), patientEmail: userData.email || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 400);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), text: `Unable to reach AI service. Please check your connection and try again.`, sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChipClick = (chip) => {
    if (chip.label === 'Upload my report') { fileInputRef.current?.click(); return; }
    setInputMessage(chip.label);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/jpg','image/png','application/pdf'];
    if (!allowed.includes(file.type)) {
      setMessages(prev => [...prev, { id: Date.now(), text: "Please upload a valid medical report (JPG, PNG, or PDF only).", sender: 'bot', timestamp: new Date() }]);
      return;
    }
    setMessages(prev => [...prev, { id: Date.now(), text: `📄 Uploading: ${file.name}...`, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', userData.id || 'anon-' + Date.now());
      fd.append('patient_email', userData.email || '');
      const res = await fetch('http://localhost:5000/api/medical-reports/upload', { method: 'POST', body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Upload failed'); }
      const data = await res.json();
      setUploadedReport({ reportId: data.report_id, fileName: file.name, testType: data.test_type || 'Medical Report', timestamp: new Date() });
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `✅ Report received: ${data.test_type || 'Medical Report'}\n\nI've analyzed your document. You can now ask me:\n• What do the findings mean?\n• Is this result serious?\n• What should I do next?\n• Explain medical terms in the report\n\n⚠️ Always follow up with your physician for clinical decisions.`,
        sender: 'bot', timestamp: new Date(), hasQuestions: true,
      }]);
      setShowQuestions(true);
      if (voiceEnabled) setTimeout(() => speakText("Report received. What would you like to know?"), 400);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), text: `❌ Upload failed: ${err.message}`, sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = async (question) => {
    setMessages(prev => [...prev, { id: Date.now(), text: question, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    setShowQuestions(false);
    try {
      const res = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, reportContext: uploadedReport?.analysis || '' }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 400);
      setTimeout(() => setShowQuestions(true), 800);
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), text: "Unable to process that right now. Please try again.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PatientLayout>
      <div className="dra-page">
        <div className="dra-layout">

          {/* ── Doctor Avatar Panel ─────────────────────────── */}
          <aside className="dra-avatar-panel">
            <div className="dra-avatar-ring">
              <div className={`dra-avatar-wrap ${isSpeaking ? 'dra-speaking' : ''} ${isListening ? 'dra-listening' : ''}`}>
                <img src="/images/doctoravatar.png" alt="Dr. Jarvis" className="dra-avatar-img" />
              </div>
              {(isSpeaking || isListening) && <div className="dra-avatar-pulse" />}
            </div>

            <div className="dra-doc-meta">
              <h2 className="dra-doc-name">Dr. Jarvis</h2>
              <p className="dra-doc-title">AI Medical Assistant</p>
              <span className="dra-status-badge">
                <span className="dra-status-dot" />
                Online
              </span>
            </div>

            <div className="dra-divider" />

            <div className="dra-capabilities">
              <p className="dra-cap-heading">Specializations</p>
              {[
                ['🫁','Pneumonia Analysis'],
                ['📋','Report Interpretation'],
                ['📍','Find Medical Centers'],
                ['💊','Treatment Guidance'],
                ['🔬','Symptom Assessment'],
              ].map(([icon, text]) => (
                <div key={text} className="dra-cap-item">
                  <span className="dra-cap-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="dra-divider" />

            <div className="dra-quick-chips">
              <p className="dra-cap-heading">Quick Ask</p>
              {QUICK_CHIPS.map(chip => (
                <button key={chip.label} className="dra-chip" onClick={() => handleChipClick(chip)}>
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>

            {isListening && <div className="dra-status-bar dra-listening-bar">🎤 Listening…</div>}
            {isSpeaking && <div className="dra-status-bar dra-speaking-bar">🔊 Speaking…</div>}
          </aside>

          {/* ── Chat Panel ──────────────────────────────────── */}
          <div className="dra-chat-panel">
            <div className="dra-chat-header">
              <div className="dra-chat-header-left">
                <div className="dra-chat-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h3>Medical AI Chat</h3>
                  <span>Pneumonia Specialist · Available 24/7</span>
                </div>
              </div>
              <div className="dra-chat-header-actions">
                <button
                  className={`dra-hdr-btn ${isListening ? 'active' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.25"/><rect x="9" y="9" width="6" height="6"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  }
                </button>
                <button
                  className={`dra-hdr-btn ${voiceEnabled ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => { if (isSpeaking) stopSpeaking(); setVoiceEnabled(v => !v); }}
                  title={voiceEnabled ? 'Voice output on' : 'Voice output off'}
                >
                  {voiceEnabled
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="dra-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`dra-msg ${msg.sender === 'bot' ? 'dra-msg-bot' : 'dra-msg-user'}`}>
                  {msg.sender === 'bot' && (
                    <div className="dra-msg-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    </div>
                  )}
                  <div className="dra-msg-body">
                    {msg.type === 'location' ? (
                      <LocationResultCard places={msg.locationData.places} center={msg.locationData.center} searchType={msg.locationData.searchType} />
                    ) : msg.type === 'location-fallback' ? (
                      <div className="dra-bubble">
                        <p>📍 I couldn't access your location automatically.</p>
                        <p>Search directly on Google Maps for <strong>{msg.fallbackData.label}</strong>:</p>
                        <a href={msg.fallbackData.gmaps} target="_blank" rel="noopener noreferrer" className="dra-fallback-link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                          Open Google Maps Search
                        </a>
                        <p className="dra-tip">💡 Tip: Try typing a city name, e.g. <em>"radiology centres in Islamabad"</em></p>
                      </div>
                    ) : (
                      <div className="dra-bubble">
                        <p>{msg.text}</p>
                      </div>
                    )}
                    <span className="dra-msg-time">
                      {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="dra-msg dra-msg-bot">
                  <div className="dra-msg-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </div>
                  <div className="dra-msg-body">
                    <div className="dra-bubble dra-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              {showQuestions && uploadedReport && (
                <div className="dra-quick-q">
                  <p>Quick questions about your report:</p>
                  <div className="dra-quick-q-grid">
                    {["What do the findings mean?","Is this result serious?","What should I do next?","Explain the medical terms","What are the treatment options?","What should I ask my doctor?"].map(q => (
                      <button key={q} className="dra-q-btn" onClick={() => handleQuestionClick(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="dra-input-area">
              <p className="dra-input-hint">Ask about Pneumonia, upload a report, or find nearby medical centers</p>
              <form className="dra-input-form" onSubmit={handleSendMessage}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
                <button type="button" className="dra-icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach report">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <input
                  type="text"
                  className="dra-text-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about Pneumonia symptoms, treatment, or 'radiology near me'…"
                />
                <button type="submit" className="dra-send-btn" disabled={!inputMessage.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </PatientLayout>
  );
};

export default DrAvatar;

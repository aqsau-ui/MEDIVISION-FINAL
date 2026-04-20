import React, { useState, useEffect, useRef } from 'react';
import PatientLayout from '../components/PatientLayout';
import './DrAvatar.css';

// ─── Location helpers ────────────────────────────────────────────────────────

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

const detectLocationQuery = (text) => {
  const lower = text.toLowerCase();
  const medicalKw = ['radiol', 'x-ray', 'xray', 'x ray', 'hospital', 'diagnostic', ' lab ', 'laboratory', 'clinic', 'medical center', 'medical centre', 'scan center', 'scan centre', 'imaging center', 'imaging centre', 'mri', 'ct scan', 'ultrasound'];
  const locationKw = ['near me', 'nearby', 'near by', 'close by', 'around me', 'in my area', 'find', 'near', 'close to', 'locate', 'show me', 'where'];

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
      { timeout: 10000, maximumAge: 60000 }
    );
  });

const fetchNearbyPlaces = async (lat, lon, searchType) => {
  const r = 6000;
  let filters;
  if (searchType === 'radiology') {
    filters = `
      node["healthcare"="radiology"](around:${r},${lat},${lon});
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
      node["healthcare"="laboratory"](around:${r},${lat},${lon});
      node["name"~"radiol|x.ray|diagnostic|imaging|scan",i](around:${r},${lat},${lon});
    `;
  } else if (searchType === 'hospital') {
    filters = `
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
      node["amenity"="clinic"](around:${r},${lat},${lon});
    `;
  } else if (searchType === 'laboratory') {
    filters = `
      node["healthcare"="laboratory"](around:${r},${lat},${lon});
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
      node["name"~"lab|diagnostic|patholog",i](around:${r},${lat},${lon});
    `;
  } else {
    filters = `
      node["amenity"="hospital"](around:${r},${lat},${lon});
      way["amenity"="hospital"](around:${r},${lat},${lon});
      node["amenity"="clinic"](around:${r},${lat},${lon});
      node["healthcare"](around:${r},${lat},${lon});
    `;
  }

  const query = `[out:json][timeout:25];(${filters});out center 10;`;
  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error('Overpass API error');
  const data = await res.json();

  const seen = new Set();
  return data.elements
    .filter(el => el.tags && el.tags.name && !seen.has(el.tags.name) && seen.add(el.tags.name))
    .map(el => ({
      name: el.tags.name,
      address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
        .filter(Boolean).join(', ') || el.tags['addr:full'] || '',
      phone: el.tags.phone || el.tags['contact:phone'] || '',
      website: el.tags.website || el.tags['contact:website'] || '',
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
    }))
    .filter(p => p.lat && p.lon)
    .slice(0, 8);
};

// ─── Leaflet map card ─────────────────────────────────────────────────────────

const LocationResultCard = ({ places, center, searchType }) => {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);

  const typeLabel = {
    radiology:  'Radiology & X-Ray Centers',
    hospital:   'Hospitals & Clinics',
    laboratory: 'Diagnostic Labs',
    medical:    'Medical Facilities',
  }[searchType] || 'Medical Facilities';

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const initMap = () => {
      const L = window.L;
      if (!L || !mapDivRef.current) return;

      const map = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([center.lat, center.lon], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // User location dot
      const userIcon = L.divIcon({
        html: '<div style="background:#38B2AC;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(56,178,172,0.8)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });
      L.marker([center.lat, center.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>📍 Your Location</b>');

      // Place markers
      const bounds = [[center.lat, center.lon]];
      places.forEach((place, i) => {
        if (!place.lat || !place.lon) return;
        bounds.push([place.lat, place.lon]);
        const placeIcon = L.divIcon({
          html: `<div style="background:#e53e3e;color:white;width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold">${i + 1}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: '',
        });
        L.marker([place.lat, place.lon], { icon: placeIcon })
          .addTo(map)
          .bindPopup(`<b>${place.name}</b>${place.address ? '<br><small>' + place.address + '</small>' : ''}`);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    };

    const loadLeaflet = () => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (window.L) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLEo=';
        script.crossOrigin = '';
        script.onload = initMap;
        document.head.appendChild(script);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mapsLink = (place) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + (place.address ? ' ' + place.address : ''))}`;

  const googleMapsSearch = `https://www.google.com/maps/search/${encodeURIComponent(typeLabel + ' near ' + center.lat + ',' + center.lon)}`;

  return (
    <div className="location-result-card">
      <div className="location-result-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span className="location-label">{typeLabel} near you</span>
        <span className="location-count">{places.length} found</span>
      </div>

      <div ref={mapDivRef} className="location-map" />

      {places.length === 0 ? (
        <div className="location-no-results">
          <p>No facilities found in OpenStreetMap data for this area.</p>
          <a href={googleMapsSearch} target="_blank" rel="noopener noreferrer" className="loc-gmaps-btn">
            Search on Google Maps →
          </a>
        </div>
      ) : (
        <div className="location-places-list">
          {places.map((place, i) => (
            <div key={i} className="location-place-item">
              <div className="place-num">{i + 1}</div>
              <div className="place-info">
                <h4 className="place-name">{place.name}</h4>
                {place.address && <p className="place-address">📍 {place.address}</p>}
                {place.phone && <p className="place-phone">📞 {place.phone}</p>}
              </div>
              <a
                href={mapsLink(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="place-directions-btn"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
                Directions
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="location-footer">
        <span>© OpenStreetMap contributors</span>
        <a href={googleMapsSearch} target="_blank" rel="noopener noreferrer">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DrAvatar = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm Dr. Jarvis, your AI health assistant.\n\nI can help you with:\n\n• Understanding TB and Pneumonia\n• Explaining your X-ray or medical reports in simple words\n• Answering questions about symptoms and treatment\n• Breaking down AI findings from your chest X-rays\n• Finding nearby radiology centers, hospitals, or diagnostic labs\n\nImportant Reminder: I'm an AI assistant, not a real doctor. For any health concerns, always visit a real doctor or hospital for proper care.\n\nWhat would you like to know today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceEnabled(false);
      return;
    }
    if (!('speechSynthesis' in window)) {
      setVoiceEnabled(false);
      return;
    }
    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.addEventListener('voiceschanged', () => {});
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      setInputMessage(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const speakText = (text) => {
    if (!voiceEnabled) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    const femaleVoice = synthRef.current.getVoices().find(v =>
      ['female','woman','zira','susan','samantha','karen'].some(n => v.name.toLowerCase().includes(n))
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => { synthRef.current.cancel(); setIsSpeaking(false); };

  const startListening = () => {
    if (!recognitionRef.current) { alert('Voice input not supported. Try Chrome or Edge.'); return; }
    if (!isListening) {
      try { setIsListening(true); recognitionRef.current.start(); }
      catch { setIsListening(false); }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) { recognitionRef.current.stop(); setIsListening(false); }
  };

  // ── Location query handler ──────────────────────────────────────────────────
  const handleLocationQuery = async (locationInfo) => {
    try {
      let coords;
      if (locationInfo.cityKey) {
        coords = CITY_COORDS[locationInfo.cityKey];
      } else {
        coords = await getUserCoords();
      }

      const places = await fetchNearbyPlaces(coords.lat, coords.lon, locationInfo.searchType);

      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'location',
        sender: 'bot',
        timestamp: new Date(),
        locationData: { places, center: coords, searchType: locationInfo.searchType },
      }]);
    } catch (err) {
      let msg = "I couldn't retrieve nearby facilities. ";
      if (err.code === 1)
        msg += "Location access was denied. Please allow location access or specify a city (e.g. 'radiology centres in Islamabad').";
      else if (err.message === 'NO_GEOLOCATION')
        msg += "Your browser doesn't support location services. Try specifying a city name.";
      else
        msg += "Please try again or specify a city (e.g. 'hospitals in Karachi').";

      setMessages(prev => [...prev, { id: Date.now(), text: msg, sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Main send handler ───────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user', timestamp: new Date() }]);
    setInputMessage('');
    setIsTyping(true);

    // Intercept location queries
    const locationInfo = detectLocationQuery(userText);
    if (locationInfo) {
      await handleLocationQuery(locationInfo);
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const sessionId = userData.id || 'anonymous-' + Date.now();
      const patientEmail = userData.email || null;

      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId, patientEmail }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 500);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Error: ${error.message}. Please check the console or try refreshing the page.`,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessages(prev => [...prev, {
        id: Date.now(), text: "Please upload a valid medical report (JPG, PNG, or PDF only).",
        sender: 'bot', timestamp: new Date()
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      id: Date.now(), text: `📄 Uploading: ${file.name}...`,
      sender: 'user', timestamp: new Date(), isFile: true
    }]);
    setIsTyping(true);

    try {
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const sessionId = userData.id || 'anonymous-' + Date.now();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);
      formData.append('patient_email', userData.email || '');

      const response = await fetch('http://localhost:5000/api/medical-reports/upload', { method: 'POST', body: formData });
      if (!response.ok) { const d = await response.json(); throw new Error(d.detail || 'Upload failed'); }
      const data = await response.json();

      setUploadedReport({ reportId: data.report_id, fileName: file.name, testType: data.test_type || 'Medical Report', extractedText: data.extracted_text || '', timestamp: new Date() });

      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `✅ I've received and analyzed your ${data.test_type || 'medical report'}!\n\n📋 **What I can help you with:**\n• Explain the report findings in simple language\n• Clarify medical terms\n• Answer questions about the results\n• Provide general health information\n\n💬 **Try asking:**\n• "What does this report mean?"\n• "Is this serious?"\n• "What should I do next?"\n\n⚠️ **Important:** This is for information only. Always consult your doctor for medical advice.\n\nWhat would you like to know?`,
        sender: 'bot', timestamp: new Date(), hasQuestions: true
      }]);
      setShowQuestions(true);
      if (voiceEnabled) setTimeout(() => speakText("I've received and analyzed your medical report. What would you like to know about it?"), 500);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(), text: `❌ Upload failed: ${error.message}. Please ensure the file is clear and readable.`,
        sender: 'bot', timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionClick = async (question) => {
    setMessages(prev => [...prev, { id: Date.now(), text: question, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    setShowQuestions(false);

    try {
      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, reportContext: uploadedReport?.analysis || '' }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 500);
      setTimeout(() => setShowQuestions(true), 1000);
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), text: "I'm having trouble answering right now. Please try again.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PatientLayout>
      <div className="dr-avatar-page-content">
        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-content">
              <h1 className="chat-title">Dr. Jarvis - Medical AI Assistant</h1>
              <p className="chat-subtitle">Your AI Health Assistant • Available 24/7</p>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'bot' ? 'bot-message' : 'user-message'}`}
              >
                {message.type === 'location' ? (
                  <LocationResultCard
                    places={message.locationData.places}
                    center={message.locationData.center}
                    searchType={message.locationData.searchType}
                  />
                ) : (
                  <div className="message-content">
                    <p>{message.text}</p>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="message bot-message">
                <div className="message-content typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {/* Quick Question Options */}
            {showQuestions && uploadedReport && (
              <div className="quick-questions">
                <p className="questions-title">Quick Questions:</p>
                <div className="question-buttons">
                  {[
                    "What does this report mean?",
                    "Explain the AI findings in simple words",
                    "What are these symptoms?",
                    "What should I ask my doctor?",
                    "What treatment options are available?",
                    "Is this serious?"
                  ].map(q => (
                    <button key={q} className="question-btn" onClick={() => handleQuestionClick(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="chat-input-container">
            <div className="chat-input-info">
              <span>Ask about TB/Pneumonia, upload reports, or find nearby radiology centers</span>
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.dcm" />

              <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about your report, symptoms, or 'radiology centres near me'..."
                className="message-input"
              />

              <button type="button" className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={isListening ? stopListening : startListening} title={isListening ? "Stop listening" : "Voice input"}>
                {isListening ? (
                  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.2" /><rect x="9" y="9" width="6" height="6" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                )}
              </button>

              <button
                type="button"
                className={`voice-btn ${voiceEnabled ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={() => { if (isSpeaking) stopSpeaking(); setVoiceEnabled(!voiceEnabled); }}
                title={voiceEnabled ? "Voice output enabled" : "Voice output disabled"}
              >
                {isSpeaking ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                ) : voiceEnabled ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                )}
              </button>

              <button type="submit" className="send-btn" disabled={!inputMessage.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>

          {/* Doctor Avatar Image */}
          <div className="floating-doctor">
            <div className={`doctor-avatar-container ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`}>
              <img src="/images/doctoravatar.png" alt="Dr. Jarvis" />
              {isListening && <div className="listening-indicator">Listening...</div>}
              {isSpeaking && <div className="speaking-indicator">Speaking...</div>}
            </div>
            <div className="avatar-message">
              {isListening ? "Listening..." : isSpeaking ? "Dr. Jarvis is speaking..." : "Type or speak to Dr. Jarvis"}
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default DrAvatar;

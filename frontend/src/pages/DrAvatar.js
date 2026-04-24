import React, { useState, useEffect, useRef } from 'react';
import PatientLayout from '../components/PatientLayout';
import AnimatedDoctorAvatar from './DoctorAvatarSVG';
import './DrAvatar.css';

// ─── Worldwide city coords ─────────────────────────────────────────────────────
const CITY_COORDS = {
  // Pakistan
  islamabad:   { lat: 33.6844, lon: 73.0479 },
  isb:         { lat: 33.6844, lon: 73.0479 },
  rawalpindi:  { lat: 33.5651, lon: 73.0169 },
  rwp:         { lat: 33.5651, lon: 73.0169 },
  karachi:     { lat: 24.8607, lon: 67.0011 },
  lahore:      { lat: 31.5204, lon: 74.3587 },
  peshawar:    { lat: 34.0151, lon: 71.5249 },
  quetta:      { lat: 30.1798, lon: 66.9750 },
  multan:      { lat: 30.1575, lon: 71.5249 },
  faisalabad:  { lat: 31.4180, lon: 73.0790 },
  sialkot:     { lat: 32.4945, lon: 74.5229 },
  gujranwala:  { lat: 32.1877, lon: 74.1945 },
  abbottabad:  { lat: 34.1558, lon: 73.2194 },
  balochistan: { lat: 30.1798, lon: 66.9750 },
  sindh:       { lat: 24.8607, lon: 67.0011 },
  punjab:      { lat: 31.5204, lon: 74.3587 },
  kpk:         { lat: 34.0151, lon: 71.5249 },
  // India
  delhi:       { lat: 28.7041, lon: 77.1025 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  mumbai:      { lat: 19.0760, lon: 72.8777 },
  bangalore:   { lat: 12.9716, lon: 77.5946 },
  bengaluru:   { lat: 12.9716, lon: 77.5946 },
  chennai:     { lat: 13.0827, lon: 80.2707 },
  kolkata:     { lat: 22.5726, lon: 88.3639 },
  pune:        { lat: 18.5204, lon: 73.8567 },
  ahmedabad:   { lat: 23.0225, lon: 72.5714 },
  jaipur:      { lat: 26.9124, lon: 75.7873 },
  // UAE
  dubai:       { lat: 25.2048, lon: 55.2708 },
  'abu dhabi': { lat: 24.4539, lon: 54.3773 },
  sharjah:     { lat: 25.3462, lon: 55.4211 },
  // UK
  london:      { lat: 51.5074, lon: -0.1278 },
  manchester:  { lat: 53.4808, lon: -2.2426 },
  birmingham:  { lat: 52.4862, lon: -1.8904 },
  glasgow:     { lat: 55.8642, lon: -4.2518 },
  edinburgh:   { lat: 55.9533, lon: -3.1883 },
  leeds:       { lat: 53.8008, lon: -1.5491 },
  liverpool:   { lat: 53.4084, lon: -2.9916 },
  // USA
  'new york':  { lat: 40.7128, lon: -74.0060 },
  'los angeles':{ lat: 34.0522, lon: -118.2437 },
  chicago:     { lat: 41.8781, lon: -87.6298 },
  houston:     { lat: 29.7604, lon: -95.3698 },
  phoenix:     { lat: 33.4484, lon: -112.0740 },
  dallas:      { lat: 32.7767, lon: -96.7970 },
  austin:      { lat: 30.2672, lon: -97.7431 },
  boston:      { lat: 42.3601, lon: -71.0589 },
  seattle:     { lat: 47.6062, lon: -122.3321 },
  miami:       { lat: 25.7617, lon: -80.1918 },
  atlanta:     { lat: 33.7490, lon: -84.3880 },
  denver:      { lat: 39.7392, lon: -104.9903 },
  virginia:    { lat: 37.4316, lon: -78.6569 },
  california:  { lat: 36.7783, lon: -119.4179 },
  texas:       { lat: 31.9686, lon: -99.9018 },
  florida:     { lat: 27.6648, lon: -81.5158 },
  // Canada
  toronto:     { lat: 43.6532, lon: -79.3832 },
  vancouver:   { lat: 49.2827, lon: -123.1207 },
  montreal:    { lat: 45.5017, lon: -73.5673 },
  calgary:     { lat: 51.0447, lon: -114.0719 },
  // Australia
  sydney:      { lat: -33.8688, lon: 151.2093 },
  melbourne:   { lat: -37.8136, lon: 144.9631 },
  brisbane:    { lat: -27.4698, lon: 153.0251 },
  perth:       { lat: -31.9505, lon: 115.8605 },
  // Saudi Arabia
  riyadh:      { lat: 24.7136, lon: 46.6753 },
  jeddah:      { lat: 21.5433, lon: 39.1728 },
  mecca:       { lat: 21.3891, lon: 39.8579 },
  medina:      { lat: 24.5247, lon: 39.5692 },
  // Europe
  paris:       { lat: 48.8566, lon: 2.3522 },
  berlin:      { lat: 52.5200, lon: 13.4050 },
  rome:        { lat: 41.9028, lon: 12.4964 },
  madrid:      { lat: 40.4168, lon: -3.7038 },
  amsterdam:   { lat: 52.3676, lon: 4.9041 },
  vienna:      { lat: 48.2082, lon: 16.3738 },
  istanbul:    { lat: 41.0082, lon: 28.9784 },
  moscow:      { lat: 55.7558, lon: 37.6173 },
  // Asia
  tokyo:       { lat: 35.6762, lon: 139.6503 },
  beijing:     { lat: 39.9042, lon: 116.4074 },
  shanghai:    { lat: 31.2304, lon: 121.4737 },
  singapore:   { lat: 1.3521,  lon: 103.8198 },
  bangkok:     { lat: 13.7563, lon: 100.5018 },
  'kuala lumpur':{ lat: 3.1390, lon: 101.6869 },
  jakarta:     { lat: -6.2088, lon: 106.8456 },
  manila:      { lat: 14.5995, lon: 120.9842 },
  seoul:       { lat: 37.5665, lon: 126.9780 },
  'hong kong': { lat: 22.3193, lon: 114.1694 },
  dhaka:       { lat: 23.8103, lon: 90.4125 },
  colombo:     { lat: 6.9271,  lon: 79.8612 },
  tehran:      { lat: 35.6892, lon: 51.3890 },
  doha:        { lat: 25.2854, lon: 51.5310 },
  kuwait:      { lat: 29.3759, lon: 47.9774 },
  // Africa
  cairo:       { lat: 30.0444, lon: 31.2357 },
  nairobi:     { lat: -1.2921, lon: 36.8219 },
  lagos:       { lat: 6.5244,  lon: 3.3792 },
  johannesburg:{ lat: -26.2041, lon: 28.0473 },
  'cape town': { lat: -33.9249, lon: 18.4241 },
  casablanca:  { lat: 33.5731, lon: -7.5898 },
  // Americas
  'mexico city':{ lat: 19.4326, lon: -99.1332 },
  'sao paulo': { lat: -23.5505, lon: -46.6333 },
  'buenos aires':{ lat: -34.6037, lon: -58.3816 },
};

const TYPE_LABELS = {
  radiology:  'Radiology & X-Ray Centers',
  hospital:   'Hospitals & Clinics',
  laboratory: 'Diagnostic Laboratories',
  medical:    'Medical Facilities',
};

// ── Detect location query (supports "hospitals in [city]" worldwide) ──────────
const detectLocationQuery = (text) => {
  const lower = text.toLowerCase();
  const medicalKw = [
    'radiol','x-ray','xray','x ray','hospital','diagnostic','lab ','laboratory',
    'clinic','medical center','medical centre','scan center','scan centre','imaging',
    'mri','ct scan','ultrasound','doctor','specialist','physician','dentist','pharmacy',
    'health center','health centre',
  ];
  const nearMeKw = ['near me','nearby','near by','close by','around me','in my area','close to me','near comsats','comsats'];
  const inKw = ['near','in ','at ','around ','find ','show me'];

  const hasMedical = medicalKw.some(k => lower.includes(k));
  if (!hasMedical) return null;

  const cityKey = Object.keys(CITY_COORDS).find(c => lower.includes(c));
  const hasNearMe = nearMeKw.some(k => lower.includes(k));
  const hasIn = inKw.some(k => lower.includes(k));

  if (!cityKey && !hasNearMe && !hasIn) return null;

  // Extract unknown city name after "in/near/at" for geocoding
  let inCity = null;
  if (!cityKey && hasIn) {
    const locMatch = /\b(?:in|near|at|around)\s+([A-Za-z][A-Za-z\s]{1,28}?)(?:\s*$|\s*[?.,!]|\s+(?:and|or|for|but|please))/i.exec(text);
    if (locMatch) inCity = locMatch[1].trim();
  }

  let searchType = 'medical';
  if (lower.includes('radiol') || lower.includes('xray') || lower.includes('x-ray') || lower.includes('x ray') || lower.includes('imaging') || lower.includes('scan'))
    searchType = 'radiology';
  else if (lower.includes('hospital'))
    searchType = 'hospital';
  else if (lower.includes('lab') || lower.includes('diagnostic') || lower.includes('patholog'))
    searchType = 'laboratory';
  else if (lower.includes('clinic') || lower.includes('doctor') || lower.includes('specialist') || lower.includes('physician'))
    searchType = 'hospital';

  return {
    searchType,
    cityKey:      cityKey || null,
    inCity:       !cityKey ? inCity : null,
    showDistance: hasNearMe && !cityKey, // only GPS queries show distance
  };
};


// ── Geocode any place name via Nominatim ──────────────────────────────────────
const geocodePlace = async (place) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1&accept-language=en`;
    const r = await fetch(url, { headers: { 'User-Agent': 'MEDIVISION/1.0' } });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name.split(',')[0].trim(),
    };
  } catch { return null; }
};

// ── Overpass source ───────────────────────────────────────────────────────────
const _overpass = async (lat, lon, searchType) => {
  const r = 20000;
  const filters = `
    node["amenity"](around:${r},${lat},${lon});
    way["amenity"](around:${r},${lat},${lon});
    node["healthcare"](around:${r},${lat},${lon});
    way["healthcare"](around:${r},${lat},${lon});
    node["name"~"hospit|clinic|lab|diagnost|radiol|medical|health|pharma|doctor|centre|center|scan|imag",i](around:${r},${lat},${lon});
    way["name"~"hospit|clinic|lab|diagnost|radiol|medical|health|pharma|doctor|centre|center|scan|imag",i](around:${r},${lat},${lon});
  `;
  const query = `[out:json][timeout:30];(${filters});out center 30;`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 14000);
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: ctrl.signal }
    );
    clearTimeout(tid);
    if (!res.ok) throw new Error('overpass');
    const data = await res.json();
    const medAmenities = new Set(['hospital','clinic','doctors','health_post','dentist','pharmacy','laboratory']);
    const typeRe = {
      radiology:  /radiol|xray|x.ray|x-ray|diagnostic|imaging|scan|lab|ct|mri|ultrasound/i,
      hospital:   /hospit|medical.cent|health.cent|general.hosp/i,
      laboratory: /lab|diagnost|patholog|blood|test.cent/i,
      medical:    /hospit|clinic|medical|health/i,
    }[searchType] || /hospit|clinic|medical|health/i;

    const seen = new Set();
    return data.elements
      .filter(el => {
        if (!el.tags?.name || seen.has(el.tags.name)) return false;
        const a = el.tags.amenity || '', hc = el.tags.healthcare || '';
        const ok = medAmenities.has(a) || hc || typeRe.test(el.tags.name);
        if (ok) seen.add(el.tags.name);
        return ok;
      })
      .map(el => ({
        name: el.tags.name,
        address: [el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(', ') || '',
        phone: el.tags.phone || el.tags['contact:phone'] || '',
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      }))
      .filter(p => p.lat && p.lon)
      .slice(0, 10);
  } catch { clearTimeout(tid); return []; }
};

// ── Nominatim source — uses tight bounding box around given coords ────────────
const _nominatim = async (lat, lon, searchType) => {
  const queries = {
    radiology:  ['radiology center', 'diagnostic imaging', 'x-ray center', 'CT scan center', 'MRI center', 'ultrasound clinic'],
    hospital:   ['hospital', 'general hospital', 'medical center', 'teaching hospital'],
    laboratory: ['diagnostic laboratory', 'pathology lab', 'blood test center', 'medical lab'],
    medical:    ['hospital', 'medical center', 'clinic', 'health center'],
  }[searchType] || ['hospital', 'clinic'];

  // Use a tight 0.12° box (~13 km) so results stay in the actual city
  const delta = 0.12;
  const vb = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
  const seen = new Set();
  const results = [];

  for (const q of queries.slice(0, 3)) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=10&bounded=1&viewbox=${vb}&addressdetails=1&accept-language=en`;
      const r = await fetch(url, { headers: { 'User-Agent': 'MEDIVISION/1.0' } });
      if (!r.ok) continue;
      const data = await r.json();
      data.forEach(item => {
        const name = (item.name || item.display_name.split(',')[0]).trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        results.push({
          name,
          address: item.display_name.split(',').slice(1, 3).join(', ').trim(),
          phone: '',
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        });
      });
    } catch {}
    if (results.length >= 8) break;
  }
  return results.filter(p => p.lat && p.lon).slice(0, 8);
};

// ── Reverse geocode ───────────────────────────────────────────────────────────
const reverseGeocode = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'MEDIVISION/1.0' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const sub  = a.suburb || a.neighbourhood || a.quarter || '';
    const town = a.city || a.town || a.county || a.state_district || '';
    return [sub, town].filter(Boolean).join(', ') || '';
  } catch { return ''; }
};

// ── Haversine ─────────────────────────────────────────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Combined fetch ────────────────────────────────────────────────────────────
const fetchNearbyPlaces = async (lat, lon, searchType) => {
  const [ovR, nomR] = await Promise.allSettled([
    _overpass(lat, lon, searchType),
    _nominatim(lat, lon, searchType),
  ]);
  const ov  = ovR.status  === 'fulfilled' ? ovR.value  : [];
  const nom = nomR.status === 'fulfilled' ? nomR.value : [];
  const seen = new Set();
  return [...ov, ...nom]
    .filter(p => p.lat && p.lon && !seen.has(p.name) && seen.add(p.name))
    .map(p => ({ ...p, distKm: haversineKm(lat, lon, p.lat, p.lon) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 10);
};

// ─── Location Result Card (no Leaflet — pure links) ───────────────────────────
const GMAPS_CATEGORIES = [
  { key: 'hospital',   emoji: '🏥', label: 'Hospitals' },
  { key: 'clinic',     emoji: '🩺', label: 'Clinics' },
  { key: 'radiology',  emoji: '📡', label: 'Radiology / X-Ray' },
  { key: 'diagnostic', emoji: '🔬', label: 'Diagnostic Labs' },
];

const LocationResultCard = ({ places, center, searchType, areaName, showDistance }) => {
  const [mapIdx, setMapIdx] = useState(0); // which place is shown on OSM map
  const label = TYPE_LABELS[searchType] || 'Medical Facilities';
  const locationHint = areaName ? ` near ${areaName}` : '';

  // The pin shown on the OSM map — use the selected place's coords if available
  const mapPin = places[mapIdx] ?? center;
  const mapLat = mapPin.lat ?? center.lat;
  const mapLon = mapPin.lon ?? center.lon;

  // Google Maps category search anchored to the correct city coords
  const cityQuery = areaName ? ` in ${areaName}` : '';
  const gmapsUrl = (term) =>
    `https://www.google.com/maps/search/${encodeURIComponent(term + cityQuery)}/@${center.lat},${center.lon},14z`;

  // Individual place — open Google Maps with the place's exact coordinates pinned
  const mapsLink = (p) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&ll=${p.lat},${p.lon}`;

  // OSM "View larger map" for the selected place
  const osmLarger = `https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLon}#map=16/${mapLat}/${mapLon}`;

  return (
    <div className="dra-loc-card">
      <div className="dra-loc-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span className="dra-loc-label">{label}{locationHint}</span>
        {places.length > 0 && <span className="dra-loc-count">{places.length} found</span>}
      </div>

      {/* OSM Embedded Map — shows selected place pin */}
      <div className="dra-map-wrap">
        <iframe
          key={`${mapLat},${mapLon}`}
          title="Medical facility location"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLon - 0.04},${mapLat - 0.03},${mapLon + 0.04},${mapLat + 0.03}&layer=mapnik&marker=${mapLat},${mapLon}`}
          className="dra-osm-iframe"
          loading="lazy"
          style={{ border: 'none', width: '100%', height: '200px', display: 'block', borderRadius: '8px' }}
        />
        <a href={osmLarger} target="_blank" rel="noopener noreferrer" className="dra-osm-credit">
          View larger map ↗
        </a>
        {places.length > 0 && (
          <div style={{ fontSize: 11, color: '#718096', padding: '4px 6px', textAlign: 'center' }}>
            Showing: <strong>{places[mapIdx]?.name || areaName}</strong>
            {places.length > 1 && (
              <span style={{ marginLeft: 8, color: '#38B2AC', cursor: 'pointer' }}
                onClick={() => setMapIdx(i => (i + 1) % places.length)}>
                Next →
              </span>
            )}
          </div>
        )}
      </div>

      {/* Google Maps quick-search grid — includes city name so results are correct */}
      <div className="dra-gmaps-section">
        <p className="dra-gmaps-section-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Search on Google Maps{areaName ? ` · ${areaName}` : ''}
        </p>
        <div className="dra-gmaps-grid">
          {GMAPS_CATEGORIES.map(cat => (
            <a key={cat.key} href={gmapsUrl(cat.label)} target="_blank" rel="noopener noreferrer" className="dra-gmaps-chip">
              <span>{cat.emoji}</span><span>{cat.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Found places list — clicking a place updates the OSM map pin */}
      {places.length > 0 && (
        <>
          <div className="dra-osm-label">Found nearby — click to see on map:</div>
          <div className="dra-loc-list">
            {places.map((place, i) => (
              <div
                key={i}
                className="dra-loc-item"
                style={{ cursor: 'pointer', background: mapIdx === i ? 'rgba(56,178,172,0.08)' : undefined, borderRadius: 8 }}
                onClick={() => setMapIdx(i)}
              >
                <div className="dra-loc-num" style={{ background: mapIdx === i ? '#38B2AC' : undefined, color: mapIdx === i ? '#fff' : undefined }}>{i + 1}</div>
                <div className="dra-loc-info">
                  <div className="dra-loc-name-row">
                    <h4>{place.name}</h4>
                    {showDistance && place.distKm != null && (
                      <span className={`dra-dist-badge ${place.distKm < 3 ? 'near' : place.distKm < 7 ? 'mid' : 'far'}`}>
                        {place.distKm < 1 ? `${Math.round(place.distKm * 1000)} m` : `${place.distKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  {place.address && <p>📍 {place.address}</p>}
                  {place.phone   && <p>📞 {place.phone}</p>}
                </div>
                <a
                  href={mapsLink(place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dra-dir-btn"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </svg>
                  Go
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="dra-loc-footer">
        <span>© OpenStreetMap · Google Maps</span>
        <a href={gmapsUrl(label)} target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const getPatientName = () => {
  try {
    const d = JSON.parse(localStorage.getItem('patientData') || '{}');
    return d.name || d.firstName || d.fullName?.split(' ')[0] || 'there';
  } catch { return 'there'; }
};

const detectGesture = (text) => {
  if (/upload|reading|check|review|analyz|report|x.ray|file|look at/i.test(text)) return 'read';
  if (/think|wonder|consider|actually|hmm|well |you know/i.test(text))             return 'think';
  if (/great|perfect|good|excellent|congrat|well done|sure|exactly|absolut/i.test(text)) return 'thumbsup';
  if (/explain|means|basically|here.s|understand|important|because|symptom|treatment/i.test(text)) return 'explain';
  return 'idle';
};

const DrAvatar = () => {
  const [messages,       setMessages]       = useState([{
    id: 1, sender: 'bot', timestamp: new Date(),
    text: "Hello! I'm Dr. Jarvis, your pneumonia specialist 👨‍⚕️\n\nI can help you with:\n• Pneumonia symptoms, causes & treatment\n• Analysing your chest X-ray reports\n• Finding hospitals near you\n\nTry saying: **\"show hospitals near COMSATS University\"** to find nearby medical facilities.",
  }]);
  const [inputMessage,   setInputMessage]   = useState('');
  const [isTyping,       setIsTyping]       = useState(false);
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [voiceEnabled,   setVoiceEnabled]   = useState(true);
  const [uploadedReport, setUploadedReport] = useState(null);
  const [showQuestions,  setShowQuestions]  = useState(false);
  const [entranceState,  setEntranceState]  = useState('waiting');
  const [gesture,        setGesture]        = useState('idle');

  const messagesEndRef  = useRef(null);
  const fileInputRef    = useRef(null);
  const recognitionRef  = useRef(null);
  const synthRef        = useRef(window.speechSynthesis);
  const pendingSearchTypeRef   = useRef(null);
  // Stable session ID shared between upload and chat messages
  const sessionIdRef = useRef(
    (() => { try { const u = JSON.parse(localStorage.getItem('patientData') || '{}'); return u.id || ('sess-' + Date.now()); } catch { return 'sess-' + Date.now(); } })()
  );

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Speech recognition ────────────────────────────────────────────────────
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) || !('speechSynthesis' in window)) {
      setVoiceEnabled(false); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous     = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang           = 'en-US';
    recognitionRef.current.onresult = (e) => { setInputMessage(e.results[0][0].transcript); setIsListening(false); };
    recognitionRef.current.onerror  = () => setIsListening(false);
    recognitionRef.current.onend    = () => setIsListening(false);
    return () => { recognitionRef.current?.stop(); synthRef.current?.cancel(); };
  }, []);

  // ── Male voice TTS ────────────────────────────────────────────────────────
  const speakText = (text) => {
    if (!voiceEnabled) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[•\n*]/g, ' '));
    u.pitch  = 0.9;
    u.rate   = 0.95;
    u.volume = 1.0;
    const voices    = synthRef.current.getVoices();
    const maleVoice = voices.find(v => /david|mark|james|daniel|google us english male/i.test(v.name))
      || voices.find(v => v.lang === 'en-US' && !/samantha|zira|susan|karen|victoria|female|woman/i.test(v.name));
    if (maleVoice) u.voice = maleVoice;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(u);
  };

  // ── Entrance animation — cancelled pattern works with React StrictMode ────
  useEffect(() => {
    let cancelled = false;
    const name = getPatientName();

    const t1 = setTimeout(() => { if (!cancelled) setEntranceState('walking'); }, 300);
    const t2 = setTimeout(() => {
      if (cancelled) return;
      setEntranceState('waving');
      setGesture('wave');
      const greeting = `Hey ${name}! I'm Dr. Jarvis — your personal pneumonia buddy. Let's figure this out together!`;
      setMessages([{ id: Date.now(), text: greeting, sender: 'bot', timestamp: new Date() }]);
      setTimeout(() => { if (!cancelled) speakText(greeting); }, 400);
    }, 1200);
    const t3 = setTimeout(() => { if (!cancelled) { setEntranceState('complete'); setGesture('idle'); } }, 4500);

    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line

  const stopSpeaking  = () => { synthRef.current.cancel(); setIsSpeaking(false); };
  const startListening = () => {
    if (!recognitionRef.current) { alert('Voice input not supported in this browser. Try Chrome.'); return; }
    if (!isListening) { try { setIsListening(true); recognitionRef.current.start(); } catch { setIsListening(false); } }
  };
  const stopListening = () => { if (recognitionRef.current && isListening) { recognitionRef.current.stop(); setIsListening(false); } };

  // ── Location handler ──────────────────────────────────────────────────────
  const handleLocationQuery = async (locationInfo) => {
    const searchLabel = (TYPE_LABELS[locationInfo.searchType] || 'medical facilities').toLowerCase();
    setMessages(prev => [...prev, { id: Date.now() - 1, text: `Okay! Let me find some ${searchLabel} for you — hang tight… 🔍`, sender: 'bot', timestamp: new Date() }]);
    setGesture('think');

    try {
      let coords;
      let areaLabel = '';

      if (locationInfo.cityKey) {
        // User explicitly named a city
        coords    = CITY_COORDS[locationInfo.cityKey];
        areaLabel = locationInfo.cityKey.charAt(0).toUpperCase() + locationInfo.cityKey.slice(1);

      } else if (locationInfo.inCity) {
        const normed = locationInfo.inCity.toLowerCase();
        if (CITY_COORDS[normed]) {
          coords    = CITY_COORDS[normed];
          areaLabel = locationInfo.inCity;
        } else {
          const geo = await geocodePlace(locationInfo.inCity);
          if (geo) {
            coords    = { lat: geo.lat, lon: geo.lon };
            areaLabel = geo.displayName || locationInfo.inCity;
          } else {
            throw new Error('GEOCODE_FAILED');
          }
        }

      } else {
        // "near me" — fixed to COMSATS University Islamabad (for FYP presentation)
        coords    = { lat: 33.6461, lon: 72.9861 };
        areaLabel = 'COMSATS University Islamabad';
      }

      const [placesResult, areaResult] = await Promise.allSettled([
        fetchNearbyPlaces(coords.lat, coords.lon, locationInfo.searchType),
        Promise.resolve(areaLabel),
      ]);

      const places    = placesResult.status === 'fulfilled' ? placesResult.value : [];
      const finalArea = areaResult.status   === 'fulfilled' ? areaResult.value  : areaLabel;

      setMessages(prev => [...prev, {
        id: Date.now(), type: 'location', sender: 'bot', timestamp: new Date(),
        locationData: {
          places, center: coords,
          searchType: locationInfo.searchType,
          areaName:   finalArea,
          showDistance: locationInfo.showDistance,
        },
      }]);
    } catch {
      const label    = TYPE_LABELS[locationInfo.searchType] || 'Medical Centers';
      const cityHint = locationInfo.inCity || locationInfo.cityKey || '';
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'location-fallback', sender: 'bot', timestamp: new Date(),
        fallbackData: {
          label,
          gmaps:    `https://www.google.com/maps/search/${encodeURIComponent(label + (cityHint ? ' in ' + cityHint : ' near me'))}`,
          cityName: cityHint,
        },
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── City picker handler ───────────────────────────────────────────────────
  const handleCityPick = (cityKey) => {
    const coords = CITY_COORDS[cityKey];
    if (!coords) return;
    const searchType = pendingSearchTypeRef.current || 'medical';
    pendingSearchTypeRef.current = null;
    const areaLabel = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
    setMessages(prev => [...prev,
      { id: Date.now() - 1, text: `${areaLabel}`, sender: 'user', timestamp: new Date() },
      { id: Date.now() - 0.5, text: `Finding ${(TYPE_LABELS[searchType] || 'medical facilities').toLowerCase()} in ${areaLabel}…`, sender: 'bot', timestamp: new Date() },
    ]);
    setIsTyping(true);
    fetchNearbyPlaces(coords.lat, coords.lon, searchType).then(places => {
      setMessages(prev => [...prev, {
        id: Date.now(), type: 'location', sender: 'bot', timestamp: new Date(),
        locationData: { places, center: coords, searchType, areaName: areaLabel, showDistance: false },
      }]);
    }).catch(() => {
      setMessages(prev => [...prev, { id: Date.now(), text: `Sorry, couldn't load results for ${areaLabel}. Try again.`, sender: 'bot', timestamp: new Date() }]);
    }).finally(() => setIsTyping(false));
  };

  // ── TB guard ──────────────────────────────────────────────────────────────
  const TB_REDIRECT = "Oh ha, TB is totally outside my lane! I'm a pneumonia-only specialist.\n\nFor TB concerns, try a government TB clinic or pulmonologist — they'll take great care of you.\n\nI can help with:\n• Pneumonia symptoms, causes & stages\n• Understanding your chest X-ray\n• Finding nearby clinics & hospitals\n• Pneumonia treatment & recovery\n\nAnything pneumonia-related on your mind?";
  const isTBQuery = (t) => /\b(tb|tuberculosis|tubercul)\b/i.test(t);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', timestamp: new Date() }]);
    setInputMessage('');
    setIsTyping(true);

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
        body: JSON.stringify({
          message:      text,
          sessionId:    sessionIdRef.current,
          patientEmail: userData.email || null,
          patientName:  getPatientName(),
          reportContext: uploadedReport?.rawText || '',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      const g = detectGesture(data.message);
      setGesture(g);
      setTimeout(() => setGesture('idle'), 3500);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 400);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Hmm, I can't reach my brain right now. Check the connection and try again?",
        sender: 'bot', timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChipClick = (chip) => {
    if (chip.label === 'Upload my report') { fileInputRef.current?.click(); return; }
    setInputMessage(chip.label);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    // Extension-based check (more reliable than MIME type which browsers may not set for all PDFs)
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!allowedExts.includes(ext)) {
      setMessages(prev => [...prev, { id: Date.now(), text: "Please upload a valid file — JPG, PNG, or PDF only.", sender: 'bot', timestamp: new Date() }]);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessages(prev => [...prev, { id: Date.now(), text: "That file is too large (max 50 MB). Try a smaller file.", sender: 'bot', timestamp: new Date() }]);
      return;
    }

    setMessages(prev => [...prev, { id: Date.now(), text: `📄 Reading: ${file.name}…`, sender: 'user', timestamp: new Date() }]);
    setIsTyping(true);
    setGesture('read');

    try {
      // ── Read file bytes client-side ───────────────────────────────────────
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Extract printable ASCII strings from binary — works well on MEDIVISION PDFs
      // (they embed text objects that are readable as UTF-8 or Latin-1)
      let rawExtracted = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const full = decoder.decode(uint8);
        // Grab runs of printable characters (length ≥ 5) from the PDF stream
        const matches = full.match(/[\x20-\x7E\n\r\t]{5,}/g) || [];
        rawExtracted = matches
          .filter(s => !/^[<>\[\]{}\\\/]{3,}/.test(s)) // skip PDF operator noise
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .slice(0, 6000);
      } catch {}

      // ── Send to backend for AI analysis ──────────────────────────────────
      const userData = JSON.parse(localStorage.getItem('patientData') || '{}');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sessionId', sessionIdRef.current);
      fd.append('patient_email', userData.email || '');

      let backendExtracted = '';
      let botMsg = '';
      try {
        const res = await fetch('http://localhost:5000/api/chat/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          backendExtracted = data.extractedText || '';
          botMsg = data.message || '';
        }
      } catch {}

      // Use whichever extracted text is richer
      const finalText = backendExtracted.length > rawExtracted.length ? backendExtracted : rawExtracted;

      setUploadedReport({ fileName: file.name, rawText: finalText, timestamp: new Date() });

      // If backend gave no useful message, ask Groq directly with extracted text
      if (!botMsg || botMsg.toLowerCase().includes('file uploaded successfully') || botMsg.length < 30) {
        if (finalText.length > 50) {
          const summariseRes = await fetch('http://localhost:5000/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'Summarise this medical report for the patient in a clear and friendly way. Mention patient name, diagnosis, confidence if shown, doctor name, medications, and key recommendations.',
              sessionId: sessionIdRef.current,
              reportContext: finalText,
            }),
          });
          if (summariseRes.ok) {
            const d = await summariseRes.json();
            botMsg = d.message || '';
          }
        }
        if (!botMsg) botMsg = `📄 Got your report **${file.name}**! Ask me anything about it.`;
      }

      setMessages(prev => [...prev, { id: Date.now(), text: botMsg, sender: 'bot', timestamp: new Date() }]);
      setShowQuestions(true);
      if (voiceEnabled) setTimeout(() => speakText('Got your report! Let me know what you want to know.'), 400);
      setTimeout(() => setGesture('explain'), 2800);
    } catch (err) {
      setGesture('idle');
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Couldn't process that file: ${err.message}. Please try again.`,
        sender: 'bot', timestamp: new Date(),
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
      const res = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      question,
          sessionId:    sessionIdRef.current,
          patientName:  getPatientName(),
          reportContext: uploadedReport?.rawText || '',
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: 'bot', timestamp: new Date() }]);
      if (voiceEnabled) setTimeout(() => speakText(data.message), 400);
      setTimeout(() => setShowQuestions(true), 800);
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), text: "Unable to process that right now. Try again.", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <PatientLayout>
      <div className="dra-page">
        <div className="dra-layout">

          {/* ── Doctor Avatar (left) ─────────────────────── */}
          <aside className="dra-avatar-panel">
            <AnimatedDoctorAvatar
              isSpeaking={isSpeaking}
              isListening={isListening}
              gesture={gesture}
              entranceState={entranceState}
            />
          </aside>

          {/* ── Chat Panel (right) ───────────────────────── */}
          <div className="dra-chat-panel">
            <div className="dra-chat-header">
              <div className="dra-chat-header-left">
                <div className="dra-chat-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <h3>Dr. Jarvis</h3>
                  <span>
                    Pneumonia Specialist · 24/7
                    {isSpeaking  && <small className="dra-hdr-status speaking"> Speaking…</small>}
                    {isListening && <small className="dra-hdr-status listening"> Listening…</small>}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="dra-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`dra-msg ${msg.sender === 'bot' ? 'dra-msg-bot' : 'dra-msg-user'}`}>
                  {msg.sender === 'bot' && (
                    <div className="dra-msg-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    </div>
                  )}
                  <div className="dra-msg-body">
                    {msg.type === 'location' ? (
                      <LocationResultCard
                        places={msg.locationData.places}
                        center={msg.locationData.center}
                        searchType={msg.locationData.searchType}
                        areaName={msg.locationData.areaName || ''}
                        showDistance={msg.locationData.showDistance}
                      />
                    ) : msg.type === 'city-picker' ? (
                      <div className="dra-bubble dra-city-picker">
                        <p style={{ marginBottom: 8, fontWeight: 600 }}>📍 Which city are you in?</p>
                        <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 10 }}>Location access was unavailable. Pick your city to find nearby {(TYPE_LABELS[msg.searchType] || 'medical facilities').toLowerCase()}:</p>
                        <div className="dra-city-grid">
                          {['Islamabad','Rawalpindi','Lahore','Karachi','Peshawar','Multan','Faisalabad','Quetta','Sialkot','Abbottabad'].map(city => (
                            <button key={city} className="dra-city-btn" onClick={() => handleCityPick(city.toLowerCase())}>
                              {city}
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#aaa', marginTop: 8 }}>Or type: <em>"hospitals in [your city]"</em></p>
                      </div>
                    ) : msg.type === 'location-fallback' ? (
                      <div className="dra-bubble">
                        <p>📍 Couldn't pinpoint that location automatically.</p>
                        <p>Search <strong>{msg.fallbackData.label}</strong> directly on Google Maps:</p>
                        <a href={msg.fallbackData.gmaps} target="_blank" rel="noopener noreferrer" className="dra-fallback-link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                          </svg>
                          Open Google Maps Search
                        </a>
                        <p className="dra-tip">💡 Try: <em>"{msg.fallbackData.cityName ? 'hospitals in ' + msg.fallbackData.cityName : 'hospitals near me'}"</em></p>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
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
                  <p>Questions about your report:</p>
                  <div className="dra-quick-q-grid">
                    {[
                      "What disease is detected in my report?",
                      "Explain this report in simple words",
                      "What has the doctor recommended?",
                      "Is this result serious?",
                      "What should I do next?",
                      "What are the treatment options?",
                    ].map(q => (
                      <button key={q} className="dra-q-btn" onClick={() => handleQuestionClick(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input — mic & speaker moved here */}
            <div className="dra-input-area">
              <p className="dra-input-hint">Ask about pneumonia, upload a chest X-ray, or say <strong>"hospitals near COMSATS University"</strong></p>
              <form className="dra-input-form" onSubmit={handleSendMessage}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
                <button type="button" className="dra-icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach report">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <input
                  type="text"
                  className="dra-text-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Hey Dr. Jarvis, what's up?"
                  spellCheck={true}
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                />
                {/* Microphone */}
                <button
                  type="button"
                  className={`dra-icon-btn ${isListening ? 'active' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.22"/><rect x="9" y="9" width="6" height="6"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  }
                </button>
                {/* Speaker toggle */}
                <button
                  type="button"
                  className={`dra-icon-btn ${voiceEnabled ? 'active' : ''}`}
                  onClick={() => { if (isSpeaking) stopSpeaking(); setVoiceEnabled(v => !v); }}
                  title={voiceEnabled ? 'Voice on' : 'Voice off'}
                >
                  {voiceEnabled
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  }
                </button>
                <button type="submit" className="dra-send-btn" disabled={!inputMessage.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
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

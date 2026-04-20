import React, { useState, useEffect, useRef } from 'react';

// Mouth shape paths — 4 states: closed, slightly open, medium open, wide open
const MOUTH = [
  { d: 'M90,122 Q110,119 130,122 Q110,127 90,122Z', teeth: false },
  { d: 'M90,121 Q110,117 130,121 L129,127 Q110,131 91,127Z', teeth: false },
  { d: 'M88,119 Q110,114 132,119 L130,129 Q110,135 90,129Z', teeth: true },
  { d: 'M87,116 Q110,110 133,116 L131,132 Q110,140 89,132Z', teeth: true },
];

// Randomized speaking sequence that sounds natural
const SPEAK_SEQ = [0,1,2,1,3,2,1,0,1,2,3,2,1,0,1,3,2,1,2,0];

const AnimatedDoctorAvatar = ({ isSpeaking, isListening }) => {
  const [mouthIdx, setMouthIdx] = useState(0);
  const [blinking, setBlinking]  = useState(false);
  const [armLift, setArmLift]    = useState(false);
  const seqRef = useRef(0);

  // ── Lip-sync + arm gesture ────────────────────────────────────
  useEffect(() => {
    if (!isSpeaking) { setMouthIdx(0); setArmLift(false); return; }
    const id = setInterval(() => {
      seqRef.current = (seqRef.current + 1) % SPEAK_SEQ.length;
      setMouthIdx(SPEAK_SEQ[seqRef.current]);
      setArmLift(seqRef.current % 8 < 4);
    }, 115);
    return () => clearInterval(id);
  }, [isSpeaking]);

  // ── Random blinking ───────────────────────────────────────────
  useEffect(() => {
    let t;
    const blink = () => {
      setBlinking(true);
      t = setTimeout(() => {
        setBlinking(false);
        t = setTimeout(blink, 2200 + Math.random() * 3200);
      }, 155);
    };
    t = setTimeout(blink, 1800);
    return () => clearTimeout(t);
  }, []);

  const m = MOUTH[mouthIdx];
  const lidScale = blinking ? 1 : 0.10;
  const status = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  return (
    <div className={`dra-live-avatar dra-av-${status}`}>
      <svg
        viewBox="0 0 220 350"
        xmlns="http://www.w3.org/2000/svg"
        className="dra-av-svg"
        aria-label="Dr. Jarvis animated avatar"
      >
        <defs>
          <radialGradient id="avSkin" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FDDBB4"/>
            <stop offset="100%" stopColor="#F0A878"/>
          </radialGradient>
          <radialGradient id="avSkinD" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F4BE90"/>
            <stop offset="100%" stopColor="#D87840"/>
          </radialGradient>
          <linearGradient id="avCoat" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#DDE8F8"/>
          </linearGradient>
          <linearGradient id="avLapel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4E2F8"/>
            <stop offset="100%" stopColor="#C0D4F0"/>
          </linearGradient>
          <radialGradient id="avSteth" cx="38%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#4A5568"/>
            <stop offset="100%" stopColor="#1A202C"/>
          </radialGradient>
          <radialGradient id="avStetCenter" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#636E80"/>
            <stop offset="100%" stopColor="#2D3748"/>
          </radialGradient>
        </defs>

        {/* ── HAIR (behind face) ─────────────────────────── */}
        <ellipse cx="110" cy="52" rx="56" ry="50" fill="#241408"/>
        <path d="M56,52 Q68,14 110,8 Q152,14 164,52 Q154,28 110,24 Q66,28 56,52Z" fill="#241408"/>
        {/* Hair highlight */}
        <path d="M75,22 Q110,12 145,22" stroke="#3D2215" strokeWidth="3" fill="none" opacity="0.6"/>

        {/* ── EARS ───────────────────────────────────────── */}
        <ellipse cx="56" cy="97" rx="12" ry="16" fill="url(#avSkin)"/>
        <path d="M60,89 Q65,97 60,106" stroke="#D0845A" strokeWidth="2" fill="none"/>
        <ellipse cx="164" cy="97" rx="12" ry="16" fill="url(#avSkin)"/>
        <path d="M160,89 Q155,97 160,106" stroke="#D0845A" strokeWidth="2" fill="none"/>

        {/* ── FACE ───────────────────────────────────────── */}
        <ellipse cx="110" cy="97" rx="54" ry="64" fill="url(#avSkin)"/>
        {/* Cheek blush */}
        <ellipse cx="78"  cy="108" rx="12" ry="7" fill="#F8A090" opacity="0.18"/>
        <ellipse cx="142" cy="108" rx="12" ry="7" fill="#F8A090" opacity="0.18"/>

        {/* ── EYEBROWS ───────────────────────────────────── */}
        <path d="M79,69 Q90,62 100,65"  stroke="#241408" strokeWidth="3.4" fill="none" strokeLinecap="round"/>
        <path d="M120,65 Q130,62 141,69" stroke="#241408" strokeWidth="3.4" fill="none" strokeLinecap="round"/>

        {/* ── LEFT EYE ───────────────────────────────────── */}
        <ellipse cx="89" cy="83" rx="14" ry="10" fill="white"/>
        {/* Iris */}
        <circle cx="89" cy="83" r="7" fill="#3B2A1E"/>
        <circle cx="89" cy="83" r="5.5" fill="#2A1A10"/>
        {/* Shine */}
        <circle cx="91.5" cy="80.5" r="2.2" fill="white"/>
        <circle cx="87"   cy="85.5" r="1"   fill="white" opacity="0.6"/>
        {/* Eyelid (for blinking) */}
        <ellipse cx="89" cy="75" rx="14" ry="10" fill="url(#avSkin)"
          style={{
            transform: `scaleY(${lidScale})`,
            transformOrigin: '89px 75px',
            transition: 'transform 0.1s ease',
          }}
        />
        {/* Lower eyelash shadow */}
        <path d="M76,89 Q89,92 102,89" stroke="#D0845A" strokeWidth="0.8" fill="none" opacity="0.35"/>

        {/* ── RIGHT EYE ──────────────────────────────────── */}
        <ellipse cx="131" cy="83" rx="14" ry="10" fill="white"/>
        <circle cx="131" cy="83" r="7"   fill="#3B2A1E"/>
        <circle cx="131" cy="83" r="5.5" fill="#2A1A10"/>
        <circle cx="133.5" cy="80.5" r="2.2" fill="white"/>
        <circle cx="129"   cy="85.5" r="1"   fill="white" opacity="0.6"/>
        <ellipse cx="131" cy="75" rx="14" ry="10" fill="url(#avSkin)"
          style={{
            transform: `scaleY(${lidScale})`,
            transformOrigin: '131px 75px',
            transition: 'transform 0.1s ease',
          }}
        />
        <path d="M118,89 Q131,92 144,89" stroke="#D0845A" strokeWidth="0.8" fill="none" opacity="0.35"/>

        {/* ── NOSE ───────────────────────────────────────── */}
        <path d="M107,104 Q110,116 113,104" stroke="#D08060" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <ellipse cx="105" cy="114" rx="5"   ry="3" fill="#D08060" opacity="0.30"/>
        <ellipse cx="115" cy="114" rx="5"   ry="3" fill="#D08060" opacity="0.30"/>

        {/* ── MOUTH (lip-synced) ──────────────────────────── */}
        {m.teeth && (
          <>
            {/* Mouth cavity */}
            <path d={m.d} fill="#7A1A1A"/>
            {/* Upper teeth */}
            <clipPath id="avTcl"><path d={m.d}/></clipPath>
            <rect x="93" y="118" width="34" height="11" rx="2" fill="#FFFEF5" clipPath="url(#avTcl)"/>
            <line x1="101" y1="118" x2="101" y2="129" stroke="#E0E0D0" strokeWidth="0.8" clipPath="url(#avTcl)"/>
            <line x1="110" y1="118" x2="110" y2="129" stroke="#E0E0D0" strokeWidth="0.8" clipPath="url(#avTcl)"/>
            <line x1="119" y1="118" x2="119" y2="129" stroke="#E0E0D0" strokeWidth="0.8" clipPath="url(#avTcl)"/>
            {/* Lower teeth hint */}
            <rect x="95" y="127" width="30" height="7" rx="2" fill="#F5F5E8" clipPath="url(#avTcl)"/>
          </>
        )}
        {/* Lips */}
        <path d={m.d} fill="#CC5050" fillOpacity={m.teeth ? 0.65 : 1}/>
        {/* Upper lip bow */}
        <path d="M90,120 Q100,117 110,119 Q120,117 130,120" stroke="#B03030" strokeWidth="1.2" fill="none"/>
        {/* Smile line (closed only) */}
        {mouthIdx === 0 && (
          <path d="M91,123 Q110,127 129,123" stroke="#A83030" strokeWidth="1.2" fill="none"/>
        )}

        {/* ── NECK ───────────────────────────────────────── */}
        <rect x="98" y="160" width="24" height="24" rx="3" fill="url(#avSkin)"/>

        {/* ── SHIRT & TIE ────────────────────────────────── */}
        {/* Shirt collar area */}
        <path d="M82,188 L98,162 L110,176 L122,162 L138,188Z" fill="#EEF4FF"/>
        {/* Collar points */}
        <path d="M82,188 L95,170 L98,162 L104,172Z" fill="#DDE8F8"/>
        <path d="M138,188 L125,170 L122,162 L116,172Z" fill="#DDE8F8"/>
        {/* Tie */}
        <path d="M105,172 L110,177 L115,172 L112,214 L110,218 L108,214Z" fill="#2B4C8C"/>
        {/* Tie knot */}
        <path d="M106,173 L110,168 L114,173 L110,177Z" fill="#1A3A7A"/>
        {/* Tie pattern lines */}
        <line x1="109" y1="182" x2="111" y2="182" stroke="#3A5CA0" strokeWidth="1" opacity="0.5"/>
        <line x1="108" y1="190" x2="112" y2="190" stroke="#3A5CA0" strokeWidth="1" opacity="0.5"/>
        <line x1="108" y1="198" x2="112" y2="198" stroke="#3A5CA0" strokeWidth="1" opacity="0.5"/>
        <line x1="109" y1="206" x2="111" y2="206" stroke="#3A5CA0" strokeWidth="1" opacity="0.5"/>

        {/* ── WHITE COAT BODY ─────────────────────────────── */}
        {/* Left panel */}
        <path d="M18,192 L82,185 L93,204 L78,316 L12,324Z" fill="url(#avCoat)"/>
        {/* Right panel */}
        <path d="M202,192 L138,185 L127,204 L142,316 L208,324Z" fill="url(#avCoat)"/>
        {/* Center front strip */}
        <path d="M93,204 L127,204 L133,324 L87,324Z" fill="url(#avCoat)"/>
        {/* Left lapel */}
        <path d="M82,185 L98,162 L110,176 L93,204Z" fill="url(#avLapel)"/>
        {/* Right lapel */}
        <path d="M138,185 L122,162 L110,176 L127,204Z" fill="url(#avLapel)"/>
        {/* Left coat edge shadow */}
        <path d="M18,192 L24,194 L80,318 L78,316 L93,204 L82,185Z" fill="#C8D8F0" opacity="0.45"/>
        {/* Right coat edge shadow */}
        <path d="M202,192 L196,194 L140,318 L142,316 L127,204 L138,185Z" fill="#C8D8F0" opacity="0.45"/>
        {/* Center button strip */}
        <line x1="110" y1="210" x2="110" y2="320" stroke="#B8CCE4" strokeWidth="1.5"/>
        {/* Buttons */}
        <circle cx="110" cy="225" r="4"   fill="#A8BEDD" stroke="#98B0D0" strokeWidth="0.8"/>
        <circle cx="110" cy="248" r="4"   fill="#A8BEDD" stroke="#98B0D0" strokeWidth="0.8"/>
        <circle cx="110" cy="271" r="4"   fill="#A8BEDD" stroke="#98B0D0" strokeWidth="0.8"/>
        {/* Chest pocket (right side) */}
        <rect x="142" y="214" width="32" height="36" rx="4" fill="none" stroke="#B8CCDF" strokeWidth="1.5"/>
        <path d="M142,224 L174,224" stroke="#B8CCDF" strokeWidth="1.5"/>
        {/* Pens in pocket */}
        <rect x="150" y="206" width="4.5" height="18" rx="2.2" fill="#2B7CB4"/>
        <circle cx="152.3" cy="205"  r="3.2" fill="#1A5A8C"/>
        <rect x="157" y="208" width="4.5" height="16" rx="2.2" fill="#38A169"/>
        <circle cx="159.3" cy="207"  r="3.2" fill="#276749"/>
        {/* Left chest pocket (ID badge) */}
        <rect x="36" y="236" width="60" height="38" rx="4" fill="white" stroke="#B8CCDF" strokeWidth="1.5"/>
        <rect x="36" y="236" width="60" height="12" rx="4" fill="#2C7A7B"/>
        <rect x="36" y="244" width="60" height="4"  fill="#2C7A7B"/>
        <text x="66" y="261" fontFamily="Arial, sans-serif" fontSize="7.5" fontWeight="bold" fill="#1A3A4A" textAnchor="middle">Dr. Jarvis</text>
        <text x="66" y="270" fontFamily="Arial, sans-serif" fontSize="5.5" fill="#718096" textAnchor="middle">AI Specialist</text>

        {/* ── STETHOSCOPE ─────────────────────────────────── */}
        {/* Left tube to ear */}
        <path d="M110,168 Q93,163 81,157 Q75,153 73,147" stroke="#1A202C" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
        <circle cx="71" cy="145" r="6" fill="#1A202C"/>
        <circle cx="71" cy="145" r="3.5" fill="#2D3748"/>
        {/* Right tube to ear */}
        <path d="M110,168 Q127,163 139,157 Q145,153 147,147" stroke="#1A202C" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
        <circle cx="149" cy="145" r="6" fill="#1A202C"/>
        <circle cx="149" cy="145" r="3.5" fill="#2D3748"/>
        {/* Main tube going down to chest piece */}
        <path d="M110,168 Q108,194 107,218 Q106,240 120,255" stroke="#2D3748" strokeWidth="4.8" fill="none" strokeLinecap="round"/>
        {/* Chest piece */}
        <circle cx="120" cy="259" r="14"  fill="url(#avSteth)"/>
        <circle cx="120" cy="259" r="10"  fill="#2D3748"/>
        <circle cx="120" cy="259" r="5.5" fill="url(#avStetCenter)"/>
        <circle cx="118" cy="257" r="2"   fill="#718096"/>
        {/* Membrane ring detail */}
        <circle cx="120" cy="259" r="12" fill="none" stroke="#4A5568" strokeWidth="1"/>

        {/* ── LEFT ARM + HAND ─────────────────────────────── */}
        {/* Left sleeve */}
        <path d="M44,198 Q18,252 14,304 Q12,328 18,346 L46,344 Q50,326 51,304 Q55,250 70,203Z" fill="url(#avCoat)"/>
        {/* Left coat edge on sleeve */}
        <path d="M44,198 L48,200 Q62,252 58,304 Q57,326 51,344 L46,344 Q50,326 51,304 Q55,250 70,203Z" fill="#C8D8F0" opacity="0.4"/>
        {/* Left hand */}
        <ellipse cx="32" cy="348" rx="18" ry="12" fill="url(#avSkinD)" transform="rotate(-14,32,348)"/>
        {/* Finger hints */}
        <path d="M22,342 Q18,334 20,328" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M28,339 Q25,330 27,324" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M35,337 Q34,328 36,322" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M42,339 Q43,330 44,325" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Knuckle lines */}
        <path d="M21,344 Q28,341 34,340" stroke="#C07845" strokeWidth="0.8" fill="none" opacity="0.5"/>

        {/* ── RIGHT ARM + HAND (animates during speech) ────── */}
        <g style={{
          transform: armLift
            ? 'translateY(-16px) rotate(-16deg)'
            : 'translateY(0) rotate(0)',
          transformOrigin: '190px 198px',
          transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Right sleeve */}
          <path d="M176,198 Q202,252 206,304 Q208,328 202,346 L174,344 Q170,326 169,304 Q165,250 150,203Z" fill="url(#avCoat)"/>
          <path d="M176,198 L172,200 Q158,252 162,304 Q163,326 169,344 L174,344 Q170,326 169,304 Q165,250 150,203Z" fill="#C8D8F0" opacity="0.4"/>
          {/* Right hand */}
          <ellipse cx="188" cy="348" rx="18" ry="12" fill="url(#avSkinD)" transform="rotate(14,188,348)"/>
          {/* Finger hints */}
          <path d="M198,342 Q202,334 200,328" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d="M192,339 Q195,330 193,324" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d="M185,337 Q186,328 184,322" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d="M178,339 Q177,330 176,325" stroke="url(#avSkinD)" strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d="M199,344 Q192,341 186,340" stroke="#C07845" strokeWidth="0.8" fill="none" opacity="0.5"/>
        </g>
      </svg>

      {/* ── Audio wave indicator (speaking) ──────────────── */}
      {isSpeaking && (
        <div className="dra-av-waves">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="dra-av-wave-bar" style={{ animationDelay: `${i * 0.12}s` }}/>
          ))}
        </div>
      )}

      {/* ── Listening pulse ───────────────────────────────── */}
      {isListening && (
        <div className="dra-av-listen">
          <div className="dra-av-listen-ring"/>
          <div className="dra-av-listen-ring" style={{ animationDelay: '0.45s' }}/>
        </div>
      )}
    </div>
  );
};

export default AnimatedDoctorAvatar;

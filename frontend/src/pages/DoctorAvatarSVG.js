import React, { useState, useEffect, useRef } from 'react';

// 4 lip-sync mouth shapes — mapped to face proportions (center y≈136)
const MOUTH = [
  { d: 'M90,137 Q120,134 150,137 Q120,142 90,137Z',          teeth: false }, // closed smile
  { d: 'M90,136 Q120,132 150,136 L149,143 Q120,148 91,143Z', teeth: false }, // slight
  { d: 'M88,134 Q120,128 152,134 L150,146 Q120,153 90,146Z', teeth: true  }, // medium
  { d: 'M87,131 Q120,124 153,131 L151,149 Q120,157 89,149Z', teeth: true  }, // wide
];
const SPEAK_SEQ = [0,1,2,1,3,2,1,0,1,2,3,2,1,0,1,3,2,1,2,0,1,0];

const AnimatedDoctorAvatar = ({ isSpeaking, isListening, gesture = 'idle', entranceState = 'complete' }) => {
  const [mouthIdx,  setMouthIdx]  = useState(0);
  const [blinking,  setBlinking]  = useState(false);
  const seqRef = useRef(0);

  // ── Lip sync ─────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeaking) { setMouthIdx(0); return; }
    const id = setInterval(() => {
      seqRef.current = (seqRef.current + 1) % SPEAK_SEQ.length;
      setMouthIdx(SPEAK_SEQ[seqRef.current]);
    }, 115);
    return () => clearInterval(id);
  }, [isSpeaking]);

  // ── Random blinking ───────────────────────────────────────
  useEffect(() => {
    let t;
    const blink = () => {
      setBlinking(true);
      t = setTimeout(() => {
        setBlinking(false);
        t = setTimeout(blink, 2000 + Math.random() * 3500);
      }, 155);
    };
    t = setTimeout(blink, 2200);
    return () => clearTimeout(t);
  }, []);

  const m        = MOUTH[mouthIdx];
  const lidScale = blinking ? 1 : 0.09;

  // Right-arm gesture transforms (origin at shoulder ≈ 196,202)
  const armStyle = {
    idle:     'rotate(0deg)  translateY(0px)',
    wave:     undefined, // handled by CSS animation class
    explain:  'rotate(-18deg) translateY(-8px)',
    think:    'rotate(-62deg) translateY(-20px)',
    read:     'rotate(-78deg) translateY(-36px)',
    thumbsup: 'rotate(-28deg) translateY(-12px)',
  }[gesture];

  const status = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  return (
    <div className={`dra-live-avatar dra-av-${status} dra-entrance-${entranceState}`}>
      <svg
        viewBox="0 0 240 410"
        xmlns="http://www.w3.org/2000/svg"
        className="dra-av-svg"
        aria-label="Dr. Jarvis"
      >
        <defs>
          <radialGradient id="avSk" cx="42%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#FCD5A8"/>
            <stop offset="60%"  stopColor="#F4A86A"/>
            <stop offset="100%" stopColor="#E07B3A"/>
          </radialGradient>
          <radialGradient id="avSkD" cx="42%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#EFB880"/>
            <stop offset="100%" stopColor="#C86028"/>
          </radialGradient>
          <linearGradient id="avCt" x1="8%" y1="0%" x2="92%" y2="100%">
            <stop offset="0%"   stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#D8E8F8"/>
          </linearGradient>
          <linearGradient id="avLp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#C4D8F0"/>
            <stop offset="100%" stopColor="#B0C8E8"/>
          </linearGradient>
          <radialGradient id="avSt" cx="38%" cy="28%" r="72%">
            <stop offset="0%"   stopColor="#4A5568"/>
            <stop offset="100%" stopColor="#1A202C"/>
          </radialGradient>
          <filter id="avGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ══ HAIR — curly clusters ════════════════════════ */}
        {/* Base hair mass */}
        <path d="M54,100 C54,26 84,0 120,0 C156,0 186,26 186,100 C186,74 174,56 160,52 C150,34 138,46 126,42 C120,38 114,38 108,42 C96,46 84,34 74,52 C60,56 54,74 54,100Z" fill="#5A2E14"/>
        {/* Curl clusters (circles give curly texture) */}
        <circle cx="78"  cy="38" r="14" fill="#5A2E14"/>
        <circle cx="93"  cy="26" r="15" fill="#5A2E14"/>
        <circle cx="108" cy="18" r="16" fill="#5A2E14"/>
        <circle cx="122" cy="14" r="17" fill="#5A2E14"/>
        <circle cx="137" cy="18" r="16" fill="#5A2E14"/>
        <circle cx="151" cy="26" r="14" fill="#5A2E14"/>
        <circle cx="163" cy="40" r="12" fill="#5A2E14"/>
        {/* Lighter highlights for depth */}
        <circle cx="84"  cy="28" r="8"  fill="#6E3C1A"/>
        <circle cx="99"  cy="16" r="9"  fill="#6E3C1A"/>
        <circle cx="114" cy="8"  r="10" fill="#6E3C1A"/>
        <circle cx="126" cy="5"  r="11" fill="#6E3C1A"/>
        <circle cx="139" cy="10" r="9"  fill="#6E3C1A"/>
        <circle cx="152" cy="20" r="7"  fill="#6E3C1A"/>
        {/* Bright highlight tips */}
        <circle cx="108" cy="10" r="4"  fill="#8A5030" opacity="0.7"/>
        <circle cx="120" cy="5"  r="5"  fill="#8A5030" opacity="0.7"/>
        <circle cx="132" cy="8"  r="4"  fill="#8A5030" opacity="0.7"/>
        <circle cx="147" cy="17" r="3"  fill="#8A5030" opacity="0.6"/>

        {/* ══ EARS ════════════════════════════════════════ */}
        <ellipse cx="53"  cy="103" rx="12" ry="18" fill="url(#avSk)"/>
        <path d="M58,93 Q64,103 58,114"  stroke="#C87840" strokeWidth="2" fill="none"/>
        <ellipse cx="187" cy="103" rx="12" ry="18" fill="url(#avSk)"/>
        <path d="M182,93 Q176,103 182,114" stroke="#C87840" strokeWidth="2" fill="none"/>

        {/* ══ FACE ════════════════════════════════════════ */}
        <ellipse cx="120" cy="100" rx="68" ry="76" fill="url(#avSk)"/>
        {/* Cheek blush */}
        <ellipse cx="76"  cy="120" rx="16" ry="10" fill="#F09080" opacity="0.20"/>
        <ellipse cx="164" cy="120" rx="16" ry="10" fill="#F09080" opacity="0.20"/>

        {/* ══ EYEBROWS ════════════════════════════════════ */}
        <path d="M77,78  Q90,70  102,73"  stroke="#3A1C0A" strokeWidth="4.2" fill="none" strokeLinecap="round"/>
        <path d="M138,73 Q150,70 163,78"  stroke="#3A1C0A" strokeWidth="4.2" fill="none" strokeLinecap="round"/>

        {/* ══ LEFT EYE ════════════════════════════════════ */}
        <ellipse cx="91"  cy="93" rx="19" ry="15" fill="white"/>
        <circle  cx="91"  cy="93" r="12"  fill="#5A3518"/>
        <circle  cx="91"  cy="93" r="9"   fill="#3A2010"/>
        <circle  cx="91"  cy="93" r="6.5" fill="#1C0C00"/>
        <circle  cx="95"  cy="87" r="4"   fill="white"/>
        <circle  cx="87"  cy="97" r="1.8" fill="white" opacity="0.65"/>
        <path d="M72,85 Q91,79 110,85" stroke="#2A1408" strokeWidth="2.8" fill="none"/>
        {/* Eyelid (blink) */}
        <ellipse cx="91" cy="83" rx="19" ry="15" fill="url(#avSk)"
          style={{ transform: `scaleY(${lidScale})`, transformOrigin: '91px 83px', transition: 'transform 0.1s ease' }}/>

        {/* ══ RIGHT EYE ═══════════════════════════════════ */}
        <ellipse cx="149" cy="93" rx="19" ry="15" fill="white"/>
        <circle  cx="149" cy="93" r="12"  fill="#5A3518"/>
        <circle  cx="149" cy="93" r="9"   fill="#3A2010"/>
        <circle  cx="149" cy="93" r="6.5" fill="#1C0C00"/>
        <circle  cx="153" cy="87" r="4"   fill="white"/>
        <circle  cx="145" cy="97" r="1.8" fill="white" opacity="0.65"/>
        <path d="M130,85 Q149,79 168,85" stroke="#2A1408" strokeWidth="2.8" fill="none"/>
        <ellipse cx="149" cy="83" rx="19" ry="15" fill="url(#avSk)"
          style={{ transform: `scaleY(${lidScale})`, transformOrigin: '149px 83px', transition: 'transform 0.1s ease' }}/>

        {/* ══ NOSE ════════════════════════════════════════ */}
        <path d="M115,118 Q120,130 125,118" stroke="#C07840" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <ellipse cx="113" cy="128" rx="6"   ry="3.5" fill="#C07840" opacity="0.28"/>
        <ellipse cx="127" cy="128" rx="6"   ry="3.5" fill="#C07840" opacity="0.28"/>

        {/* ══ MOUTH (animated lip-sync) ═══════════════════ */}
        {m.teeth && (
          <>
            <path d={m.d} fill="#8A1818"/>
            <clipPath id="avTcl"><path d={m.d}/></clipPath>
            <rect x="96"  y="133" width="48" height="13" rx="2.5" fill="#FFFEF8" clipPath="url(#avTcl)"/>
            <line x1="108" y1="133" x2="108" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
            <line x1="120" y1="133" x2="120" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
            <line x1="132" y1="133" x2="132" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
            <rect x="99"  y="143" width="42" height="8"  rx="2"   fill="#F5F5EC" clipPath="url(#avTcl)"/>
          </>
        )}
        <path d={m.d} fill="#D05050" fillOpacity={m.teeth ? 0.55 : 1}/>
        <path d="M90,136 Q106,133 120,135 Q134,133 150,136" stroke="#A83030" strokeWidth="1.5" fill="none"/>
        {mouthIdx === 0 && (
          <path d="M92,139 Q120,145 148,139" stroke="#A83030" strokeWidth="1.5" fill="none"/>
        )}

        {/* ══ NECK ════════════════════════════════════════ */}
        <rect x="107" y="174" width="26" height="24" rx="3" fill="url(#avSk)"/>

        {/* ══ SHIRT COLLAR (light blue) ═══════════════════ */}
        <path d="M80,198 L107,174 L120,188 L133,174 L160,198Z"  fill="#5A9AD4"/>
        <path d="M80,198 L96,178 L107,174 L112,183Z"  fill="#4A88C2"/>
        <path d="M160,198 L144,178 L133,174 L128,183Z" fill="#4A88C2"/>

        {/* ══ TIE (navy) ══════════════════════════════════ */}
        <path d="M114,185 L120,190 L126,185 L123,224 L120,229 L117,224Z" fill="#1C3460"/>
        <path d="M115,185 L120,180 L125,185 L120,190Z"  fill="#142850"/>
        {[198,210,222].map(y => (
          <line key={y} x1="118" y1={y} x2="122" y2={y} stroke="#2A4878" strokeWidth="1.2" opacity="0.6"/>
        ))}

        {/* ══ WHITE COAT ══════════════════════════════════ */}
        {/* Left panel */}
        <path d="M12,204 L80,196 L94,216 L78,330 L8,338Z"   fill="url(#avCt)"/>
        {/* Right panel */}
        <path d="M228,204 L160,196 L146,216 L162,330 L232,338Z" fill="url(#avCt)"/>
        {/* Center strip */}
        <path d="M94,216 L146,216 L152,338 L88,338Z"        fill="url(#avCt)"/>
        {/* Left lapel */}
        <path d="M80,196 L107,174 L120,188 L94,216Z"  fill="url(#avLp)"/>
        {/* Right lapel */}
        <path d="M160,196 L133,174 L120,188 L146,216Z" fill="url(#avLp)"/>
        {/* Edge shadows */}
        <path d="M12,204 L20,207 L82,333 L78,330 L94,216 L80,196Z"  fill="#B0C8E8" opacity="0.38"/>
        <path d="M228,204 L220,207 L158,333 L162,330 L146,216 L160,196Z" fill="#B0C8E8" opacity="0.38"/>
        {/* Center button line */}
        <line x1="120" y1="222" x2="120" y2="335" stroke="#A8C0DC" strokeWidth="1.8"/>
        {/* Buttons */}
        {[236, 260, 284, 308].map(y => (
          <circle key={y} cx="120" cy={y} r="4.5" fill="#98B4D4" stroke="#88A4C4" strokeWidth="0.8"/>
        ))}
        {/* Chest pocket */}
        <rect x="150" y="222" width="36" height="40" rx="4" fill="none" stroke="#A0B8D4" strokeWidth="1.6"/>
        <path d="M150,233 L186,233" stroke="#A0B8D4" strokeWidth="1.4"/>
        {/* Pens */}
        <rect x="158" y="212" width="5"   height="21" rx="2.5" fill="#2B6CB4"/>
        <circle cx="160.5" cy="211" r="3.5" fill="#1A4E8A"/>
        <rect x="166" y="214" width="5"   height="19" rx="2.5" fill="#38A169"/>
        <circle cx="168.5" cy="213" r="3.5" fill="#276749"/>
        {/* ID badge */}
        <rect x="36" y="252" width="66" height="42" rx="5" fill="white" stroke="#A0B8D4" strokeWidth="1.5"/>
        <rect x="36" y="252" width="66" height="13" rx="5" fill="#2C7A7B"/>
        <rect x="36" y="261" width="66" height="4"  fill="#2C7A7B"/>
        <text x="69" y="278" fontFamily="Arial,sans-serif" fontSize="8.5" fontWeight="bold" fill="#1A3A4A" textAnchor="middle">Dr. Jarvis</text>
        <text x="69" y="288" fontFamily="Arial,sans-serif" fontSize="6"   fill="#718096"   textAnchor="middle">AI Specialist</text>

        {/* ══ STETHOSCOPE ════════════════════════════════ */}
        <path d="M120,180 Q102,174 89,167 Q82,163 80,156" stroke="#1A202C" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <circle cx="78" cy="154" r="7" fill="#1A202C"/>
        <circle cx="78" cy="154" r="4" fill="#2D3748"/>
        <path d="M120,180 Q138,174 151,167 Q158,163 160,156" stroke="#1A202C" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <circle cx="162" cy="154" r="7" fill="#1A202C"/>
        <circle cx="162" cy="154" r="4" fill="#2D3748"/>
        <path d="M120,180 Q118,204 116,230 Q115,252 130,268" stroke="#2D3748" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
        <circle cx="130" cy="272" r="15"  fill="url(#avSt)"/>
        <circle cx="130" cy="272" r="11"  fill="#2D3748"/>
        <circle cx="130" cy="272" r="6.5" fill="#4A5568"/>
        <circle cx="128" cy="270" r="2.2" fill="#718096"/>
        <circle cx="130" cy="272" r="13"  fill="none" stroke="#4A5568" strokeWidth="1.2"/>

        {/* ══ LEFT ARM (static) ══════════════════════════ */}
        <path d="M38,208 Q10,264 6,320 Q4,345 11,363 L42,361 Q47,344 48,320 Q52,262 68,213Z" fill="url(#avCt)"/>
        <path d="M38,208 L44,211 Q60,264 57,320 Q56,344 47,361 L42,361 Q47,344 48,320 Q52,262 68,213Z" fill="#B0C8E8" opacity="0.32"/>
        {/* Left hand */}
        <ellipse cx="26" cy="365" rx="21" ry="14" fill="url(#avSkD)" transform="rotate(-12,26,365)"/>
        <path d="M13,358 Q8,348 10,341"  stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M21,355 Q16,344 18,337" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M30,352 Q28,341 30,334" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M38,355 Q40,344 42,338" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M14,362 Q22,358 28,357" stroke="#C07838" strokeWidth="1"  fill="none" opacity="0.45"/>

        {/* ══ RIGHT ARM (gesture-animated) ═══════════════ */}
        <g
          className={`dra-right-arm${gesture === 'wave' ? ' dra-arm-wave' : ''}`}
          style={{
            transform:       gesture !== 'wave' ? armStyle : undefined,
            transformOrigin: '196px 204px',
            transition:      gesture !== 'wave' ? 'transform 0.36s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}
        >
          <path d="M202,208 Q230,264 234,320 Q236,345 229,363 L198,361 Q193,344 192,320 Q188,262 172,213Z" fill="url(#avCt)"/>
          <path d="M202,208 L196,211 Q180,264 184,320 Q185,344 193,361 L198,361 Q193,344 192,320 Q188,262 172,213Z" fill="#B0C8E8" opacity="0.32"/>
          {/* Right hand */}
          <ellipse cx="214" cy="365" rx="21" ry="14" fill="url(#avSkD)" transform="rotate(12,214,365)"/>
          <path d="M227,358 Q232,348 230,341" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d="M219,355 Q224,344 222,337" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d="M210,352 Q212,341 210,334" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d="M202,355 Q200,344 198,338" stroke="url(#avSkD)" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d="M226,362 Q218,358 212,357" stroke="#C07838" strokeWidth="1"  fill="none" opacity="0.45"/>
          {/* Thumbs-up hand shape (only when gesture=thumbsup) */}
          {gesture === 'thumbsup' && (
            <path d="M232,354 Q238,350 238,340 Q238,330 230,330 L224,330 L222,310 Q222,304 216,304 Q210,304 210,312 L208,330 L202,330 L202,362 L224,362Z" fill="url(#avSkD)"/>
          )}
        </g>

        {/* ══ LEGS (visible during tiny walk-in entrance) ═ */}
        <path d="M88,338 Q82,368 80,392 Q79,402 82,410 L108,410 Q108,402 108,392 Q110,368 112,338Z" fill="#2D3748"/>
        <path d="M152,338 Q158,368 160,392 Q161,402 158,410 L132,410 Q132,402 132,392 Q130,368 128,338Z" fill="#2D3748"/>
        {/* Shoes */}
        <path d="M74,406 Q94,398 112,406 L112,414 Q94,418 74,414Z" fill="#1A202C"/>
        <ellipse cx="93" cy="410" rx="20" ry="7" fill="#1A202C"/>
        <path d="M128,406 Q148,398 166,406 L166,414 Q148,418 128,414Z" fill="#1A202C"/>
        <ellipse cx="147" cy="410" rx="20" ry="7" fill="#1A202C"/>
      </svg>

      {/* Audio wave bars (speaking) */}
      {isSpeaking && (
        <div className="dra-av-waves">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="dra-av-wave-bar" style={{ animationDelay: `${i * 0.12}s` }}/>
          ))}
        </div>
      )}
      {/* Listening pulse rings */}
      {isListening && !isSpeaking && (
        <div className="dra-av-listen">
          <div className="dra-av-listen-ring"/>
          <div className="dra-av-listen-ring" style={{ animationDelay: '0.45s' }}/>
        </div>
      )}
    </div>
  );
};

export default AnimatedDoctorAvatar;

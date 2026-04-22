import React, { useState, useEffect, useRef } from 'react';

// 4 lip-sync mouth shapes
const MOUTH = [
  { d: 'M90,137 Q120,134 150,137 Q120,142 90,137Z',          teeth: false },
  { d: 'M90,136 Q120,132 150,136 L149,143 Q120,148 91,143Z', teeth: false },
  { d: 'M88,134 Q120,128 152,134 L150,146 Q120,153 90,146Z', teeth: true  },
  { d: 'M87,131 Q120,124 153,131 L151,149 Q120,157 89,149Z', teeth: true  },
];
const SPEAK_SEQ = [0,1,2,1,3,2,1,0,1,2,3,2,1,0,1,3,2,1,2,0,1,0];

const AnimatedDoctorAvatar = ({ isSpeaking, isListening, gesture = 'idle', entranceState = 'complete' }) => {
  const [mouthIdx, setMouthIdx] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const seqRef = useRef(0);

  // Lip sync
  useEffect(() => {
    if (!isSpeaking) { setMouthIdx(0); return; }
    const id = setInterval(() => {
      seqRef.current = (seqRef.current + 1) % SPEAK_SEQ.length;
      setMouthIdx(SPEAK_SEQ[seqRef.current]);
    }, 115);
    return () => clearInterval(id);
  }, [isSpeaking]);

  // Random blinking
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

  // Right-arm gesture transforms (shoulder origin)
  const armStyle = {
    idle:     'rotate(0deg)   translateY(0px)',
    wave:     undefined,
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
        </defs>

        {/* ══ HAIR ════════════════════════════════════════════ */}
        <path d="M54,100 C54,26 84,0 120,0 C156,0 186,26 186,100 C186,74 174,56 160,52 C150,34 138,46 126,42 C120,38 114,38 108,42 C96,46 84,34 74,52 C60,56 54,74 54,100Z" fill="#4A2010"/>
        <circle cx="78"  cy="38" r="14" fill="#4A2010"/>
        <circle cx="93"  cy="26" r="15" fill="#4A2010"/>
        <circle cx="108" cy="18" r="16" fill="#4A2010"/>
        <circle cx="122" cy="14" r="17" fill="#4A2010"/>
        <circle cx="137" cy="18" r="16" fill="#4A2010"/>
        <circle cx="151" cy="26" r="14" fill="#4A2010"/>
        <circle cx="163" cy="40" r="12" fill="#4A2010"/>
        <circle cx="84"  cy="28" r="8"  fill="#6B3820"/>
        <circle cx="99"  cy="16" r="9"  fill="#6B3820"/>
        <circle cx="114" cy="8"  r="10" fill="#6B3820"/>
        <circle cx="126" cy="5"  r="11" fill="#6B3820"/>
        <circle cx="139" cy="10" r="9"  fill="#6B3820"/>
        <circle cx="152" cy="20" r="7"  fill="#6B3820"/>

        {/* ══ EARS ════════════════════════════════════════════ */}
        <ellipse cx="53"  cy="103" rx="12" ry="18" fill="url(#avSk)"/>
        <path d="M58,93 Q64,103 58,114"  stroke="#C87840" strokeWidth="2" fill="none"/>
        <ellipse cx="187" cy="103" rx="12" ry="18" fill="url(#avSk)"/>
        <path d="M182,93 Q176,103 182,114" stroke="#C87840" strokeWidth="2" fill="none"/>

        {/* ══ FACE ════════════════════════════════════════════ */}
        <ellipse cx="120" cy="100" rx="68" ry="76" fill="url(#avSk)"/>
        <ellipse cx="76"  cy="120" rx="16" ry="10" fill="#F09080" opacity="0.18"/>
        <ellipse cx="164" cy="120" rx="16" ry="10" fill="#F09080" opacity="0.18"/>

        {/* ══ EYEBROWS ════════════════════════════════════════ */}
        <path d="M77,78  Q90,70  102,73"  stroke="#2A1008" strokeWidth="4.2" fill="none" strokeLinecap="round"/>
        <path d="M138,73 Q150,70 163,78"  stroke="#2A1008" strokeWidth="4.2" fill="none" strokeLinecap="round"/>

        {/* ══ LEFT EYE ════════════════════════════════════════ */}
        <ellipse cx="91"  cy="93" rx="19" ry="15" fill="white"/>
        <circle  cx="91"  cy="93" r="12"  fill="#5A3518"/>
        <circle  cx="91"  cy="93" r="9"   fill="#3A2010"/>
        <circle  cx="91"  cy="93" r="6.5" fill="#1C0C00"/>
        <circle  cx="95"  cy="87" r="4"   fill="white"/>
        <circle  cx="87"  cy="97" r="1.8" fill="white" opacity="0.65"/>
        <path d="M72,85 Q91,79 110,85" stroke="#2A1408" strokeWidth="2.8" fill="none"/>
        <ellipse cx="91" cy="83" rx="19" ry="15" fill="url(#avSk)"
          style={{ transform: `scaleY(${lidScale})`, transformOrigin: '91px 83px', transition: 'transform 0.1s ease' }}/>

        {/* ══ RIGHT EYE ═══════════════════════════════════════ */}
        <ellipse cx="149" cy="93" rx="19" ry="15" fill="white"/>
        <circle  cx="149" cy="93" r="12"  fill="#5A3518"/>
        <circle  cx="149" cy="93" r="9"   fill="#3A2010"/>
        <circle  cx="149" cy="93" r="6.5" fill="#1C0C00"/>
        <circle  cx="153" cy="87" r="4"   fill="white"/>
        <circle  cx="145" cy="97" r="1.8" fill="white" opacity="0.65"/>
        <path d="M130,85 Q149,79 168,85" stroke="#2A1408" strokeWidth="2.8" fill="none"/>
        <ellipse cx="149" cy="83" rx="19" ry="15" fill="url(#avSk)"
          style={{ transform: `scaleY(${lidScale})`, transformOrigin: '149px 83px', transition: 'transform 0.1s ease' }}/>

        {/* ══ NOSE ════════════════════════════════════════════ */}
        <path d="M115,118 Q120,130 125,118" stroke="#C07840" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <ellipse cx="113" cy="128" rx="6"   ry="3.5" fill="#C07840" opacity="0.26"/>
        <ellipse cx="127" cy="128" rx="6"   ry="3.5" fill="#C07840" opacity="0.26"/>

        {/* ══ MOUTH (animated) ════════════════════════════════ */}
        {m.teeth && (
          <>
            <path d={m.d} fill="#8A1818"/>
            <clipPath id="avTcl"><path d={m.d}/></clipPath>
            <rect x="96"  y="133" width="48" height="13" rx="2.5" fill="#FFFEF8" clipPath="url(#avTcl)"/>
            <line x1="108" y1="133" x2="108" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
            <line x1="120" y1="133" x2="120" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
            <line x1="132" y1="133" x2="132" y2="146" stroke="#E0E0D0" strokeWidth="1" clipPath="url(#avTcl)"/>
          </>
        )}
        <path d={m.d} fill="#D05050" fillOpacity={m.teeth ? 0.55 : 1}/>
        <path d="M90,136 Q106,133 120,135 Q134,133 150,136" stroke="#A83030" strokeWidth="1.5" fill="none"/>
        {mouthIdx === 0 && (
          <path d="M92,139 Q120,145 148,139" stroke="#A83030" strokeWidth="1.5" fill="none"/>
        )}

        {/* ══ NECK ════════════════════════════════════════════ */}
        <rect x="107" y="174" width="26" height="24" rx="3" fill="url(#avSk)"/>

        {/* ══ SHIRT COLLAR ════════════════════════════════════ */}
        <path d="M80,198 L107,174 L120,188 L133,174 L160,198Z"  fill="#5A9AD4"/>
        <path d="M80,198 L96,178 L107,174 L112,183Z"  fill="#4A88C2"/>
        <path d="M160,198 L144,178 L133,174 L128,183Z" fill="#4A88C2"/>

        {/* ══ TIE ═════════════════════════════════════════════ */}
        <path d="M114,185 L120,190 L126,185 L123,224 L120,229 L117,224Z" fill="#1C3460"/>
        <path d="M115,185 L120,180 L125,185 L120,190Z"  fill="#142850"/>
        {[198,210,222].map(y => (
          <line key={y} x1="118" y1={y} x2="122" y2={y} stroke="#2A4878" strokeWidth="1.2" opacity="0.6"/>
        ))}

        {/* ══ WHITE COAT — proportional, not wing-wide ════════ */}
        {/* Left panel — tapered, outer edge at ~x=50 not x=12 */}
        <path d="M52,204 L80,196 L94,216 L88,338 L46,338Z" fill="url(#avCt)"/>
        {/* Right panel */}
        <path d="M188,204 L160,196 L146,216 L152,338 L194,338Z" fill="url(#avCt)"/>
        {/* Center strip */}
        <path d="M94,216 L146,216 L152,338 L88,338Z" fill="url(#avCt)"/>
        {/* Left lapel */}
        <path d="M80,196 L107,174 L120,188 L94,216Z"  fill="url(#avLp)"/>
        {/* Right lapel */}
        <path d="M160,196 L133,174 L120,188 L146,216Z" fill="url(#avLp)"/>
        {/* Edge shadows */}
        <path d="M52,204 L58,207 L92,332 L88,338 L94,216 L80,196Z" fill="#B0C8E8" opacity="0.36"/>
        <path d="M188,204 L182,207 L148,332 L152,338 L146,216 L160,196Z" fill="#B0C8E8" opacity="0.36"/>
        {/* Center button line */}
        <line x1="120" y1="222" x2="120" y2="334" stroke="#A8C0DC" strokeWidth="1.8"/>
        {/* Buttons */}
        {[236, 260, 284, 308].map(y => (
          <circle key={y} cx="120" cy={y} r="4.5" fill="#98B4D4" stroke="#88A4C4" strokeWidth="0.8"/>
        ))}
        {/* Chest pocket */}
        <rect x="152" y="224" width="32" height="36" rx="4" fill="none" stroke="#A0B8D4" strokeWidth="1.5"/>
        <path d="M152,234 L184,234" stroke="#A0B8D4" strokeWidth="1.3"/>
        {/* Pens */}
        <rect x="158" y="214" width="5" height="20" rx="2.5" fill="#2B6CB4"/>
        <circle cx="160.5" cy="213" r="3.2" fill="#1A4E8A"/>
        <rect x="166" y="215" width="5" height="19" rx="2.5" fill="#38A169"/>
        <circle cx="168.5" cy="214" r="3.2" fill="#276749"/>
        {/* ID badge — fits narrower left panel */}
        <rect x="52" y="256" width="52" height="36" rx="5" fill="white" stroke="#A0B8D4" strokeWidth="1.5"/>
        <rect x="52" y="256" width="52" height="11" rx="5" fill="#2C7A7B"/>
        <rect x="52" y="264" width="52" height="3"  fill="#2C7A7B"/>
        <text x="78" y="278" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="bold" fill="#1A3A4A" textAnchor="middle">Dr. Jarvis</text>
        <text x="78" y="287" fontFamily="Arial,sans-serif" fontSize="5.5" fill="#718096" textAnchor="middle">AI Specialist</text>

        {/* ══ STETHOSCOPE ═════════════════════════════════════ */}
        <path d="M120,180 Q102,174 89,167 Q82,163 80,156" stroke="#1A202C" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <circle cx="78" cy="154" r="7" fill="#1A202C"/>
        <circle cx="78" cy="154" r="4" fill="#2D3748"/>
        <path d="M120,180 Q138,174 151,167 Q158,163 160,156" stroke="#1A202C" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <circle cx="162" cy="154" r="7" fill="#1A202C"/>
        <circle cx="162" cy="154" r="4" fill="#2D3748"/>
        <path d="M120,180 Q118,204 116,230 Q115,252 130,268" stroke="#2D3748" strokeWidth="5.5" fill="none" strokeLinecap="round"/>
        <circle cx="130" cy="272" r="15" fill="url(#avSt)"/>
        <circle cx="130" cy="272" r="11" fill="#2D3748"/>
        <circle cx="130" cy="272" r="6.5" fill="#4A5568"/>
        <circle cx="128" cy="270" r="2.2" fill="#718096"/>
        <circle cx="130" cy="272" r="13" fill="none" stroke="#4A5568" strokeWidth="1.2"/>

        {/* ══ LEFT SLEEVE — natural taper, no splayed fingers ═ */}
        <path d="M56,208 Q34,254 30,307 Q28,330 34,348 L58,346 Q62,328 63,305 Q68,252 82,212Z" fill="url(#avCt)"/>
        <path d="M56,208 L62,211 Q70,252 68,305 Q67,328 63,346 L58,346 Q62,328 63,305 Q68,252 82,212Z" fill="#B0C8E8" opacity="0.28"/>
        {/* Left hand — clean oval + thumb */}
        <ellipse cx="46" cy="352" rx="17" ry="12" fill="url(#avSk)"/>
        <ellipse cx="30" cy="346" rx="8" ry="6" fill="url(#avSk)" transform="rotate(-22,30,346)"/>
        <path d="M36,348 Q46,352 56,348" stroke="#C07840" strokeWidth="1.1" fill="none" opacity="0.28"/>

        {/* ══ RIGHT SLEEVE (gesture-animated) ════════════════ */}
        <g
          className={`dra-right-arm${gesture === 'wave' ? ' dra-arm-wave' : ''}`}
          style={{
            transform:       gesture !== 'wave' ? armStyle : undefined,
            transformOrigin: '184px 208px',
            transition:      gesture !== 'wave' ? 'transform 0.36s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}
        >
          <path d="M184,208 Q206,254 210,307 Q212,330 206,348 L182,346 Q178,328 177,305 Q172,252 158,212Z" fill="url(#avCt)"/>
          <path d="M184,208 L178,211 Q170,252 172,305 Q173,328 177,346 L182,346 Q178,328 177,305 Q172,252 158,212Z" fill="#B0C8E8" opacity="0.28"/>
          {/* Right hand — clean oval + thumb */}
          <ellipse cx="194" cy="352" rx="17" ry="12" fill="url(#avSk)"/>
          <ellipse cx="210" cy="346" rx="8" ry="6" fill="url(#avSk)" transform="rotate(22,210,346)"/>
          <path d="M184,348 Q194,352 204,348" stroke="#C07840" strokeWidth="1.1" fill="none" opacity="0.28"/>
          {/* Thumbs-up */}
          {gesture === 'thumbsup' && (
            <path d="M208,346 Q214,340 214,330 Q214,320 206,320 L200,320 L198,302 Q198,296 192,296 Q186,296 186,304 L184,320 L178,320 L178,352 L200,352Z" fill="url(#avSk)"/>
          )}
        </g>

        {/* ══ LEGS ════════════════════════════════════════════ */}
        <path d="M88,338 Q82,368 80,392 Q79,402 82,410 L108,410 Q108,402 108,392 Q110,368 112,338Z" fill="#2D3748"/>
        <path d="M152,338 Q158,368 160,392 Q161,402 158,410 L132,410 Q132,402 132,392 Q130,368 128,338Z" fill="#2D3748"/>
        {/* Shoes */}
        <path d="M74,406 Q94,398 112,406 L112,414 Q94,418 74,414Z" fill="#1A202C"/>
        <ellipse cx="93"  cy="410" rx="20" ry="7" fill="#1A202C"/>
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

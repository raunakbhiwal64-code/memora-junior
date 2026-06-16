// art.jsx — illustrated SVG backdrops for the ready-made palaces.
// Each scene fills the 0..100 viewBox; spot coordinates in data.jsx are
// authored to line up with the objects drawn here. Registered in ART below
// and looked up by `room.art` inside PalaceScene.

function svgWrap(children, extra) {
  return (
    <svg className="scene-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" {...(extra || {})}>
      {children}
    </svg>
  );
}

// ============================================================ PLAYHOUSE INSIDE
function PlayhouseInsideArt() {
  return svgWrap(<>
    <defs>
      <linearGradient id="ph-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D9B27E" /><stop offset="100%" stopColor="#C8995F" />
      </linearGradient>
      <radialGradient id="ph-glow" cx="74%" cy="26%" r="40%">
        <stop offset="0%" stopColor="#FBE6B0" stopOpacity="0.9" /><stop offset="100%" stopColor="#FBE6B0" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* walls + floor */}
    <rect x="0" y="0" width="100" height="64" fill="url(#ph-wall)" />
    <rect x="0" y="62" width="100" height="38" fill="#A77742" />
    <rect x="0" y="62" width="100" height="3" fill="#8A5F32" />
    {/* plank seams */}
    <g stroke="#B98C56" strokeWidth="0.5" opacity="0.6">
      <line x1="0" y1="16" x2="100" y2="16" /><line x1="0" y1="34" x2="100" y2="34" /><line x1="0" y1="50" x2="100" y2="50" />
    </g>
    <g stroke="#946231" strokeWidth="0.6" opacity="0.5">
      <line x1="20" y1="62" x2="14" y2="100" /><line x1="46" y1="62" x2="44" y2="100" /><line x1="72" y1="62" x2="78" y2="100" /><line x1="92" y1="62" x2="98" y2="100" />
    </g>
    <rect x="0" y="0" width="100" height="64" fill="url(#ph-glow)" />
    {/* bunting */}
    <path d="M4 9 Q50 16 96 9" stroke="#8A5F32" strokeWidth="0.6" fill="none" />
    {['#C8612C','#5C8A6E','#D6A23F','#3E8E9E','#CE6A8E','#7B6CB0'].map((c,i)=>(
      <path key={i} d={`M${10+i*14} ${10.5+Math.abs(i-2.5)*0.4} l5 0 l-2.5 6 z`} fill={c} />
    ))}
    {/* cuckoo clock (upper left ~16,18) */}
    <g>
      <path d="M11 13 L21 13 L16 9 Z" fill="#7E4F27" />
      <rect x="11" y="13" width="10" height="10" rx="1" fill="#9A6B3F" />
      <circle cx="16" cy="18" r="3.2" fill="#F3E7CE" /><circle cx="16" cy="18" r="3.2" fill="none" stroke="#6E4926" strokeWidth="0.5" />
      <line x1="16" y1="18" x2="16" y2="16" stroke="#3B3127" strokeWidth="0.5" /><line x1="16" y1="18" x2="17.5" y2="18" stroke="#3B3127" strokeWidth="0.5" />
    </g>
    {/* hanging lantern (~38,16) */}
    <g>
      <line x1="38" y1="0" x2="38" y2="11" stroke="#6E4926" strokeWidth="0.5" />
      <rect x="35.4" y="11" width="5.2" height="7" rx="1.4" fill="#6E4926" />
      <rect x="36.3" y="12.4" width="3.4" height="4" rx="0.6" fill="#F4C766" />
    </g>
    {/* wall drawing (~56,40) */}
    <g>
      <rect x="49" y="32" width="14" height="13" rx="1" fill="#F6EFDD" stroke="#8A5F32" strokeWidth="0.6" />
      <path d="M52 42 l3-6 l3 6 z" fill="#5C8A6E" /><circle cx="60" cy="36" r="1.6" fill="#D6A23F" />
      <path d="M51 43 q5-2 10 0" stroke="#3E8E9E" strokeWidth="0.6" fill="none" />
    </g>
    {/* round window (~74,26) */}
    <circle cx="74" cy="26" r="9" fill="#BFE0E6" stroke="#7E4F27" strokeWidth="1.4" />
    <path d="M65 26 H83 M74 17 V35" stroke="#7E4F27" strokeWidth="0.8" />
    <circle cx="71" cy="23" r="2" fill="#EAF4F2" opacity="0.7" />
    {/* toy shelf (left wall ~20,34) */}
    <g>
      <rect x="11" y="40" width="18" height="2.4" rx="0.6" fill="#7E4F27" />
      <rect x="13" y="33.5" width="3.2" height="6.5" rx="0.6" fill="#C8612C" />
      <rect x="16.6" y="34.5" width="3.2" height="5.5" rx="0.6" fill="#3E8E9E" />
      <rect x="20.2" y="33" width="3.2" height="7" rx="0.6" fill="#D6A23F" />
      <circle cx="25.5" cy="37" r="2.6" fill="#CE6A8E" />
    </g>
    {/* rug under table (~50,76) */}
    <ellipse cx="50" cy="80" rx="30" ry="9" fill="#C8612C" opacity="0.85" />
    <ellipse cx="50" cy="80" rx="22" ry="6" fill="none" stroke="#F3E7CE" strokeWidth="0.8" opacity="0.7" />
    {/* little table (~50,70) */}
    <g>
      <ellipse cx="50" cy="69" rx="11" ry="3.4" fill="#B98352" />
      <ellipse cx="50" cy="68" rx="11" ry="3.4" fill="#CFA56C" />
      <rect x="42" y="70" width="1.6" height="8" fill="#8A5F32" /><rect x="56.4" y="70" width="1.6" height="8" fill="#8A5F32" />
    </g>
    {/* crayon box (~62,72 on/near table) */}
    <g>
      <rect x="58" y="64.5" width="9" height="4" rx="0.8" fill="#7E4F27" />
      {['#C8612C','#5C8A6E','#D6A23F','#3E8E9E','#CE6A8E'].map((c,i)=>(
        <rect key={i} x={58.8+i*1.6} y="62.4" width="1.1" height="2.6" rx="0.4" fill={c} />
      ))}
    </g>
    {/* teddy bear (~26,74) */}
    <g>
      <circle cx="26" cy="71" r="3.4" fill="#B5743C" /><circle cx="23.6" cy="68.4" r="1.3" fill="#B5743C" /><circle cx="28.4" cy="68.4" r="1.3" fill="#B5743C" />
      <ellipse cx="26" cy="77" rx="4" ry="4.6" fill="#C2854A" />
      <circle cx="24.8" cy="70.6" r="0.5" fill="#3B3127" /><circle cx="27.2" cy="70.6" r="0.5" fill="#3B3127" /><circle cx="26" cy="72" r="0.6" fill="#3B3127" />
    </g>
    {/* cushion pile (~38,82) */}
    <g>
      <rect x="31" y="82" width="12" height="6" rx="2.4" fill="#5C8A6E" transform="rotate(-6 37 85)" />
      <rect x="33" y="79" width="11" height="5.6" rx="2.4" fill="#D6A23F" transform="rotate(5 38 82)" />
    </g>
    {/* beanbag (~76,78) */}
    <path d="M68 86 Q66 74 76 73 Q86 74 84 86 Z" fill="#3E8E9E" />
    <path d="M70 84 Q76 80 82 84" stroke="#2B5C7A" strokeWidth="0.6" fill="none" opacity="0.6" />
    {/* welcome hatch/mat (~50,90) */}
    <ellipse cx="50" cy="92" rx="9" ry="3.2" fill="#8A5F32" />
    <ellipse cx="50" cy="92" rx="6" ry="2" fill="#C8612C" opacity="0.7" />
  </>);
}

// ============================================================ GARDEN BELOW
function GardenArt() {
  return svgWrap(<>
    <defs>
      <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#BFE0E6" /><stop offset="100%" stopColor="#E8F1D6" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100" height="58" fill="url(#g-sky)" />
    <circle cx="84" cy="14" r="8" fill="#F7DE8E" opacity="0.85" />
    <ellipse cx="22" cy="13" rx="11" ry="5" fill="#FBF6EC" opacity="0.85" /><ellipse cx="32" cy="12" rx="8" ry="4" fill="#FBF6EC" opacity="0.85" />
    <path d="M0 54 Q30 48 60 54 T100 52 V100 H0 Z" fill="#8FA85C" />
    <path d="M0 70 Q40 64 100 72 V100 H0 Z" fill="#7B9A4C" />
    {/* big tree trunk + canopy on right (swing hangs from it) */}
    <path d="M70 58 L72 30 Q73 26 78 26 L80 26 Q76 30 76 36 L78 58 Z" fill="#9A6B3F" />
    <g><circle cx="74" cy="22" r="13" fill="#7FA257" /><circle cx="86" cy="26" r="10" fill="#A1C079" /><circle cx="64" cy="26" r="9" fill="#8FB060" /></g>
    {/* garden gate (left ~12,60) */}
    <g stroke="#C8995F" strokeWidth="1.4">
      <line x1="7" y1="50" x2="7" y2="70" /><line x1="17" y1="50" x2="17" y2="70" />
      <line x1="5" y1="55" x2="19" y2="55" /><line x1="5" y1="62" x2="19" y2="62" />
    </g>
    {/* flower bed (bottom left ~24,84) */}
    <g>
      {[[19,84,'#CE6A8E'],[24,86,'#D6A23F'],[29,84,'#7B6CB0'],[21,88,'#C8612C']].map(([x,y,c],i)=>(
        <g key={i}><line x1={x} y1={y} x2={x} y2={y+5} stroke="#5C8A4E" strokeWidth="0.7" /><circle cx={x} cy={y} r="2.2" fill={c} /><circle cx={x} cy={y} r="0.8" fill="#F7DE8E" /></g>
      ))}
    </g>
    {/* watering can (~38,78) */}
    <g>
      <rect x="35" y="76" width="7" height="6" rx="1.4" fill="#3E8E9E" />
      <path d="M42 77 l4-2" stroke="#2B5C7A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M35 77 q-3 0 -3 3" stroke="#2B5C7A" strokeWidth="1" fill="none" />
    </g>
    {/* veggie patch (~58,80) */}
    <g>
      <rect x="50" y="80" width="16" height="6" rx="1" fill="#8A5F32" />
      {[0,1,2,3].map(i=>(<g key={i}><path d={`M${52.5+i*3.4} 80 q0-3 1.5-4`} stroke="#5C8A4E" strokeWidth="0.7" fill="none" /><circle cx={52.5+i*3.4} cy="79" r="1.2" fill="#C8612C" /></g>))}
    </g>
    {/* picnic blanket (center ~52,86) */}
    <g>
      <path d="M40 90 L52 82 L66 90 L54 96 Z" fill="#C8612C" opacity="0.9" />
      <path d="M46 86 L58 92 M52 82 L48 94" stroke="#F3E7CE" strokeWidth="0.6" opacity="0.7" />
    </g>
    {/* rope swing (hangs from branch ~66,46) */}
    <g stroke="#8A5F32" strokeWidth="0.7">
      <line x1="63" y1="33" x2="62" y2="46" /><line x1="69" y1="33" x2="70" y2="46" />
    </g>
    <rect x="60" y="46" width="12" height="2.6" rx="0.8" fill="#9A6B3F" />
    {/* mushroom ring (~40,90) */}
    <g>
      {[36,40,44].map((x,i)=>(<g key={i}><rect x={x-0.7} y={90} width="1.6" height="3" rx="0.6" fill="#F3E7CE" /><ellipse cx={x} cy={90} rx="2.2" ry="1.4" fill="#CE5A5A" /><circle cx={x-0.6} cy={89.6} r="0.4" fill="#FBF6EC" /></g>))}
    </g>
    {/* wheelbarrow (~72,74) */}
    <g>
      <path d="M66 70 L78 70 L75 76 L68 76 Z" fill="#C8612C" />
      <circle cx="69" cy="78" r="2.4" fill="#5A4530" /><circle cx="69" cy="78" r="1" fill="#8A5F32" />
      <line x1="78" y1="70" x2="82" y2="72" stroke="#7E4F27" strokeWidth="1" />
    </g>
    {/* little pond (bottom right ~80,88) */}
    <g>
      <ellipse cx="80" cy="89" rx="10" ry="4.4" fill="#3E8E9E" />
      <ellipse cx="80" cy="88" rx="10" ry="4.4" fill="#5BA8B8" opacity="0.7" />
      <ellipse cx="77" cy="88" rx="2.2" ry="1" fill="#7FBEC9" opacity="0.7" /><circle cx="83" cy="88.5" r="1.4" fill="#6FA24C" />
    </g>
    {/* birdhouse on post (upper right ~86,40) */}
    <g>
      <rect x="85.3" y="44" width="1.6" height="14" fill="#8A5F32" />
      <rect x="82" y="38" width="8" height="6" rx="0.6" fill="#C8732F" /><path d="M82 38 L86 34 L90 38 Z" fill="#A4481C" />
      <circle cx="86" cy="41" r="1.4" fill="#3B3127" />
    </g>
  </>);
}

// ============================================================ AQUARIUM TANK
function AquariumTankArt() {
  return svgWrap(<>
    <defs>
      <linearGradient id="aq-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2E7E96" /><stop offset="55%" stopColor="#1F5E7E" /><stop offset="100%" stopColor="#143F5C" />
      </linearGradient>
      <radialGradient id="aq-light" cx="50%" cy="0%" r="80%">
        <stop offset="0%" stopColor="#9FE3EC" stopOpacity="0.55" /><stop offset="100%" stopColor="#9FE3EC" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="100" height="100" fill="url(#aq-water)" />
    <rect x="0" y="0" width="100" height="100" fill="url(#aq-light)" />
    {/* light beams */}
    <g opacity="0.18" fill="#CDEFF5"><path d="M30 0 L40 0 L24 60 L16 60 Z" /><path d="M60 0 L72 0 L60 60 L50 60 Z" /></g>
    {/* big glass frame (~50,30) */}
    <rect x="6" y="6" width="88" height="74" rx="4" fill="none" stroke="#0E2F44" strokeWidth="3" opacity="0.5" />
    <rect x="6" y="6" width="88" height="74" rx="4" fill="none" stroke="#7FD0DD" strokeWidth="0.8" opacity="0.5" />
    {/* manta ray (~58,20) */}
    <g fill="#22556E"><path d="M48 20 Q58 12 68 20 Q60 24 58 24 Q56 24 48 20 Z" /><line x1="58" y1="23" x2="60" y2="30" stroke="#22556E" strokeWidth="0.8" /></g>
    {/* jellyfish (~30,28) */}
    <g><path d="M25 26 Q30 22 35 26 Q34 30 30 30 Q26 30 25 26 Z" fill="#CE6A8E" opacity="0.85" /><g stroke="#CE6A8E" strokeWidth="0.6" opacity="0.7"><path d="M27 29 q-1 4 0 7" fill="none" /><path d="M30 30 q0 4 0 7" fill="none" /><path d="M33 29 q1 4 0 7" fill="none" /></g></g>
    {/* fish */}
    {[[42,46,'#E2A33E'],[64,52,'#D9663A'],[24,52,'#6FB7C4']].map(([x,y,c],i)=>(
      <g key={i}><ellipse cx={x} cy={y} rx="3.4" ry="2" fill={c} /><path d={`M${x+3.4} ${y} l3 -2 l0 4 z`} fill={c} /><circle cx={x-1.5} cy={y-0.4} r="0.5" fill="#0E2F44" /></g>
    ))}
    {/* starfish on glass (~78,40) */}
    <g transform="translate(78 40)" fill="#E48A3C"><path d="M0 -4 L1.2 -1.2 L4 -1.2 L1.8 0.6 L2.6 3.6 L0 1.8 L-2.6 3.6 L-1.8 0.6 L-4 -1.2 L-1.2 -1.2 Z" /></g>
    {/* seaweed forest (left ~20,72) */}
    <g stroke="#3C7A3E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9">
      <path d="M16 86 q-3 -8 1 -14 q-3 -6 0 -10" /><path d="M22 86 q3 -7 -1 -13 q3 -5 0 -9" /><path d="M19 86 q0 -10 0 -16" />
    </g>
    {/* sunken ship (~38,84) */}
    <g><path d="M28 86 Q38 90 50 86 L48 80 L31 80 Z" fill="#5A4530" /><line x1="40" y1="80" x2="40" y2="70" stroke="#3B2C1C" strokeWidth="0.8" /><path d="M40 71 l6 3 l-6 2 z" fill="#8A5F32" /></g>
    {/* coral reef (center ~46,82) */}
    <g><path d="M42 88 q-2 -8 0 -10 q2 2 1 6 q3 -6 4 -2 q1 4 -1 6 z" fill="#D9663A" /><circle cx="50" cy="86" r="2" fill="#CE6A8E" /><circle cx="53" cy="88" r="1.4" fill="#E2A33E" /></g>
    {/* treasure chest (~66,86) */}
    <g><rect x="61" y="84" width="11" height="6" rx="0.8" fill="#7E4F27" /><path d="M61 84 Q66.5 80 72 84" fill="#9A6B3F" /><rect x="65.5" y="85.5" width="2" height="2.4" rx="0.4" fill="#F4C766" /></g>
    {/* clam (bottom right ~84,86) */}
    <g><path d="M78 88 Q84 82 90 88 Z" fill="#CE9DB0" /><path d="M78 88 Q84 86 90 88" stroke="#A86F86" strokeWidth="0.6" fill="none" /><circle cx="84" cy="87" r="1" fill="#F3E7CE" /></g>
    {/* ticket gate (bottom left ~12,82) */}
    <g><rect x="6" y="80" width="12" height="8" rx="1" fill="#0E2F44" opacity="0.6" /><rect x="7.4" y="81.4" width="9.2" height="3" rx="0.6" fill="#7FD0DD" opacity="0.6" /></g>
    {/* bubbles */}
    <g fill="#CDEFF5" opacity="0.5"><circle cx="70" cy="40" r="1.2" /><circle cx="72" cy="34" r="0.8" /><circle cx="68" cy="30" r="1" /><circle cx="34" cy="60" r="1" /></g>
  </>);
}

// ============================================================ AQUARIUM TUNNEL
function AquariumTunnelArt() {
  return svgWrap(<>
    <defs>
      <linearGradient id="tn-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2E7E96" /><stop offset="100%" stopColor="#16465F" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100" height="100" fill="url(#tn-water)" />
    {/* arched tunnel glass */}
    <path d="M8 100 L8 46 Q50 6 92 46 L92 100 Z" fill="#3E96AC" opacity="0.35" />
    <path d="M8 46 Q50 6 92 46" fill="none" stroke="#BFEAF1" strokeWidth="1.2" opacity="0.7" />
    {/* glowing ceiling (~50,14) */}
    <ellipse cx="50" cy="14" rx="18" ry="6" fill="#BFEAF1" opacity="0.45" />
    {/* walkway floor */}
    <path d="M8 100 L8 86 Q50 78 92 86 L92 100 Z" fill="#0E3346" />
    <path d="M20 100 L42 86 M50 100 L50 84 M80 100 L58 86" stroke="#15506A" strokeWidth="1" opacity="0.6" />
    {/* tunnel entrance (left ~14,50) */}
    <g><rect x="6" y="44" width="6" height="40" rx="1" fill="#0E3346" /><rect x="7" y="48" width="4" height="10" rx="1" fill="#3E96AC" opacity="0.6" /></g>
    {/* exit door (right ~86,56) */}
    <g><rect x="84" y="48" width="8" height="40" rx="1" fill="#0E3346" /><rect x="85.2" y="50" width="3" height="9" rx="1" fill="#7FD0DD" opacity="0.6" /><text x="88" y="46" fontSize="3" fill="#BFEAF1" textAnchor="middle" fontFamily="sans-serif">EXIT</text></g>
    {/* shark overhead (~62,24) */}
    <g fill="#1D4E66"><path d="M52 24 Q62 18 74 23 Q66 27 62 27 Q57 27 52 24 Z" /><path d="M74 23 l5 -1 l-3 4 z" /><path d="M61 26 l-1 4 l3 -3 z" /></g>
    {/* turtle (right ~78,40) */}
    <g><ellipse cx="78" cy="40" rx="5" ry="3.6" fill="#3C7A56" /><path d="M78 36.6 l1.6 3.4 l-3.2 0 z" fill="#2C5C40" /><circle cx="73" cy="40" r="1.4" fill="#3C7A56" /><ellipse cx="80" cy="37.5" rx="1.6" ry="0.9" fill="#2C5C40" transform="rotate(30 80 37.5)" /></g>
    {/* fish school */}
    {[[34,34,'#E2A33E'],[40,40,'#D9663A'],[46,32,'#6FB7C4'],[30,44,'#E2A33E']].map(([x,y,c],i)=>(
      <g key={i}><ellipse cx={x} cy={y} rx="2.6" ry="1.5" fill={c} /><path d={`M${x+2.6} ${y} l2 -1.4 l0 2.8 z`} fill={c} /></g>
    ))}
    {/* bubble column (left ~26,62) */}
    <g fill="#BFEAF1" opacity="0.5"><circle cx="26" cy="64" r="1.4" /><circle cx="27" cy="58" r="1" /><circle cx="25" cy="52" r="1.2" /><circle cx="26" cy="46" r="0.8" /></g>
    {/* info screen (~20,76) */}
    <g><rect x="14" y="71" width="12" height="9" rx="1" fill="#0B2A3A" stroke="#3E96AC" strokeWidth="0.6" /><rect x="15.2" y="72.4" width="9.6" height="4.6" rx="0.4" fill="#3E96AC" opacity="0.5" /><circle cx="20" cy="78.4" r="0.7" fill="#7FD0DD" /></g>
    {/* bench (~50,84) */}
    <g><rect x="42" y="83" width="16" height="2.4" rx="0.8" fill="#5A4530" /><rect x="43" y="85.4" width="1.6" height="4" fill="#3B2C1C" /><rect x="55.4" y="85.4" width="1.6" height="4" fill="#3B2C1C" /></g>
  </>);
}

// ============================================================ HOUSE: perspective rooms
// One-point perspective — back wall rect (26,14)→(74,52), VP ≈ (50,33).
// Left wall:  polygon (0,0)-(26,14)-(26,52)-(0,100)
// Right wall: polygon (100,0)-(74,14)-(74,52)-(100,100)
// Floor:      polygon (0,100)-(26,52)-(74,52)-(100,100)
// Ceiling:    polygon (0,0)-(26,14)-(74,14)-(100,0)
// Spot coords already fit: back-wall x≈30-70 y≈15-52, left x<26, right x>74, floor y>52.

// shared perspective shell (walls + floor + edges)
function perspShell({ bk, lw, rw, fl }) {
  const planks = [12,24,36,50,64,76,88].map((x,i)=>(
    <line key={i} x1={x} y1={100} x2={26+(x/100)*48} y2={52} stroke="rgba(0,0,0,0.08)" strokeWidth="0.45"/>
  ));
  const hlines = [58,66,75,84,93].map((y,i)=>{
    const t=(y-52)/48; const xl=26*(1-t);
    return <line key={i} x1={xl} y1={y} x2={100-xl} y2={y} stroke="rgba(0,0,0,0.055)" strokeWidth="0.3"/>;
  });
  return (<>
    <polygon points="0,0 26,14 74,14 100,0" fill={fl[1]}/>
    <rect x="26" y="14" width="48" height="38" fill={bk}/>
    <polygon points="0,0 26,14 26,52 0,100" fill={lw}/>
    <polygon points="100,0 74,14 74,52 100,100" fill={rw}/>
    <polygon points="0,100 26,52 74,52 100,100" fill={fl[0]}/>
    {planks}{hlines}
    <line x1="26" y1="14" x2="26" y2="52" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8"/>
    <line x1="74" y1="14" x2="74" y2="52" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8"/>
    <line x1="26" y1="52" x2="74" y2="52" stroke="rgba(0,0,0,0.28)" strokeWidth="0.6"/>
    <line x1="0" y1="100" x2="26" y2="52" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5"/>
    <line x1="100" y1="100" x2="74" y2="52" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5"/>
    <line x1="0" y1="0" x2="26" y2="14" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4"/>
    <line x1="100" y1="0" x2="74" y2="14" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4"/>
    <polygon points="0,0 26,14 74,14 100,0 100,1.6 74,15.5 26,15.5 0,1.6" fill="rgba(0,0,0,0.08)"/>
  </>);
}

function HouseLivingArt() {
  return svgWrap(<>
    <defs>
      <radialGradient id="lv-fire" cx="29%" cy="52%" r="24%"><stop offset="0%" stopColor="#FF8800" stopOpacity="0.32"/><stop offset="100%" stopOpacity="0"/></radialGradient>
      <radialGradient id="lv-lamp" cx="83%" cy="44%" r="18%"><stop offset="0%" stopColor="#FFE080" stopOpacity="0.45"/><stop offset="100%" stopOpacity="0"/></radialGradient>
    </defs>
    {perspShell({ bk:'#EDE6D4', lw:'#CBBFA0', rw:'#D3C7A6', fl:['#B87848','#F2EBE0'] })}
    <polygon points="0,0 100,0 100,100 0,100" fill="url(#lv-fire)"/>
    <polygon points="0,0 100,0 100,100 0,100" fill="url(#lv-lamp)"/>
    {/* baseboard */}
    <polygon points="0,97 26,52 26,53.5 0,100" fill="#9A7040" opacity="0.6"/>
    <polygon points="100,97 74,52 74,53.5 100,100" fill="#8A6030" opacity="0.6"/>
    <line x1="26" y1="52" x2="74" y2="52" stroke="#8A6030" strokeWidth="0.7" opacity="0.6"/>

    {/* CLOCK (50,16) back wall */}
    <circle cx="50" cy="16" r="3.9" fill="#252010"/><circle cx="50" cy="16" r="3.4" fill="#F8F2E8"/>
    {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{const a=i*Math.PI/6-Math.PI/2;const r0=i%3===0?2.8:3.05;return<line key={i} x1={50+Math.cos(a)*r0} y1={16+Math.sin(a)*r0} x2={50+Math.cos(a)*3.2} y2={16+Math.sin(a)*3.2} stroke="#252010" strokeWidth={i%3===0?0.55:0.22}/>;});}
    <line x1="50" y1="16" x2="50" y2="13.4" stroke="#252010" strokeWidth="0.5"/>
    <line x1="50" y1="16" x2="51.8" y2="16.4" stroke="#252010" strokeWidth="0.35"/>
    <circle cx="50" cy="16" r="0.4" fill="#252010"/>

    {/* TV (50,33) back wall */}
    <rect x="37" y="26" width="26" height="15" rx="0.8" fill="#141418"/>
    <rect x="38.2" y="27" width="23.6" height="12.5" rx="0.3" fill="#1C3A52"/>
    <path d="M38.2 32 q6-3 12-2 q5.5 1 11.6 2" fill="#2A5068" opacity="0.75"/>
    <rect x="38.2" y="33" width="23.6" height="6.5" fill="#1A2C3A"/>
    <path d="M39 27.5 L44 30 L42 27.2 Z" fill="rgba(255,255,255,0.1)"/>
    <rect x="48.5" y="41" width="3" height="1.5" fill="#141418"/>
    <rect x="45.5" y="42.5" width="9" height="1" rx="0.3" fill="#141418"/>

    {/* FIREPLACE (30,50) back wall lower-left */}
    <rect x="21" y="37" width="13" height="15" rx="0.4" fill="#C6A882"/>
    <rect x="22.5" y="38" width="10" height="13.5" rx="0.3" fill="#B09070"/>
    {[[22.5,39,4],[26,39,3],[22.5,41,3],[25.5,41,4],[22.5,43,4],[26,43,3]].map(([x,y,w],i)=>(
      <rect key={i} x={x} y={y} width={w} height="1.6" rx="0.2" fill="rgba(140,100,60,0.4)"/>
    ))}
    <rect x="20.5" y="36.5" width="14" height="1.5" rx="0.3" fill="#C8A06A"/>
    <rect x="21" y="36.8" width="13" height="0.6" rx="0.2" fill="#DEBA88"/>
    <rect x="24.5" y="43" width="8" height="9" rx="0.6" fill="#150E06"/>
    <path d="M26.5 52 q-1-3.5 0.4-6 q0.7 2.5 1.3 1 q0.6 2.5 1.4 1 q0.5 2 0.4 5 z" fill="#D96820"/>
    <path d="M27.2 52 q0-2.5 0.7-4.5 q0.5 2 0.9 0.8 q0.4 2 0.4 3.7 z" fill="#F4B830"/>
    <rect x="23.5" y="51.5" width="10" height="1.2" rx="0.2" fill="#B09878"/>
    <rect x="22" y="35.5" width="1.8" height="1.2" rx="0.3" fill="#4A7854"/>
    <rect x="33" y="35.5" width="1.8" height="1.2" rx="0.3" fill="#CE6A8E"/>

    {/* FRONT DOOR (12,52) left wall — skewed parallelogram */}
    <polygon points="4.5,54 15.5,40 15.5,91.5 4.5,98" fill="#7A5230"/>
    <polygon points="5.8,55.5 14.2,43 14.2,90.5 5.8,97" fill="#9E7454"/>
    <polygon points="6.8,57 13.2,47 13.2,63 6.8,66" fill="rgba(0,0,0,0.12)"/>
    <polygon points="6.8,67.5 13.2,65 13.2,88.5 6.8,90" fill="rgba(0,0,0,0.12)"/>
    <polygon points="6.8,57 13.2,47 13.6,47.8 7.2,58" fill="rgba(255,255,255,0.15)"/>
    <polygon points="6.8,67.5 13.2,65 13.6,65.6 7.2,68" fill="rgba(255,255,255,0.12)"/>
    <circle cx="13.4" cy="73" r="1.1" fill="#C89030"/><circle cx="13.1" cy="72.7" r="0.5" fill="#E4A840"/>
    <polygon points="4.5,54 5.8,55.5 5.8,97 4.5,98" fill="rgba(0,0,0,0.14)"/>
    <polygon points="15.5,40 16.5,39 16.5,91 15.5,91.5" fill="rgba(0,0,0,0.12)"/>
    <polygon points="4.5,53 16.5,38.5 15.5,40 4.5,54" fill="rgba(0,0,0,0.14)"/>

    {/* BOOKSHELF (80,34) right wall — skewed */}
    <polygon points="74,21 88.5,26 88.5,51.5 74,47" fill="#6A4820"/>
    <polygon points="74,21 88.5,26 88.5,27.2 74,22.2" fill="#8A6030"/>
    {[30.5,37.5,43.5].map((y,i)=><polygon key={i} points={`74,${y} 88.5,${y+2} 88.5,${y+2.7} 74,${y+0.7}`} fill="#503416"/>)}
    {[{y1:22,y2:30.5,c:['#C8612C','#5C8A6E','#D6A23F','#3E8E9E','#CE6A8E']},
      {y1:31,y2:37.5,c:['#7B6CB0','#C8612C','#5C8A6E','#D6A23F']},
      {y1:38,y2:43.5,c:['#3E8E9E','#CE6A8E','#C8612C','#5C8A6E']}
    ].map(({y1,y2,c},ri)=>c.map((col,ci)=>(
      <polygon key={ci} points={`${74+ci*3.5},${y1+0.5} ${74+ci*3.5+3.1},${y1+0.9} ${74+ci*3.5+3.1},${y2-0.5} ${74+ci*3.5},${y2-0.9}`} fill={col}/>
    )))}

    {/* FLOOR LAMP (82,54) right wall */}
    <line x1="84" y1="43" x2="84" y2="63" stroke="#4A3018" strokeWidth="1.4"/>
    <ellipse cx="84" cy="63.5" rx="3.5" ry="1" fill="#3A2010"/>
    <polygon points="79.5,41.5 89.5,42 88,47 81,46.5" fill="#E4C464"/>
    <polygon points="79.5,41.5 89.5,42 89.5,42.9 79.5,42.4" fill="#C8A030"/>

    {/* AREA RUG */}
    <polygon points="24,81 76,81 79,97 21,97" fill="#5C6A4A" opacity="0.6"/>
    <polygon points="27,82 73,82 76,96 24,96" fill="none" stroke="#E8D8B8" strokeWidth="0.6" opacity="0.65"/>
    <polygon points="31,83.5 69,83.5 72,95 28,95" fill="none" stroke="#E8D8B8" strokeWidth="0.35" opacity="0.45"/>

    {/* SOFA (48,78) */}
    <polygon points="26,65 74,65 76,74 24,74" fill="#466678"/>
    <polygon points="27,63 50,63 51.5,65 25.5,65" fill="#527888"/>
    <polygon points="50,63 73,63 74.5,65 51.5,65" fill="#527888"/>
    <polygon points="27,63 73,63 73.5,63.8 26.5,63.8" fill="rgba(255,255,255,0.1)"/>
    <polygon points="24,74 76,74 78,86 22,86" fill="#4A6A7A"/>
    <line x1="50" y1="74" x2="50.5" y2="86" stroke="rgba(0,0,0,0.14)" strokeWidth="0.6"/>
    <polygon points="24,66 28,63 28,86 24,86" fill="#3A5668"/>
    <polygon points="72,63 76,66 76,86 72,86" fill="#3A5668"/>
    <rect x="25" y="86" width="3" height="4" rx="0.5" fill="#2A1A0A"/>
    <rect x="72" y="86" width="3" height="4" rx="0.5" fill="#2A1A0A"/>
    <polygon points="33,63 45,63 46,65.5 34,65.5" fill="#D6A23F"/>

    {/* HOUSEPLANT (24,64) left floor */}
    <polygon points="16.5,74.5 27,74.5 25.5,79 18,79" fill="#C8612C"/>
    <ellipse cx="21.8" cy="74.5" rx="5.2" ry="1.6" fill="#A84C18"/>
    <ellipse cx="21.8" cy="74.5" rx="3.5" ry="1" fill="#2A1408"/>
    <path d="M22 74 q-10-5-7-17 q3 7 3 10 z" fill="#367A28"/>
    <path d="M22 74 q-5-12-1-17 q2 7 2 10 z" fill="#4A8C38"/>
    <path d="M22 74 q4-10 7-14 q-1 5-1 9 z" fill="#367A28"/>
    <path d="M22 74 q9-5 10-11 q-3 5-4 8 z" fill="#2A6420"/>
  </>);
}

function HouseKitchenArt() {
  return svgWrap(<>
    <defs>
      <radialGradient id="kit-win" cx="80%" cy="32%" r="30%"><stop offset="0%" stopColor="#FFFBE0" stopOpacity="0.55"/><stop offset="100%" stopOpacity="0"/></radialGradient>
    </defs>
    {perspShell({ bk:'#F0EDE4', lw:'#D8D3C8', rw:'#E2DDD4', fl:['#CCC0AA','#FAFAF6'] })}
    {/* tile floor */}
    {[58,66,75,84,93].map((y,i)=>{
      const t=(y-52)/48; const xl=26*(1-t); const xr=100-xl; const w=(xr-xl)/5;
      return [0,1,2,3,4].map(j=>(
        <rect key={j} x={xl+j*w} y={y} width={w} height={y<93?(93-y)/5:4} fill={((i+j)%2===0)?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)'} stroke="rgba(0,0,0,0.05)" strokeWidth="0.2"/>
      ));
    })}
    <polygon points="0,0 100,0 100,100 0,100" fill="url(#kit-win)"/>

    {/* COUNTER top surface — runs across back wall base and into side walls */}
    <polygon points="0,85 26,52 74,52 100,85 100,89 74,56 26,56 0,89" fill="#D4C4A4"/>
    <polygon points="0,85 26,52 74,52 100,85 100,86.5 74,53.5 26,53.5 0,86.5" fill="#E8D8B8"/>
    {/* Cabinet doors below counter */}
    <polygon points="0,89 26,56 74,56 100,89 100,100 74,100 26,100 0,100" fill="#C4B090"/>
    {[0,1,2].map(i=>{
      const x1=28+i*16; const x2=x1+14; const y1=57.5+i*0.4; const y2=57.5+(i+1)*0.4;
      return <polygon key={i} points={`${x1},${y1} ${x2},${y1+0.2} ${x2},${y1+10} ${x1},${y1+9.8}`} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5"/>;
    })}
    {/* Cabinet handles */}
    {[34,50,66].map((x,i)=><circle key={i} cx={x} cy={62+i*0.2} r="0.7" fill="#A88848"/>)}

    {/* HANGING POTS (50,14) back wall upper */}
    <line x1="36" y1="2" x2="64" y2="2" stroke="#6A4820" strokeWidth="0.7"/>
    <rect x="35.5" y="1.8" width="1" height="0.8" fill="#8A5A28"/>
    <rect x="63.5" y="1.8" width="1" height="0.8" fill="#8A5A28"/>
    {[40,50,60].map((x,i)=>(<g key={i}>
      <line x1={x} y1="2" x2={x+i*0.5-0.5} y2="8" stroke="#606060" strokeWidth="0.45"/>
      <path d={`M${x-3+i*0.5} 8 a3 3 0 0 0 6 0 z`} fill="#3A3A40"/>
      <ellipse cx={x+i*0.5} cy="8" rx="3" ry="0.7" fill="#4A4A52"/>
    </g>))}

    {/* FRIDGE (16,46) left wall */}
    <polygon points="5,34 19.5,23 19.5,65 5,72" fill="#EEEEF2"/>
    <polygon points="5,34 19.5,23 19.5,65 5,72" fill="none" stroke="#C0C0CC" strokeWidth="0.5"/>
    <polygon points="5,46 19.5,40 19.5,41.5 5,47.5" fill="#C0C0CC"/>
    <polygon points="16,24.5 18,23.8 18,39.5 16,40" fill="#9A9AA6"/>
    <polygon points="16,41.5 18,40.8 18,63.5 16,64" fill="#9A9AA6"/>

    {/* WINDOW (80,33) right wall — bright with sunlight */}
    <polygon points="74,20 91,25 91,44 74,39" fill="#C8E8F4"/>
    <polygon points="74,20 91,25 91,26.5 74,21.5" fill="#7A5230"/>
    <polygon points="74,20 74,39 73,39 73,20" fill="#7A5230"/>
    <polygon points="91,25 92,25 92,44.5 91,44" fill="#5A3810"/>
    <polygon points="82,20.5 82.5,21 82.5,44 82,43.5" fill="#7A5230" strokeWidth="0.4"/>
    <polygon points="74,30 91,32.5 91,33.5 74,31" fill="#7A5230" strokeWidth="0.4"/>
    <circle cx="88" cy="28" r="3.5" fill="#F7E080" opacity="0.7"/>
    <polygon points="74,20 91,25 91,44 74,39" fill="rgba(255,250,220,0.22)"/>

    {/* STOVE (38,53) on back counter */}
    <rect x="30" y="48" width="16" height="5" fill="#303038"/>
    <circle cx="34" cy="50.5" r="2" fill="#242428"/><circle cx="34" cy="50.5" r="1.4" fill="#1A1A1E"/>
    <circle cx="42" cy="50.5" r="2" fill="#242428"/><circle cx="42" cy="50.5" r="1.4" fill="#D94020" opacity="0.7"/>
    <rect x="30" y="46.5" width="16" height="1.5" fill="#404048"/>

    {/* SINK (54,58) on counter */}
    <rect x="49" y="53" width="10" height="0.8" fill="#C8C0A8" opacity="0.5"/>
    <rect x="50" y="53.5" width="8" height="3.5" rx="0.4" fill="#9AA0A8"/>
    <rect x="51.5" y="53.8" width="5" height="2.8" rx="0.3" fill="#7A8890"/>
    <path d="M54.5 53.2 q0.5-3 1.5-3" stroke="#8A8A92" strokeWidth="0.7" fill="none" strokeLinecap="round"/>

    {/* FRUIT BOWL (66,54) */}
    <path d="M62 54.5 a4.5 4.5 0 0 0 9 0 z" fill="#C8612C" opacity="0.9"/>
    <circle cx="64.5" cy="53" r="1.5" fill="#D6A23F"/><circle cx="67.5" cy="52.5" r="1.7" fill="#CE5A5A"/><circle cx="70" cy="53" r="1.3" fill="#5C8A4E"/>

    {/* KETTLE (78,53) on right counter */}
    <polygon points="75,52.5 81,52.8 80,57 76,56.8" fill="#404048"/>
    <polygon points="76.5,50.5 80,50.7 80.5,52.8 76,52.5" fill="#4A4A52"/>
    <line x1="81" y1="53.5" x2="83.5" y2="52.5" stroke="#303038" strokeWidth="0.8" strokeLinecap="round"/>

    {/* KITCHEN TABLE (50,84) floor foreground — seen from slightly above */}
    <ellipse cx="50" cy="84" rx="18" ry="5.5" fill="#9A6B3F"/>
    <ellipse cx="50" cy="83" rx="18" ry="5.5" fill="#B48050"/>
    <ellipse cx="50" cy="83" rx="17.5" ry="5" fill="#C49060" opacity="0.5"/>
    {/* legs */}
    <line x1="35" y1="85" x2="34" y2="96" stroke="#7A5030" strokeWidth="1.4"/>
    <line x1="65" y1="85" x2="66" y2="96" stroke="#7A5030" strokeWidth="1.4"/>
    {/* table items */}
    <ellipse cx="44" cy="82.5" rx="3.5" ry="2" fill="#E8E0D0" opacity="0.7"/>
    <circle cx="57" cy="82" r="2" fill="#CE6A8E" opacity="0.6"/>
  </>);
}

function HouseBedroomArt() {
  return svgWrap(<>
    <defs>
      <radialGradient id="bed-win" cx="52%" cy="24%" r="28%"><stop offset="0%" stopColor="#E8F4FF" stopOpacity="0.6"/><stop offset="100%" stopOpacity="0"/></radialGradient>
      <radialGradient id="bed-lamp" cx="30%" cy="52%" r="22%"><stop offset="0%" stopColor="#FFE880" stopOpacity="0.4"/><stop offset="100%" stopOpacity="0"/></radialGradient>
    </defs>
    {perspShell({ bk:'#DDDAE8', lw:'#C6C2D4', rw:'#CECAD8', fl:['#C8B8A0','#EEEAE6'] })}
    {/* carpet texture */}
    {[58,67,77,88].map((y,i)=>{const t=(y-52)/48;const xl=26*(1-t); return(
      <line key={i} x1={xl+2} y1={y} x2={100-xl-2} y2={y} stroke="rgba(160,140,120,0.3)" strokeWidth="0.6" strokeDasharray="0.8 1.2"/>
    );})}
    <polygon points="0,0 100,0 100,100 0,100" fill="url(#bed-win)"/>
    <polygon points="0,0 100,0 100,100 0,100" fill="url(#bed-lamp)"/>

    {/* WINDOW (52,25) back wall center with curtains */}
    <rect x="37" y="15" width="26" height="22" rx="0.5" fill="#C8E0F4"/>
    <rect x="37" y="15" width="26" height="22" rx="0.5" fill="rgba(255,250,235,0.3)"/>
    <path d="M37 15 V37 M50 15 V37 M63 15 V37" stroke="#8A6A40" strokeWidth="0.7"/>
    <path d="M37 26 H63" stroke="#8A6A40" strokeWidth="0.6"/>
    {/* curtains */}
    <path d="M35 14 q3 4 2 24 l3 0 q-2-20 0-24 z" fill="#C87878" opacity="0.85"/>
    <path d="M65 14 q-3 4-2 24 l-3 0 q2-20 0-24 z" fill="#C87878" opacity="0.85"/>
    <line x1="33" y1="13" x2="67" y2="13" stroke="#8A5A30" strokeWidth="1.2"/>
    <circle cx="33" cy="13" r="1" fill="#D6A23F"/><circle cx="67" cy="13" r="1" fill="#D6A23F"/>
    <rect x="37" y="15" width="26" height="22" fill="rgba(200,228,244,0.15)"/>

    {/* WARDROBE (16,44) left wall — tall skewed rectangle */}
    <polygon points="4,28 19.5,18 19.5,68 4,75" fill="#9A6B3F"/>
    <polygon points="4,28 19.5,18 19.5,68 4,75" fill="none" stroke="#7E4F27" strokeWidth="0.5"/>
    <polygon points="4,28 11.5,23 11.5,71.5 4,75" fill="#8A5B30"/>
    <polygon points="11.5,23 19.5,18 19.5,68 11.5,71.5" fill="#A87848"/>
    <line x1="11.5" y1="23" x2="11.5" y2="71.5" stroke="#7E4F27" strokeWidth="0.7"/>
    <circle cx="10" cy="46" r="1" fill="#D6A23F"/><circle cx="14" cy="44.5" r="1" fill="#D6A23F"/>
    <line x1="4" y1="51" x2="19.5" y2="43" stroke="#7E4F27" strokeWidth="0.4" opacity="0.5"/>

    {/* DRESSER (74,42) right wall */}
    <polygon points="74,28 91,33 91,57 74,52" fill="#A87742"/>
    <polygon points="74,28 91,33 91,34.5 74,29.5" fill="#C8A060"/>
    {[39,46,52].map((y,i)=><polygon key={i} points={`74,${y} 91,${y+2} 91,${y+2.6} 74,${y+0.6}`} fill="#7A5228"/>)}
    {[43,49.5,55].map((y,i)=><circle key={i} cx={83.5} cy={y+1} r="0.8" fill="#8A5820"/>)}
    {/* mirror above dresser */}
    <polygon points="76,18 88,21 88,29 76,26" fill="#C8E0EA"/>
    <polygon points="76,18 88,21 88,29 76,26" fill="none" stroke="#7A5228" strokeWidth="0.7"/>
    <polygon points="76.5,18.5 87.5,21.5 87.5,22 76.5,19" fill="rgba(255,255,255,0.4)"/>
    <path d="M77.5 21 q4 3 7 1" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" fill="none"/>

    {/* BEDSIDE LAMP (30,54) left wall — small table + lamp */}
    <polygon points="23,61 33,56 33,65 23,69" fill="#9A6B3F"/>
    <polygon points="23,61 33,56 33,57.5 23,62.5" fill="#C8A060"/>
    <line x1="28.5" y1="57" x2="28.5" y2="52" stroke="#7E4F27" strokeWidth="0.7"/>
    <polygon points="25.5,50.5 31.5,49.5 30.5,52.5 26.5,53" fill="#F4C766"/>
    <polygon points="25.5,50.5 31.5,49.5 31.5,50.2 25.5,51.2" fill="#D8A030"/>

    {/* DESK (81,64) right wall */}
    <polygon points="74,56 96,62 96,66 74,60" fill="#9A6B3F"/>
    <polygon points="74,56 96,62 96,63.5 74,57.5" fill="#C0924A"/>
    <rect x="90" y="59" width="5" height="7" rx="0.5" fill="#2A2A32"/>
    <rect x="90.5" y="59.5" width="4" height="5" rx="0.3" fill="#1A3448"/>
    <line x1="74" y1="60" x2="74" y2="70" stroke="#7A5228" strokeWidth="0.8"/>
    <line x1="96" y1="66" x2="96" y2="76" stroke="#7A5228" strokeWidth="0.8"/>

    {/* FLOOR MIRROR (18,72) left floor area */}
    <polygon points="13,59 22,55 22,82 13,85" fill="#8AB8C8"/>
    <polygon points="13,59 22,55 22,56.5 13,60.5" fill="#7A5228"/>
    <polygon points="13,84 22,81 22,82 13,85" fill="#7A5228"/>
    <polygon points="13,59 14,59.5 14,84.5 13,84" fill="#7A5228"/>
    <polygon points="22,55 23,55 23,82 22,82" fill="#5A3818"/>
    <polygon points="13.5,61 21.5,57 21.5,58 13.5,62" fill="rgba(255,255,255,0.4)"/>
    <path d="M14 65 q4 6 7 3" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" fill="none"/>

    {/* BED (50,74) floor center */}
    {/* Headboard */}
    <polygon points="26,58 74,58 74,67 26,67" fill="#7E4F27"/>
    <polygon points="27,58.5 73,58.5 73,59.5 27,59.5" fill="#C8A060"/>
    {[30,38,46,54,62,70].map((x,i)=><rect key={i} x={x} y={59} width="6" height="7" rx="0.5" fill="#9A6B3F"/>)}
    {/* Mattress */}
    <polygon points="24,67 76,67 78,88 22,88" fill="#E8E0D4"/>
    <polygon points="24,67 76,67 77,68.5 23,68.5" fill="#F0E8DC"/>
    {/* Duvet */}
    <polygon points="25,67 75,67 76.5,82 23.5,82" fill="#8AB4C8"/>
    <polygon points="26,67.5 74,67.5 75.5,81.5 24.5,81.5" fill="#9AC0D4" opacity="0.6"/>
    <line x1="50" y1="67" x2="50" y2="82" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
    {/* Pillows */}
    <polygon points="27,59 44,59 44.5,67 27,67" fill="#F4EEE4" opacity="0.9"/>
    <polygon points="56,59 73,59 73,67 56.5,67" fill="#F4EEE4" opacity="0.9"/>
    {/* Bedframe legs */}
    <rect x="25" y="88" width="3" height="5" rx="0.5" fill="#5A3410"/>
    <rect x="72" y="88" width="3" height="5" rx="0.5" fill="#5A3410"/>

    {/* RUG (50,92) floor very front */}
    <polygon points="20,91 80,91 84,99 16,99" fill="#C8612C" opacity="0.55"/>
    <polygon points="23,92 77,92 81,98.5 19,98.5" fill="none" stroke="#F3E7CE" strokeWidth="0.7" opacity="0.6"/>
    <polygon points="27,93.5 73,93.5 76,98 24,98" fill="none" stroke="#F3E7CE" strokeWidth="0.4" opacity="0.4"/>
  </>);
}

// ---- registry ----
const ART = {
  'treehouse-out': (typeof TreehouseArt !== 'undefined' ? TreehouseArt : null),
  'playhouse-in': PlayhouseInsideArt,
  'treehouse-garden': GardenArt,
  'aquarium-tank': AquariumTankArt,
  'aquarium-tunnel': AquariumTunnelArt,
  'house-living': HouseLivingArt,
  'house-kitchen': HouseKitchenArt,
  'house-bedroom': HouseBedroomArt,
};

Object.assign(window, {
  ART,
  PlayhouseInsideArt, GardenArt, AquariumTankArt, AquariumTunnelArt,
  HouseLivingArt, HouseKitchenArt, HouseBedroomArt,
});

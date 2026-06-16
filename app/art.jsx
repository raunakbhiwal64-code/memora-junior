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

// ============================================================ HOUSE: a shared
// flat-room shell, with per-variant furniture. Keeps the dummy house coherent.
function houseShell(wall, floor) {
  return (<>
    <rect x="0" y="0" width="100" height="66" fill={wall} />
    <rect x="0" y="64" width="100" height="36" fill={floor} />
    <rect x="0" y="64" width="100" height="2.4" fill="rgba(0,0,0,0.12)" />
    <rect x="0" y="58" width="100" height="6" fill="rgba(255,255,255,0.10)" />
  </>);
}

function HouseLivingArt() {
  return svgWrap(<>
    {houseShell('#E4D2B6', '#C49A6A')}
    {/* clock (~50,16) */}
    <g><circle cx="50" cy="16" r="5.6" fill="#FBF6EC" stroke="#8A5F32" strokeWidth="1" /><line x1="50" y1="16" x2="50" y2="12.5" stroke="#3B3127" strokeWidth="0.7" /><line x1="50" y1="16" x2="52.6" y2="16" stroke="#3B3127" strokeWidth="0.7" /></g>
    {/* front door (left ~12,60) */}
    <g><rect x="5" y="34" width="14" height="32" rx="1" fill="#9A6B3F" stroke="#7E4F27" strokeWidth="0.8" /><circle cx="16" cy="52" r="1" fill="#D6A23F" /></g>
    {/* bookshelf (right wall ~80,34) */}
    <g><rect x="72" y="22" width="16" height="24" rx="1" fill="#7E4F27" /><rect x="73.4" y="23.4" width="13.2" height="20" fill="#8A5F32" />
      {[24,30,36].map((y,r)=>(<g key={r}>{[0,1,2,3,4].map(i=>(<rect key={i} x={74+i*2.5} y={y} width="1.8" height="5.4" fill={['#C8612C','#5C8A6E','#D6A23F','#3E8E9E','#CE6A8E'][i]} />))}</g>))}
    </g>
    {/* fireplace (~30,46) */}
    <g><rect x="23" y="40" width="16" height="24" rx="1" fill="#B89C7A" stroke="#8A5F32" strokeWidth="0.8" /><rect x="26.5" y="48" width="9" height="16" fill="#3B2C1C" /><path d="M31 62 q-2 -4 0 -6 q1 2 2 0 q1 4 -1 6 z" fill="#E2853C" /><path d="M31 62 q-1 -2 0 -3 q1 2 1 0 q0 2 -1 3 z" fill="#F4C766" /></g>
    {/* houseplant (left ~24,66) */}
    <g><rect x="20.5" y="60" width="7" height="6" rx="1" fill="#C8612C" /><path d="M24 60 q-5 -8 -2 -12 M24 60 q5 -7 2 -11 M24 60 q0 -9 0 -12" stroke="#5C8A4E" strokeWidth="1.4" fill="none" strokeLinecap="round" /></g>
    {/* TV (center wall ~50,36) */}
    <g><rect x="40" y="26" width="20" height="13" rx="1.4" fill="#2B2B33" stroke="#1A1A20" strokeWidth="1" /><rect x="41.6" y="27.6" width="16.8" height="9.8" rx="0.6" fill="#3E6E86" opacity="0.6" /><rect x="46" y="39" width="8" height="2" fill="#3B3127" /></g>
    {/* sofa (center bottom ~48,78) */}
    <g><rect x="33" y="72" width="32" height="12" rx="3" fill="#5C8A6E" /><rect x="33" y="68" width="32" height="8" rx="3" fill="#6E9C80" /><rect x="31" y="70" width="6" height="14" rx="2.4" fill="#4F7A60" /><rect x="61" y="70" width="6" height="14" rx="2.4" fill="#4F7A60" /><rect x="42" y="70" width="6" height="4" rx="1.4" fill="#D6A23F" /></g>
    {/* floor lamp (right ~82,52) */}
    <g><line x1="82" y1="50" x2="82" y2="70" stroke="#7E4F27" strokeWidth="1.2" /><path d="M78 50 L86 50 L84 44 L80 44 Z" fill="#F4C766" /><ellipse cx="82" cy="70" rx="3" ry="1" fill="#7E4F27" /></g>
  </>);
}

function HouseKitchenArt() {
  return svgWrap(<>
    {houseShell('#DCE3D2', '#C9B596')}
    {/* hanging pots (~50,18) */}
    <g><line x1="40" y1="6" x2="60" y2="6" stroke="#8A5F32" strokeWidth="0.8" />{[44,50,56].map((x,i)=>(<g key={i}><line x1={x} y1="6" x2={x} y2="11" stroke="#6E6E6E" strokeWidth="0.5" /><path d={`M${x-2.4} 11 a2.4 2.4 0 0 0 4.8 0 z`} fill="#4A4A52" /></g>))}</g>
    {/* counter */}
    <rect x="6" y="56" width="88" height="6" rx="1" fill="#B89C7A" />
    <rect x="6" y="62" width="88" height="8" fill="#A07F58" />
    {/* fridge (left ~16,48) */}
    <g><rect x="9" y="30" width="15" height="34" rx="2" fill="#EDEDF0" stroke="#C8C8D0" strokeWidth="0.8" /><line x1="9" y1="44" x2="24" y2="44" stroke="#C8C8D0" strokeWidth="0.6" /><rect x="21" y="34" width="1.4" height="6" rx="0.6" fill="#9A9AA2" /><rect x="21" y="48" width="1.4" height="6" rx="0.6" fill="#9A9AA2" /></g>
    {/* stove (~38,60) */}
    <g><rect x="31" y="50" width="14" height="6" fill="#3B3B42" /><circle cx="35" cy="53" r="1.6" fill="#D9663A" /><circle cx="41" cy="53" r="1.6" fill="#5A5A62" /><rect x="31" y="62" width="14" height="8" fill="#5A5A62" /></g>
    {/* sink (~54,58) */}
    <g><rect x="48" y="56" width="13" height="6" rx="1" fill="#C8C8D0" /><rect x="50" y="57.4" width="9" height="3.6" rx="0.8" fill="#9AA0A6" /><path d="M54.5 56 q0 -4 3 -4" stroke="#8A8A92" strokeWidth="1" fill="none" /></g>
    {/* fruit bowl (~66,54) */}
    <g><path d="M62 54 a5 5 0 0 0 10 0 z" fill="#C8612C" /><circle cx="64.5" cy="52.5" r="1.6" fill="#D6A23F" /><circle cx="67.5" cy="52" r="1.8" fill="#CE5A5A" /><circle cx="70" cy="53" r="1.4" fill="#5C8A4E" /></g>
    {/* kettle (~72,52) */}
    <g><path d="M77 56 l-2 -5 l8 0 l-2 5 z" fill="#5A5A62" /><rect x="78" y="49" width="4" height="2" rx="1" fill="#3B3B42" /><path d="M83 52 l3 -1" stroke="#3B3B42" strokeWidth="1" strokeLinecap="round" /></g>
    {/* window (right ~80,36) */}
    <g><rect x="72" y="24" width="18" height="18" rx="1" fill="#BFE0E6" stroke="#8A5F32" strokeWidth="1.2" /><path d="M81 24 V42 M72 33 H90" stroke="#8A5F32" strokeWidth="0.8" /><circle cx="84" cy="29" r="2.6" fill="#F7DE8E" opacity="0.85" /></g>
    {/* kitchen table (bottom center ~50,84) */}
    <g><rect x="38" y="80" width="24" height="3.4" rx="1" fill="#9A6B3F" /><rect x="40" y="83.4" width="2" height="9" fill="#7E4F27" /><rect x="58" y="83.4" width="2" height="9" fill="#7E4F27" /></g>
  </>);
}

function HouseBedroomArt() {
  return svgWrap(<>
    {houseShell('#D9CBDF', '#B59A78')}
    {/* window (center-top ~52,26) */}
    <g><rect x="43" y="16" width="18" height="18" rx="1" fill="#BFD8E6" stroke="#8A5F32" strokeWidth="1.2" /><path d="M52 16 V34 M43 25 H61" stroke="#8A5F32" strokeWidth="0.8" /><circle cx="56" cy="21" r="2.4" fill="#F3F0DA" opacity="0.8" /></g>
    {/* wardrobe (left ~16,44) */}
    <g><rect x="8" y="28" width="17" height="36" rx="1.4" fill="#9A6B3F" stroke="#7E4F27" strokeWidth="0.8" /><line x1="16.5" y1="28" x2="16.5" y2="64" stroke="#7E4F27" strokeWidth="0.7" /><circle cx="14.6" cy="46" r="0.9" fill="#D6A23F" /><circle cx="18.4" cy="46" r="0.9" fill="#D6A23F" /></g>
    {/* dresser (right-back ~74,42) */}
    <g><rect x="66" y="40" width="17" height="22" rx="1" fill="#A77742" /><line x1="66" y1="48" x2="83" y2="48" stroke="#7E4F27" strokeWidth="0.6" /><line x1="66" y1="55" x2="83" y2="55" stroke="#7E4F27" strokeWidth="0.6" /><circle cx="74.5" cy="44" r="0.8" fill="#3B2C1C" /><circle cx="74.5" cy="51.5" r="0.8" fill="#3B2C1C" /></g>
    {/* mirror (left ~18,68) */}
    <g><ellipse cx="18" cy="74" rx="5" ry="7" fill="#C7E0E6" stroke="#8A5F32" strokeWidth="1" /><path d="M15 70 q2 4 4 2" stroke="#FBFDFE" strokeWidth="0.8" fill="none" opacity="0.7" /></g>
    {/* bedside lamp (~30,58) */}
    <g><rect x="27" y="58" width="6" height="6" rx="0.8" fill="#9A6B3F" /><line x1="30" y1="58" x2="30" y2="52" stroke="#7E4F27" strokeWidth="0.8" /><path d="M27 52 L33 52 L31.5 48 L28.5 48 Z" fill="#F4C766" /></g>
    {/* bed (center-bottom ~50,76) */}
    <g><rect x="36" y="62" width="34" height="6" rx="2" fill="#7E4F27" /><rect x="36" y="68" width="34" height="14" rx="2" fill="#6E9C80" /><rect x="36" y="68" width="34" height="6" rx="2" fill="#CE6A8E" /><rect x="38" y="64" width="10" height="6" rx="2" fill="#FBF6EC" /></g>
    {/* desk (right ~80,64) */}
    <g><rect x="72" y="66" width="20" height="3" rx="1" fill="#9A6B3F" /><rect x="73" y="69" width="2" height="11" fill="#7E4F27" /><rect x="89" y="69" width="2" height="11" fill="#7E4F27" /><rect x="80" y="60" width="7" height="6" rx="0.6" fill="#3B3B42" /></g>
    {/* rug (bottom center ~50,92) */}
    <ellipse cx="50" cy="92" rx="22" ry="5" fill="#C8612C" opacity="0.55" />
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

// scene.jsx — PalaceScene renders one "room" (the built-in Treehouse SVG
// or an uploaded photo) and overlays its numbered loci. Also powers the
// builder, where tapping the photo adds spots.

// ---- the pure Treehouse illustration (no loci) ----
function TreehouseArt() {
  return (
    <svg className="scene-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="sky" cx="50%" cy="30%" r="90%">
          <stop offset="0%" stopColor="var(--sky-top)" />
          <stop offset="100%" stopColor="var(--sky-bot)" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--trunk-dark)" />
          <stop offset="45%" stopColor="var(--trunk)" />
          <stop offset="100%" stopColor="var(--trunk-dark)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#sky)" />
      <g opacity="0.55">
        <circle cx="18" cy="14" r="16" fill="var(--leaf-2)" />
        <circle cx="80" cy="11" r="18" fill="var(--leaf-2)" />
        <circle cx="50" cy="6" r="15" fill="var(--leaf-2)" />
      </g>
      <g>
        <circle cx="30" cy="16" r="18" fill="var(--leaf)" />
        <circle cx="55" cy="10" r="20" fill="var(--leaf)" />
        <circle cx="78" cy="17" r="17" fill="var(--leaf)" />
        <circle cx="66" cy="24" r="15" fill="var(--leaf)" />
        <circle cx="42" cy="24" r="15" fill="var(--leaf)" />
      </g>
      <path d="M44 100 L46 40 Q47 34 52 33 L58 33 Q54 38 54 44 L56 100 Z" fill="url(#trunkGrad)" />
      <path d="M50 46 Q70 44 86 34" stroke="var(--trunk)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M50 40 Q33 36 20 30" stroke="var(--trunk)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="26" y="66" width="3.4" height="34" rx="1.4" fill="var(--trunk-dark)" />
      <rect x="70" y="66" width="3.4" height="34" rx="1.4" fill="var(--trunk-dark)" />
      <rect x="18" y="62" width="64" height="5.6" rx="1.6" fill="var(--wood)" />
      <rect x="18" y="62" width="64" height="2" rx="1" fill="var(--wood-light)" />
      <g stroke="var(--wood-dark)" strokeWidth="0.9">
        <line x1="20" y1="56" x2="20" y2="62" /><line x1="26" y1="56" x2="26" y2="62" />
        <line x1="74" y1="56" x2="74" y2="62" /><line x1="80" y1="56" x2="80" y2="62" />
      </g>
      <line x1="18" y1="56" x2="30" y2="56" stroke="var(--wood-dark)" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="70" y1="56" x2="82" y2="56" stroke="var(--wood-dark)" strokeWidth="1.1" strokeLinecap="round" />
      <rect x="33" y="40" width="40" height="22" rx="2.2" fill="var(--wood-light)" />
      <rect x="33" y="40" width="40" height="22" rx="2.2" fill="none" stroke="var(--wood-dark)" strokeWidth="0.7" />
      <g stroke="var(--wood)" strokeWidth="0.5" opacity="0.7">
        <line x1="33" y1="46" x2="73" y2="46" /><line x1="33" y1="52" x2="73" y2="52" /><line x1="33" y1="57" x2="73" y2="57" />
      </g>
      <path d="M30 41 L53 27 L76 41 Z" fill="var(--roof)" />
      <path d="M30 41 L53 27 L76 41 Z" fill="none" stroke="var(--wood-dark)" strokeWidth="0.7" strokeLinejoin="round" />
      <rect x="51" y="20" width="4" height="9" rx="1" fill="var(--roof)" />
      <rect x="37" y="49" width="9" height="13" rx="1.4" fill="var(--door)" />
      <rect x="37" y="49" width="9" height="13" rx="1.4" fill="none" stroke="var(--wood-dark)" strokeWidth="0.6" />
      <circle cx="44" cy="56" r="0.8" fill="var(--metal)" />
      <circle cx="64" cy="49" r="5" fill="var(--glass)" stroke="var(--wood-dark)" strokeWidth="1" />
      <path d="M59 49 H69 M64 44 V54" stroke="var(--wood-dark)" strokeWidth="0.7" />
      <g>
        <rect x="74.5" y="55.5" width="7.5" height="6.5" rx="0.6" fill="var(--wood-dark)" />
        <rect x="75.2" y="56.4" width="1.4" height="4.6" fill="var(--book-a)" />
        <rect x="77" y="56.4" width="1.4" height="4.6" fill="var(--book-b)" />
        <rect x="78.8" y="56.8" width="1.4" height="4.2" fill="var(--book-c)" />
      </g>
      <line x1="55" y1="27" x2="55" y2="31" stroke="var(--wood-dark)" strokeWidth="0.6" />
      <g className="lantern-sway" style={{ transformOrigin: '55px 27px' }}>
        <line x1="55" y1="27" x2="55" y2="31" stroke="var(--metal)" strokeWidth="0.5" />
        <rect x="52.6" y="31" width="4.8" height="6" rx="1.2" fill="var(--lantern)" />
        <rect x="53.4" y="32.4" width="3.2" height="3.4" rx="0.6" fill="var(--lantern-glow)" />
      </g>
      <g>
        <rect x="27" y="53.5" width="9" height="6" rx="1" fill="var(--chest)" />
        <path d="M27 54.5 Q31.5 51 36 54.5" fill="var(--chest-lid)" />
        <rect x="31" y="55.6" width="1.2" height="1.8" rx="0.3" fill="var(--metal)" />
      </g>
      <g transform="rotate(-32 85 38)">
        <rect x="80" y="36.5" width="10" height="3" rx="1.5" fill="var(--metal)" />
        <rect x="89" y="36" width="2.4" height="4" rx="0.8" fill="var(--trunk-dark)" />
      </g>
      <path d="M84 41 L82 46 M86 41 L88 46" stroke="var(--trunk-dark)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M30 73 Q47 90 64 73" fill="none" stroke="var(--rope)" strokeWidth="1" />
      <path d="M31 74 Q47 88 63 74 Q47 82 31 74 Z" fill="var(--hammock)" opacity="0.92" />
      <g stroke="var(--rope)" strokeWidth="0.5" opacity="0.8">
        <line x1="31" y1="74" x2="29" y2="68" /><line x1="63" y1="74" x2="65" y2="68" />
      </g>
      <g stroke="var(--rope)" strokeWidth="0.8">
        <line x1="19" y1="63" x2="19" y2="98" /><line x1="25" y1="63" x2="25" y2="98" />
      </g>
      <g stroke="var(--rope)" strokeWidth="1">
        <line x1="19" y1="70" x2="25" y2="70" /><line x1="19" y1="77" x2="25" y2="77" />
        <line x1="19" y1="84" x2="25" y2="84" /><line x1="19" y1="91" x2="25" y2="91" />
      </g>
      <path d="M0 96 Q25 92 50 96 T100 96 V100 H0 Z" fill="var(--ground)" />
    </svg>
  );
}

// the small badge inside a placed pin: emoji if the item has one, else its initial
function PinBadge({ item }) {
  if (item.emoji) return <span className="locus-emoji" aria-hidden="true">{item.emoji}</span>;
  return <span className="locus-initial" style={{ background: item.color }}>{item.label[0].toUpperCase()}</span>;
}

// One room of a palace + its loci overlay.
function PalaceScene({
  room, placedById = {}, activeId = null, walkId = null, recallId = null,
  showNumbers = true, dim = false, onSpotClick = null, walkPathPts = null,
  builderMode = false, onPhotoTap = null, onRemoveSpot = null,
}) {
  const isPhoto = room && room.type === 'photo';
  const ArtComp = (!isPhoto && room) ? ((window.ART && window.ART[room.art]) || TreehouseArt) : null;
  const handleTap = (e) => {
    if (!builderMode || !onPhotoTap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    onPhotoTap(Math.max(3, Math.min(97, x)), Math.max(4, Math.min(96, y)));
  };
  return (
    <div className="scene" data-dim={dim ? 'true' : 'false'} data-photo={isPhoto ? 'true' : 'false'}>
      <div className={'scene-canvas' + (builderMode ? ' is-builder' : '')} onClick={handleTap}>
        {isPhoto
          ? <img className="scene-art scene-photo" src={room.img} alt={room.name || 'room'} draggable="false" />
          : <ArtComp />}
        {walkPathPts && walkPathPts.length > 1 && (
          <svg className="walk-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={walkPathPts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ')}
              fill="none" stroke="var(--ember)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" opacity="0.85" />
          </svg>
        )}
        <div className="loci">
          {(room ? room.spots : []).map((s) => {
            const item = placedById[s.id];
            const isActive = activeId === s.id;
            const isWalk = walkId === s.id;
            const isRecall = recallId === s.id;
            const state = isWalk ? 'walk' : isActive ? 'active' : isRecall ? 'recall' : (item ? 'placed' : 'empty');
            return (
              <div
                key={s.id}
                className="locus"
                data-state={state}
                style={{ left: s.x + '%', top: s.y + '%' }}
              >
                <button
                  type="button"
                  className="locus-hit"
                  onClick={(e) => { e.stopPropagation(); onSpotClick && onSpotClick(s); }}
                  tabIndex={onSpotClick ? 0 : -1}
                  aria-label={'Spot ' + s.localN + ', ' + (s.name || '')}
                >
                  <span className="locus-pin">
                    {item ? <PinBadge item={item} /> : (showNumbers ? s.localN : '')}
                  </span>
                </button>
                {item && <span className="locus-tag">{item.label}</span>}
                {builderMode && onRemoveSpot && (
                  <button type="button" className="locus-del" onClick={(e) => { e.stopPropagation(); onRemoveSpot(s); }} aria-label="Remove spot">×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// register the built-in treehouse exterior so ready palaces can reference it by key
if (window.ART) window.ART['treehouse-out'] = TreehouseArt;

Object.assign(window, { TreehouseArt, PalaceScene, PinBadge });

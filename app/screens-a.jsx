// screens-a.jsx — Home, Palace Picker, List Picker, Meet-the-list.

const { useState: useStateA } = React;

// ---- HOME -------------------------------------------------------------------
function HomeScreen({ onStart, onContinue, onReview, hasSaved, stats, dueCount, audio }) {
  useNarrate('Let\'s build a memory palace! I\'ll show you a trick that makes things really easy to remember.', audio);
  const streak = stats && stats.streak ? stats.streak : 0;
  const sessions = stats && stats.sessions ? stats.sessions : 0;
  return (
    <div className="screen home">
      <div className="home-art" aria-hidden="true">
        <PalaceScene room={{ ...buildTreehousePalace().rooms[0], spots: [] }} placedById={{}} showNumbers={false} />
      </div>
      <div className="home-panel">
        <BrandMark />
        <h1 className="home-title">Let&rsquo;s build a<br /><em>memory palace</em>.</h1>
        <p className="home-sub">
          A memory palace is a secret trick for remembering almost anything &mdash;
          by hiding it in a place you know. Ready to try one?
        </p>

        {(streak > 0 || sessions > 0) && (
          <div className="home-stats" role="group" aria-label="Your practice stats">
            <span className="stat-pill"><strong>{streak}</strong> day streak{streak > 0 ? ' 🔥' : ''}</span>
            <span className="stat-pill"><strong>{sessions}</strong> session{sessions === 1 ? '' : 's'}</span>
          </div>
        )}

        {dueCount > 0 && (
          <button type="button" className="home-review" onClick={onReview}>
            <span className="home-review-badge">{dueCount}</span>
            <span className="home-review-text">
              <strong>Time to review!</strong>
              {dueCount === 1 ? ' 1 palace is due' : ` ${dueCount} palaces are due`} — keep your memories strong.
            </span>
            <span className="home-review-go">Review →</span>
          </button>
        )}

        <BigButton onClick={onStart} full>{sessions > 0 ? 'New palace →' : 'Start the tour →'}</BigButton>
        {hasSaved && <BigButton onClick={onContinue} kind="soft" full>Open your palaces →</BigButton>}
        <p className="home-foot">No sign-in · Saved only on your device · Reviews remind you to come back</p>
      </div>
    </div>
  );
}

// ---- PALACE PICKER ----------------------------------------------------------
function PickerScreen({ library, bestFor, dueSets, onReview, onPickReady, onPreview, onBuild, onOpenPalace, onDeletePalace, audio }) {
  useNarrate('Pick a place you know really well. Use one of our ready-made palaces, or build one from photos of your own home!', audio);
  const ready = PALACES.filter((p) => p.ready);
  const comingSoon = PALACES.filter((p) => !p.ready);
  const due = dueSets || [];
  return (
    <div className="screen picker">
      <header className="screen-head">
        <h2 className="screen-title">Pick your palace</h2>
        <p className="screen-lede">Choose a ready-made palace, or build one from photos of your home.</p>
      </header>

      <div className="picker-scroll">
        {due.length > 0 && (
          <section className="due-section">
            <h3 className="saved-head">⏰ Due for review <span>· keep these fresh</span></h3>
            <div className="saved-grid">
              {due.map((s) => (
                <div key={s.id} className="saved-card due-card">
                  <div className="saved-thumb" style={{ backgroundImage: s.thumb ? `url(${s.thumb})` : 'none' }}>
                    {!s.thumb && <span aria-hidden="true">🧠</span>}
                  </div>
                  <div className="saved-meta">
                    <span className="saved-name">{s.name}</span>
                    <span className="saved-sub">{s.listTitle} · best {s.score}/{s.total}</span>
                    <div className="saved-cta">
                      <button type="button" className="saved-play due-play" onClick={() => onReview(s)}>Review now →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="palace-grid ready-grid">
          {ready.map((p) => {
            const spots = readySpotCount(p.id);
            const rooms = (READY[p.id] || { rooms: [] }).rooms.length;
            const best = bestFor(p.id);
            return (
              <div key={p.id} className="palace-card" data-ready="true"
                style={{ '--c0': p.swatch[0], '--c1': p.swatch[1], '--c2': p.swatch[2] }}>
                <button type="button" className="palace-open" onClick={() => onPickReady(p.id)} aria-label={'Use the ' + p.name}>
                  <span className="palace-emoji" aria-hidden="true">{p.emoji}</span>
                  <span className="palace-name">{p.name}</span>
                  <span className="palace-tag">{p.tagline}</span>
                  <span className="palace-meta">{rooms} room{rooms === 1 ? '' : 's'} · {spots} spots{best ? ` · best ${best.score}/${best.total}` : ''}</span>
                  <span className="palace-go">Choose →</span>
                </button>
                <button type="button" className="palace-peek" onClick={() => onPreview(p.id)}>👁 Peek inside</button>
              </div>
            );
          })}

          <button type="button" className="palace-card build-card" onClick={onBuild}
            style={{ '--c0': '#C8612C', '--c1': '#D6A23F', '--c2': '#F3E7CE' }}>
            <span className="palace-emoji" aria-hidden="true">🏠📸</span>
            <span className="palace-name">Your house</span>
            <span className="palace-tag">Build a palace from your own room photos</span>
            <span className="palace-go">Build it 🔒 ＋</span>
          </button>
        </div>

        {library.length > 0 && (
          <section className="saved-section">
            <h3 className="saved-head">Your palace library <span>· {library.length} palace{library.length === 1 ? '' : 's'}, saved on this device</span></h3>
            <div className="saved-grid">
              {library.map((p) => {
                const best = bestFor(p.id);
                const spots = totalSpots(p);
                const thumb = (p.rooms.find((r) => r.type === 'photo') || {}).img || null;
                return (
                  <div key={p.id} className="saved-card">
                    <div className="saved-thumb" style={{ backgroundImage: thumb ? `url(${thumb})` : 'none' }}>
                      {!thumb && <span aria-hidden="true">🏠</span>}
                    </div>
                    <div className="saved-meta">
                      <span className="saved-name">{p.name || 'My palace'}</span>
                      <span className="saved-sub">{p.rooms.length} room{p.rooms.length === 1 ? '' : 's'} · {spots} spots{best ? ` · best ${best.score}/${best.total}` : ''}</span>
                      <div className="saved-cta">
                        <button type="button" className="saved-play" onClick={() => onOpenPalace(p)}>Open →</button>
                        <button type="button" className="saved-trash" onClick={() => onDeletePalace(p)} aria-label="Delete this palace">🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="store-note">🔒 Tap 🗑 to delete a whole palace and its photos from this device in one tap.</p>
          </section>
        )}

        <section className="soon-section">
          <h3 className="saved-head">More ready-made palaces <span>· coming soon</span></h3>
          <div className="soon-grid">
            {comingSoon.map((p) => (
              <div key={p.id} className="soon-card" style={{ '--c0': p.swatch[0] }}>
                <span className="soon-emoji" aria-hidden="true">{p.emoji}</span>
                <span className="soon-name">{p.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- PALACE PREVIEW (peek inside / tour all rooms) --------------------------
function PalacePreviewScreen({ palace, onUse, onBack, audio }) {
  const [ri, setRi] = useStateA(0);
  const room = palace.rooms[ri];
  const total = totalSpots(palace);
  useNarrate('Take a peek inside the ' + palace.name + '. Tap the rooms to look around — there ' + (total === 1 ? 'is 1 spot' : 'are ' + total + ' spots') + ' to hide things in.', audio);
  return (
    <div className="screen split">
      <div className="split-scene">
        <PalaceScene room={room} placedById={{}} showNumbers />
        <div className="scene-caption">{room.name} · {room.spots.length} spot{room.spots.length === 1 ? '' : 's'}</div>
      </div>
      <div className="split-panel preview-panel">
        <div className="preview-head">
          <span className="preview-emoji" aria-hidden="true">{palace.emoji}</span>
          <div>
            <h2 className="preview-title">{palace.name}</h2>
            <p className="preview-sub">{palace.rooms.length} room{palace.rooms.length === 1 ? '' : 's'} · {total} spots to fill</p>
          </div>
        </div>

        <div className="preview-tabs">
          {palace.rooms.map((r, i) => (
            <button key={r.id} type="button" className={'preview-tab' + (i === ri ? ' is-active' : '')} onClick={() => setRi(i)}>
              {r.name}<small>{r.spots.length}</small>
            </button>
          ))}
        </div>

        <div className="preview-spots">
          {room.spots.map((s) => (
            <span key={s.id} className="preview-spot"><span className="preview-spot-n">{s.localN}</span>{s.name}</span>
          ))}
        </div>

        <div className="preview-actions">
          <BigButton kind="ghost" onClick={onBack}>← Back</BigButton>
          <BigButton onClick={onUse} style={{ flex: 1 }}>Use this palace →</BigButton>
        </div>
      </div>
    </div>
  );
}

// ---- LIST PICKER ------------------------------------------------------------
function ListPickScreen({ palace, lists, onChoose, onImport, onLearnText, onNumbers, onCards, onDeleteList, pro, audio }) {
  const spots = totalSpots(palace);
  useNarrate('What should we hide in your palace? Pick our planets, one of your saved lists, or bring your own.', audio);
  return (
    <div className="screen picker">
      <header className="screen-head">
        <h2 className="screen-title">What will you remember?</h2>
        <p className="screen-lede">Your <strong>{palace.name}</strong> has {spots} spot{spots === 1 ? '' : 's'} — pick something to hide in them.</p>
      </header>
      <div className="picker-scroll">
        <div className="list-grid">
          <button type="button" className="list-card" onClick={() => onChoose(PLANET_LIST)}>
            <span className="list-emoji" aria-hidden="true">🪐</span>
            <span className="list-name">The Eight Planets</span>
            <span className="list-sub">Demo list · 8 items, in order</span>
            <span className="palace-go">Use this →</span>
          </button>

          {lists.map((l) => (
            <div key={l.id} className="list-card">
              <span className="list-emoji" aria-hidden="true">{l.kind === 'text' ? '📖' : '📝'}</span>
              <span className="list-name">{l.title}</span>
              <span className="list-sub">{l.items.length} {l.kind === 'text' ? 'to recall · your text' : 'item' + (l.items.length === 1 ? '' : 's') + ' · yours'}</span>
              <div className="saved-cta">
                <button type="button" className="saved-play" onClick={() => onChoose(l)}>Use this →</button>
                <button type="button" className="saved-trash" onClick={() => onDeleteList(l)} aria-label="Delete">🗑</button>
              </div>
            </div>
          ))}

          <button type="button" className="list-card learn-card" onClick={onLearnText}>
            <span className="list-emoji" aria-hidden="true">📖</span>
            <span className="list-name">Learn a text</span>
            <span className="list-sub">Paste a poem, notes or passage — we pull out the words to hide</span>
            <span className="palace-go">Start →</span>
          </button>

          {pro && (
            <button type="button" className="list-card number-card" onClick={onNumbers}>
              <span className="list-emoji" aria-hidden="true">🔢</span>
              <span className="list-name">Memorise a number</span>
              <span className="list-sub">Digits, dates, π — encoded with the Major System</span>
              <span className="palace-go">Pro · Start →</span>
            </button>
          )}

          {pro && (
            <button type="button" className="list-card card-deck-card" onClick={onCards}>
              <span className="list-emoji" aria-hidden="true">🂡</span>
              <span className="list-name">Memorise cards</span>
              <span className="list-sub">A shuffled deck — the classic speed-cards discipline</span>
              <span className="palace-go">Pro · Start →</span>
            </button>
          )}

          <button type="button" className="list-card import-card" onClick={onImport}>
            <span className="list-emoji" aria-hidden="true">⬆️</span>
            <span className="list-name">Bring your own list</span>
            <span className="list-sub">Type, paste, or upload up to {MAX_ITEMS} things</span>
            <span className="palace-go">Import ＋</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- MEET THE LIST (preview) ------------------------------------------------
function MeetScreen({ list, palace, onNext, audio }) {
  const spots = totalSpots(palace);
  const using = Math.min(spots, list.items.length);
  const shown = list.items.slice(0, 12);
  const more = list.items.length - shown.length;
  useNarrate('Here\u2019s what we\u2019ll hide. On their own these are slippery — so let\u2019s tuck each one into a spot in your palace.', audio);
  return (
    <div className="screen meet">
      <header className="screen-head">
        <h2 className="screen-title">Today we&rsquo;ll remember&hellip;</h2>
        <p className="screen-lede">{list.title} &mdash; in {using} spot{using === 1 ? '' : 's'} of your {palace.name}.</p>
      </header>

      <div className="meet-list">
        {shown.map((it, i) => (
          <div className="meet-item" key={it.id} style={{ '--chip-accent': it.color, animationDelay: (i * 55) + 'ms' }}>
            <span className="meet-num">{i + 1}</span>
            {it.emoji
              ? <span className="meet-emoji" aria-hidden="true">{it.emoji}</span>
              : <span className="meet-initial" style={{ background: it.color }}>{it.label[0].toUpperCase()}</span>}
            <span className="meet-label">{it.label}</span>
          </div>
        ))}
        {more > 0 && <div className="meet-item meet-more">+{more} more</div>}
      </div>

      {list.items.length > spots && (
        <p className="meet-warn">Your palace has {spots} spots, so we&rsquo;ll use the first {spots}. Add more spots to fit them all!</p>
      )}

      <CoachBubble mood="think">
        Watch &mdash; we&rsquo;ll hide each one at a special spot in your {palace.name.toLowerCase()}, so they stick like glue.
      </CoachBubble>

      <BigButton onClick={onNext} full>Let&rsquo;s hide them →</BigButton>
    </div>
  );
}

Object.assign(window, { HomeScreen, PickerScreen, PalacePreviewScreen, ListPickScreen, MeetScreen });

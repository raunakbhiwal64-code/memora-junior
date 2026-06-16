// components.jsx — shared UI primitives for Memora Junior.

const { useState, useEffect, useRef, useCallback } = React;

// ---- Audio narration (real browser TTS) -------------------------------------
const Narrator = {
  enabled: true,
  speak(text) {
    if (!this.enabled || !text) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.96; u.pitch = 1.08; u.volume = 1;
      synth.speak(u);
    } catch (e) { /* no-op */ }
  },
  stop() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} },
};
window.Narrator = Narrator;

// useNarrate — speaks `text` when it changes, if audio is on.
function useNarrate(text, on) {
  useEffect(() => {
    Narrator.enabled = !!on;
    if (on && text) {
      const id = setTimeout(() => Narrator.speak(text), 240);
      return () => clearTimeout(id);
    }
  }, [text, on]);
}

// ---- Buttons ----------------------------------------------------------------
function BigButton({ children, onClick, kind = 'primary', disabled, full, style }) {
  return (
    <button
      type="button"
      className={'btn btn-' + kind + (full ? ' btn-full' : '')}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

// ---- Speaker / audio toggle pill --------------------------------------------
function SpeakerButton({ on, onToggle, text }) {
  return (
    <button
      type="button"
      className="speaker"
      data-on={on ? 'true' : 'false'}
      onClick={() => { if (on && text) Narrator.speak(text); else onToggle && onToggle(); }}
      onContextMenu={(e) => { e.preventDefault(); onToggle && onToggle(); }}
      aria-label={on ? 'Read aloud' : 'Audio off'}
      title={on ? 'Tap to hear it again' : 'Audio is off'}
    >
      {on ? '🔊' : '🔈'}
    </button>
  );
}

// ---- Progress ribbon (the journey) ------------------------------------------
const JOURNEY = [
  { key: 'pick', label: 'Pick' },
  { key: 'meet', label: 'List' },
  { key: 'place', label: 'Place' },
  { key: 'walk', label: 'Walk' },
  { key: 'recall', label: 'Recall' },
  { key: 'done', label: 'Done' },
];
function ProgressRibbon({ current }) {
  const idx = JOURNEY.findIndex((s) => s.key === current);
  return (
    <div className="ribbon" role="list">
      {JOURNEY.map((s, i) => (
        <div key={s.key} className="ribbon-step" data-state={i < idx ? 'done' : i === idx ? 'now' : 'todo'} role="listitem">
          <span className="ribbon-dot">{i < idx ? '✓' : i + 1}</span>
          <span className="ribbon-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Brand mark -------------------------------------------------------------
function BrandMark({ small }) {
  return (
    <div className={'brand' + (small ? ' brand-sm' : '')}>
      <span className="brand-glyph" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="100%" height="100%">
          <path d="M16 3 L27 9 V20 Q27 27 16 30 Q5 27 5 20 V9 Z" fill="var(--ember)" />
          <path d="M16 9 L16 23 M11 13 L16 9 L21 13" stroke="var(--parchment)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="brand-words">
        <span className="brand-name">Memora</span>
        <span className="brand-jr">Junior</span>
      </span>
    </div>
  );
}

// ---- Coach bubble (the guide character speaks) ------------------------------
function CoachBubble({ children, mood = 'happy', compact }) {
  const face = mood === 'cheer' ? '✨' : mood === 'think' ? '💭' : '🦉';
  return (
    <div className={'coach' + (compact ? ' coach-compact' : '')}>
      <span className="coach-face" aria-hidden="true">{face}</span>
      <div className="coach-bubble">{children}</div>
    </div>
  );
}

// ---- Recall timer (Pro mode) ------------------------------------------------
function RecallTimer({ show }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!show) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [show]);
  if (!show) return null;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className="recall-timer" aria-label="Time elapsed">⏱ {mm}:{ss}</span>;
}

// ---- Item chip --------------------------------------------------------------
function ItemChip({ item, onClick, state = 'idle', big }) {
  return (
    <button
      type="button"
      className={'chip' + (big ? ' chip-big' : '')}
      data-state={state}
      onClick={onClick}
      disabled={state === 'used'}
      style={{ '--chip-accent': item.color }}
    >
      {item.emoji
        ? <span className="chip-emoji" aria-hidden="true">{item.emoji}</span>
        : <span className="chip-dot" style={{ background: item.color }} aria-hidden="true">{item.label[0].toUpperCase()}</span>}
      <span className="chip-label">{item.label}</span>
    </button>
  );
}

Object.assign(window, {
  useNarrate, BigButton, SpeakerButton, ProgressRibbon, BrandMark, CoachBubble, ItemChip, JOURNEY, RecallTimer,
});

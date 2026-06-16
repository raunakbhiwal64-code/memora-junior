// genie.jsx — the "I'm stuck" idea helper. Kept strictly OPT-IN: the child is
// always asked to imagine first; this only fires when they tap for help.
//
// Two parts, both free and client-side:
//   1. A rule-based silly-idea generator + an emoji/SVG "silly scene" that work
//      offline on any device (no model, no GPU, no backend).
//   2. A pluggable AI provider (OpenAI-compatible /v1/chat/completions) so a
//      local LLM (Ollama, LM Studio) — or a hosted endpoint later — can write
//      richer ideas. If it's off or unreachable, we fall back to the rule-based
//      generator, so the feature ALWAYS works.

// Exaggerated, kid-friendly actions (verb phrase + a matching emoji).
const SILLY_ACTIONS = [
  { v: 'break-dancing on', e: '🕺' },
  { v: 'bouncing like a beach ball off', e: '⚡' },
  { v: 'sneezing rainbow glitter all over', e: '🤧' },
  { v: 'juggling', e: '🤹' },
  { v: 'doing wild cartwheels around', e: '🤸' },
  { v: 'blowing giant bubbles at', e: '🫧' },
  { v: 'setting off fireworks on', e: '🎆' },
  { v: 'spinning like a tornado around', e: '🌀' },
  { v: 'tickling', e: '🪶' },
  { v: 'melting like ice cream all over', e: '🫠' },
  { v: 'doing a silly disco dance on', e: '💃' },
  { v: 'blasting off like a rocket from', e: '🚀' },
  { v: 'giggling and wobbling on top of', e: '😜' },
  { v: 'squashing flat with a SPLAT', e: '💥' },
  { v: 'snoring loudly inside', e: '😴' },
  { v: 'painting polka dots on', e: '🎨' },
];
const SILLY_TAILS = [
  'Make it HUGE!', 'So silly it won’t stop giggling!', 'Make it move and glow!',
  'The sillier, the stickier!', 'Hear the funny noise it makes!', 'Now make it even bigger!',
];

// Best-effort emoji for a spot, by scanning its name for keywords.
const SPOT_GLYPHS = [
  [/door|gate|airlock/, '🚪'], [/window/, '🪟'], [/bed\b/, '🛏️'], [/lamp|light|lantern/, '💡'],
  [/clock/, '🕰️'], [/ladder/, '🪜'], [/shelf|book/, '📚'], [/chest|box|locker|storage|crayon/, '📦'],
  [/table|desk/, '🪑'], [/sofa|couch|beanbag|cushion/, '🛋️'], [/plant|flower|tree|veggie|garden|mushroom/, '🪴'],
  [/fire|stove/, '🔥'], [/tv|television|screen/, '📺'], [/fridge/, '🧊'], [/sink|water|pond|tap/, '🚰'],
  [/mirror/, '🪞'], [/rug|mat|blanket|carpet/, '🧶'], [/pot|kettle|food|bowl|fruit/, '🍳'],
  [/telescope/, '🔭'], [/hammock|swing/, '🌴'], [/robot|arm/, '🤖'], [/panel|control|console/, '🎛️'],
  [/solar/, '☀️'], [/treadmill/, '🏃'], [/pod|capsule|rocket/, '🚀'], [/teddy/, '🧸'],
  [/bird/, '🐦'], [/wheelbarrow|watering|bucket/, '🪣'], [/coral|clam|seaweed|fish|jelly|shark|turtle|ray|bubble/, '🐠'],
  [/bunting|flag/, '🎏'], [/drawing|picture/, '🖼️'], [/ticket|entrance|exit/, '🎟️'], [/bench/, '🪑'],
];
function spotGlyph(name) {
  const n = String(name || '').toLowerCase();
  for (const [re, g] of SPOT_GLYPHS) if (re.test(n)) return g;
  return '📍';
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Compose a "silly scene": the item + an action + the spot, as glyphs + caption.
function sceneFor(item, spot) {
  const action = pick(SILLY_ACTIONS);
  const itemGlyph = item.emoji || null;
  const itemWord = item.isVocab ? (item.answer || item.label) : item.label;
  return {
    itemGlyph, itemWord, spotGlyph: spotGlyph(spot.name), actionEmoji: action.e,
    caption: `Picture a GIANT ${itemWord} ${action.v} ${spot.name} — ${pick(SILLY_TAILS)}`,
  };
}

// The rule-based idea sentence (offline fallback / default).
function offlineIdea(item, spot) {
  const action = pick(SILLY_ACTIONS);
  const itemWord = item.isVocab ? (item.answer || item.label) : item.label;
  return `Picture a GIANT ${itemWord} ${action.v} ${spot.name} — ${pick(SILLY_TAILS)}`;
}

// ---- pluggable AI provider (OpenAI-compatible) ------------------------------
const AI_KEY = 'memora.ai.v1';
const AI = {
  config() {
    try { const v = JSON.parse(localStorage.getItem(AI_KEY)); return v || { enabled: false, url: '', model: '' }; }
    catch (e) { return { enabled: false, url: '', model: '' }; }
  },
  setConfig(c) { try { localStorage.setItem(AI_KEY, JSON.stringify(c)); } catch (e) {} },
  ready() { const c = this.config(); return !!(c.enabled && c.url); },
  // Always resolves to a usable string. Tries the LLM if configured, else (or on
  // any error/timeout) returns the offline idea — the feature never "fails".
  async idea(item, spot) {
    const c = this.config();
    if (!(c.enabled && c.url)) return offlineIdea(item, spot);
    const itemWord = item.isVocab ? (item.answer || item.label) : item.label;
    const sys = 'You help an 8-10 year old build a memory palace. Given an ITEM and a LOCATION, reply with ONE short, silly, vivid sentence describing an exaggerated, kid-friendly ACTION the item does to the location. Encourage size and motion. Max 20 words. No preamble, no quotes.';
    const user = `ITEM: ${itemWord}\nLOCATION: ${spot.name}`;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(c.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({
          model: c.model || 'local', temperature: 1.05, max_tokens: 60,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        }),
      });
      clearTimeout(t);
      const j = await res.json();
      const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const clean = String(out || '').trim().replace(/^["'\s]+|["'\s]+$/g, '');
      return clean || offlineIdea(item, spot);
    } catch (e) {
      return offlineIdea(item, spot);
    }
  },
};

// ---- the little SVG "silly scene" ------------------------------------------
function SillyScene({ scene }) {
  if (!scene) return null;
  return (
    <svg className="silly-scene" viewBox="0 0 200 96" role="img" aria-label={scene.caption}>
      {/* burst behind */}
      <g opacity="0.5">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
          const r = a * Math.PI / 180;
          return <line key={i} x1={100 + Math.cos(r) * 16} y1={44 + Math.sin(r) * 16} x2={100 + Math.cos(r) * 30} y2={44 + Math.sin(r) * 30} stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" />;
        })}
      </g>
      {/* item (left) */}
      {scene.itemGlyph
        ? <text x="46" y="58" fontSize="44" textAnchor="middle" className="ss-wobble">{scene.itemGlyph}</text>
        : <text x="46" y="52" fontSize="17" textAnchor="middle" className="ss-wobble ss-word">{scene.itemWord}</text>}
      {/* action (middle, up high) */}
      <text x="100" y="40" fontSize="30" textAnchor="middle" className="ss-pop">{scene.actionEmoji}</text>
      {/* motion arcs toward the spot */}
      <g fill="none" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <path d="M120 56 q14 -6 26 0" /><path d="M122 64 q14 -6 26 0" />
      </g>
      {/* spot (right) */}
      <text x="162" y="60" fontSize="36" textAnchor="middle">{scene.spotGlyph}</text>
    </svg>
  );
}

Object.assign(window, { SILLY_ACTIONS, spotGlyph, sceneFor, offlineIdea, AI, SillyScene });

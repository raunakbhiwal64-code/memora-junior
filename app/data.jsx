// data.jsx — content for the Memora Junior validation build (v1)
// Curated palaces + the eight-planets demo list + vivid placement prompts.

// The curated palaces. Treehouse, Aquarium and the Dummy House are fully
// built out (ready). Space + Pirate stay in the "coming soon" rail.
const PALACES = [
  {
    id: 'treehouse',
    name: 'Treehouse',
    tagline: 'A cosy fort up in the big oak — climb inside!',
    emoji: '🌳',
    ready: true,
    swatch: ['#7BA05B', '#C8732F', '#F3E7CE'],
  },
  {
    id: 'aquarium',
    name: 'Aquarium',
    tagline: 'Glowing tanks and a glass tunnel of fish',
    emoji: '🐠',
    ready: true,
    swatch: ['#3E8E9E', '#2B5C7A', '#DCEFF2'],
  },
  {
    id: 'house',
    name: 'Dummy House',
    tagline: 'A simple home — living room, kitchen, bedroom',
    emoji: '🏡',
    ready: true,
    swatch: ['#C9885A', '#7E9B6B', '#F2E6D2'],
  },
  {
    id: 'space',
    name: 'Space Station',
    tagline: 'Floating pods among the stars',
    emoji: '🛰️',
    ready: false,
    swatch: ['#5B5C8A', '#2A2A4A', '#E4E2F2'],
  },
  {
    id: 'pirate',
    name: 'Pirate Ship',
    tagline: 'Creaky decks and hidden treasure',
    emoji: '🏴‍☠️',
    ready: false,
    swatch: ['#A8602F', '#5C3A1E', '#F1E2C4'],
  },
];

// The eight planets — the v1 demo list. Ordered, 8 items, makes a clean
// rote-vs-palace comparison.
const PLANET_LIST = {
  id: 'planets',
  title: 'The Eight Planets',
  subtitle: 'In order, from the Sun outward',
  items: [
    { id: 'mercury', label: 'Mercury', emoji: '⚪', color: '#B7B0A6' },
    { id: 'venus', label: 'Venus', emoji: '🟡', color: '#E0B25C' },
    { id: 'earth', label: 'Earth', emoji: '🌍', color: '#4C8FBF' },
    { id: 'mars', label: 'Mars', emoji: '🔴', color: '#C5552F' },
    { id: 'jupiter', label: 'Jupiter', emoji: '🟠', color: '#D08A4E' },
    { id: 'saturn', label: 'Saturn', emoji: '🪐', color: '#D9C089' },
    { id: 'uranus', label: 'Uranus', emoji: '🔵', color: '#7FC4D1' },
    { id: 'neptune', label: 'Neptune', emoji: '🌀', color: '#3C5BC4' },
  ],
};

// The eight numbered loci inside the Treehouse, in walking order.
// x / y are percentages on the 100x100 scene viewBox.
const TREEHOUSE_SPOTS = [
  { n: 1, key: 'ladder', name: 'the rope ladder', x: 22, y: 84 },
  { n: 2, key: 'door', name: 'the front door', x: 41, y: 63 },
  { n: 3, key: 'window', name: 'the round window', x: 66, y: 52 },
  { n: 4, key: 'shelf', name: 'the bookshelf', x: 78, y: 70 },
  { n: 5, key: 'lantern', name: 'the swinging lantern', x: 55, y: 33 },
  { n: 6, key: 'chest', name: 'the toy chest', x: 31, y: 47 },
  { n: 7, key: 'telescope', name: 'the telescope', x: 84, y: 38 },
  { n: 8, key: 'hammock', name: 'the hammock', x: 47, y: 80 },
];

// Vivid, silly, age-appropriate imagery prompts pairing each planet to a spot.
// This is the "elaborative encoding" coaching the PRD calls for.
const PLACEMENT_PROMPTS = {
  mercury:
    'A tiny silver Mercury marble races down every rung of the rope ladder, going DING-ding-ding-ding like a xylophone.',
  venus:
    'Venus knocks at the front door wrapped in a thick, steamy yellow cloud-coat — way too hot and stinky to let inside!',
  earth:
    'Earth squishes its big blue-and-green face against the round window and fogs up the whole glass with one giant breath.',
  mars:
    'A little red Mars rolls along the bookshelf and leaves dusty rusty fingerprints on every single book.',
  jupiter:
    'Enormous Jupiter is SO big it squashes around the swinging lantern, and its Great Red Spot glows like the flame.',
  saturn:
    'Saturn spins down onto the toy chest like a tossed ring-toss hoop — its icy rings clatter the lid open and shut.',
  uranus:
    'Uranus is lying on its side (lazy!) and rolls straight into the telescope, freezing the lens a frosty blue.',
  neptune:
    'Deep-blue Neptune is snoozing in the hammock, swaying back and forth in big windy gusts — whoooosh.',
};

// ============================================================
// GENERALISED MODEL — palaces are made of "rooms"; each room is
// either the built-in SVG (Treehouse) or an uploaded photo. Both
// hold numbered "spots". Lists hold ordered items. This lets the
// same place / walk / recall engine drive the demo AND a child's
// own house photos + their own imported list.
// ============================================================

// ============================================================
// READY-MADE PALACES — each is a multi-room palace of illustrated
// rooms (drawn in art.jsx, looked up by `art` key). Spots carry
// names so recall can ask "what did you hide at …?". The Treehouse
// reaches 30 spots across 3 rooms (you can climb INSIDE the playhouse).
// ============================================================
const READY = {
  treehouse: {
    name: 'Treehouse', emoji: '🌳', swatch: ['#7BA05B', '#C8732F', '#F3E7CE'],
    rooms: [
      {
        id: 'out', name: 'Up in the Treehouse', art: 'treehouse-out',
        spots: TREEHOUSE_SPOTS.map((s) => ({ key: s.key, name: s.name, x: s.x, y: s.y })),
      },
      {
        id: 'in', name: 'Inside the Playhouse', art: 'playhouse-in',
        spots: [
          { key: 'mat', name: 'the welcome mat', x: 50, y: 92 },
          { key: 'shelf', name: 'the toy shelf', x: 20, y: 36 },
          { key: 'clock', name: 'the cuckoo clock', x: 16, y: 17 },
          { key: 'lantern2', name: 'the little lantern', x: 38, y: 15 },
          { key: 'bunting', name: 'the bunting flags', x: 66, y: 11 },
          { key: 'drawing', name: 'the wall drawing', x: 56, y: 38 },
          { key: 'window2', name: 'the round window', x: 74, y: 26 },
          { key: 'teddy', name: 'the teddy bear', x: 26, y: 73 },
          { key: 'cushions', name: 'the cushion pile', x: 38, y: 84 },
          { key: 'table', name: 'the little table', x: 50, y: 69 },
          { key: 'crayons', name: 'the crayon box', x: 62, y: 63 },
          { key: 'beanbag', name: 'the beanbag', x: 76, y: 78 },
        ],
      },
      {
        id: 'garden', name: 'The Garden Below', art: 'treehouse-garden',
        spots: [
          { key: 'gate', name: 'the garden gate', x: 12, y: 60 },
          { key: 'flowers', name: 'the flower bed', x: 24, y: 85 },
          { key: 'can', name: 'the watering can', x: 38, y: 78 },
          { key: 'mushrooms', name: 'the mushroom ring', x: 40, y: 90 },
          { key: 'veggies', name: 'the veggie patch', x: 58, y: 82 },
          { key: 'blanket', name: 'the picnic blanket', x: 52, y: 88 },
          { key: 'swing', name: 'the rope swing', x: 66, y: 47 },
          { key: 'barrow', name: 'the wheelbarrow', x: 72, y: 75 },
          { key: 'pond', name: 'the little pond', x: 80, y: 88 },
          { key: 'birdhouse', name: 'the birdhouse', x: 86, y: 40 },
        ],
      },
    ],
  },

  aquarium: {
    name: 'Aquarium', emoji: '🐠', swatch: ['#3E8E9E', '#2B5C7A', '#DCEFF2'],
    rooms: [
      {
        id: 'tank', name: 'The Big Tank', art: 'aquarium-tank',
        spots: [
          { key: 'gate', name: 'the ticket gate', x: 12, y: 84 },
          { key: 'jelly', name: 'the jellyfish', x: 30, y: 28 },
          { key: 'ray', name: 'the manta ray', x: 58, y: 20 },
          { key: 'starfish', name: 'the starfish on the glass', x: 78, y: 40 },
          { key: 'seaweed', name: 'the seaweed forest', x: 19, y: 74 },
          { key: 'ship', name: 'the sunken ship', x: 38, y: 82 },
          { key: 'coral', name: 'the coral reef', x: 48, y: 84 },
          { key: 'chest', name: 'the treasure chest', x: 66, y: 86 },
          { key: 'clam', name: 'the giant clam', x: 84, y: 86 },
          { key: 'bubbles', name: 'the bubble stream', x: 70, y: 36 },
        ],
      },
      {
        id: 'tunnel', name: 'The Glass Tunnel', art: 'aquarium-tunnel',
        spots: [
          { key: 'entrance', name: 'the tunnel entrance', x: 14, y: 50 },
          { key: 'ceiling', name: 'the glowing ceiling', x: 50, y: 14 },
          { key: 'shark', name: 'the shark overhead', x: 62, y: 24 },
          { key: 'turtle', name: 'the sea turtle', x: 78, y: 40 },
          { key: 'bubbles2', name: 'the bubble column', x: 26, y: 60 },
          { key: 'screen', name: 'the info screen', x: 20, y: 76 },
          { key: 'bench', name: 'the wooden bench', x: 50, y: 84 },
          { key: 'exit', name: 'the exit door', x: 86, y: 56 },
        ],
      },
    ],
  },

  house: {
    name: 'Dummy House', emoji: '🏡', swatch: ['#C9885A', '#7E9B6B', '#F2E6D2'],
    rooms: [
      {
        id: 'living', name: 'Living Room', art: 'house-living',
        spots: [
          { key: 'door', name: 'the front door', x: 12, y: 52 },
          { key: 'clock', name: 'the wall clock', x: 50, y: 16 },
          { key: 'tv', name: 'the television', x: 50, y: 33 },
          { key: 'shelf', name: 'the bookshelf', x: 80, y: 34 },
          { key: 'fire', name: 'the fireplace', x: 30, y: 50 },
          { key: 'plant', name: 'the houseplant', x: 24, y: 64 },
          { key: 'sofa', name: 'the sofa', x: 48, y: 78 },
          { key: 'lamp', name: 'the floor lamp', x: 82, y: 54 },
        ],
      },
      {
        id: 'kitchen', name: 'Kitchen', art: 'house-kitchen',
        spots: [
          { key: 'pots', name: 'the hanging pots', x: 50, y: 14 },
          { key: 'fridge', name: 'the fridge', x: 16, y: 46 },
          { key: 'window', name: 'the window', x: 80, y: 33 },
          { key: 'stove', name: 'the stove', x: 38, y: 53 },
          { key: 'sink', name: 'the sink', x: 54, y: 58 },
          { key: 'bowl', name: 'the fruit bowl', x: 66, y: 54 },
          { key: 'kettle', name: 'the kettle', x: 78, y: 53 },
          { key: 'table', name: 'the kitchen table', x: 50, y: 84 },
        ],
      },
      {
        id: 'bedroom', name: 'Bedroom', art: 'house-bedroom',
        spots: [
          { key: 'window', name: 'the window', x: 52, y: 25 },
          { key: 'wardrobe', name: 'the wardrobe', x: 16, y: 44 },
          { key: 'dresser', name: 'the dresser', x: 74, y: 42 },
          { key: 'lamp', name: 'the bedside lamp', x: 30, y: 54 },
          { key: 'desk', name: 'the desk', x: 81, y: 64 },
          { key: 'mirror', name: 'the mirror', x: 18, y: 72 },
          { key: 'bed', name: 'the bed', x: 50, y: 74 },
          { key: 'rug', name: 'the soft rug', x: 50, y: 92 },
        ],
      },
    ],
  },
};

// Build a ready-made palace into the generic palace model used everywhere.
function buildReadyPalace(id) {
  const cfg = READY[id];
  if (!cfg) return null;
  return {
    id, name: cfg.name, kind: 'builtin', emoji: cfg.emoji,
    rooms: cfg.rooms.map((r) => ({
      id: r.id, name: r.name, type: 'svg', art: r.art,
      spots: r.spots.map((s, i) => ({ id: r.id + '-' + s.key, localN: i + 1, x: s.x, y: s.y, name: s.name })),
    })),
  };
}

// quick spot count for a ready palace, without fully building it
function readySpotCount(id) {
  const cfg = READY[id];
  return cfg ? cfg.rooms.reduce((n, r) => n + r.spots.length, 0) : 0;
}

// Built-in Treehouse (now a 3-room, 30-spot palace).
function buildTreehousePalace() { return buildReadyPalace('treehouse'); }

// Flatten a palace's rooms into one ordered list of spots, each tagged
// with its room so the scene can show the right backdrop.
function flattenSpots(palace) {
  const out = [];
  palace.rooms.forEach((room, ri) => {
    room.spots.forEach((sp) => {
      out.push({
        ...sp,
        roomId: room.id, roomIndex: ri,
        globalN: out.length + 1,
        name: sp.name || (room.name + ' \u00b7 spot ' + sp.localN),
      });
    });
  });
  return out;
}

function totalSpots(palace) { return palace.rooms.reduce((n, r) => n + r.spots.length, 0); }

// Warm colour cycle for imported items (which have no colour of their own).
const ITEM_COLORS = ['#C8612C', '#5C8A6E', '#C9A24B', '#4C8FBF', '#A8602F', '#7B6CB0', '#CE6A8E', '#3E8E9E'];
function colorFor(i) { return ITEM_COLORS[i % ITEM_COLORS.length]; }

// Templated coaching prompts for imported lists (no hand-written art).
const PROMPT_TEMPLATES = [
  (item, spot) => `Picture a GIANT ${item} sitting right on ${spot} \u2014 so big it barely fits!`,
  (item, spot) => `Imagine ${item} doing something silly at ${spot}. Is it dancing? Glowing? Make it weird!`,
  (item, spot) => `See ${item} crash into ${spot} with a huge SPLAT. The sillier, the stickier!`,
  (item, spot) => `Picture ${item} bright and sparkly at ${spot}, making a funny noise.`,
  (item, spot) => `Imagine ${item} is alive and waving at you from ${spot}!`,
];
function promptFor(item, spot, index) {
  if (item && item.system === 'number') {
    const pegBit = item.peg ? ` Many people picture “${item.peg}”.` : '';
    return `Turn ${item.answer} into a picture using its sounds (${item.sounds}) and place it at ${spot.name}.${pegBit}`;
  }
  if (item && item.system === 'card') {
    return `Make the ${item.rank} of ${item.suitName} into a vivid character — try ${item.rankWord} with ${item.suitWord} — and stand it at ${spot.name}.`;
  }
  if (item && item.context) {
    if (item.isVocab) return `Picture “${item.answer}” sitting at ${spot.name}. It means: ${item.context}.`;
    return `See the word “${item.answer}” come alive at ${spot.name} — it’s from your line: “${item.context}”.`;
  }
  if (PLACEMENT_PROMPTS[item.id]) return PLACEMENT_PROMPTS[item.id];
  return PROMPT_TEMPLATES[index % PROMPT_TEMPLATES.length](item.label, spot.name);
}

// ============================================================
// LEARN-A-TEXT — paste a poem / notes / passage / vocab list and the
// system pulls out the pieces to hide. Each item becomes a fill-in-the-
// blank: an `answer` word the child types, with `prompt` (the cloze
// sentence) and `context` (the full source line) for coaching.
// ============================================================
const STOPWORDS = new Set(('a an and the of to in on at for with as is are was were be been being it its this that these those by from he she they we you i his her their our your my me him them us not no do does did has have had will would can could should shall may might into over under out up down off about so if when while which who whom whose what where why how all any each few more most other some such only own same too very just than then there here also but or nor yet because').split(' '));

// pick the single most memorable word in a chunk of text
function pickKeyword(sentence) {
  const words = String(sentence || '').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || [];
  let best = null, bestScore = -1;
  words.forEach((w) => {
    const lw = w.toLowerCase();
    if (STOPWORDS.has(lw)) return;
    let score = Math.min(w.length, 12);
    if (/^[A-Z]/.test(w)) score += 3;
    if (/[0-9]/.test(w)) score += 5;
    if (score > bestScore) { bestScore = score; best = w; }
  });
  return best || (words[words.length - 1] || null);
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// replace the first whole-word occurrence of `answer` with a blank
function makeCloze(context, answer) {
  if (!answer) return context;
  const re = new RegExp('\\b' + escapeRe(answer) + '\\b', 'i');
  return re.test(context) ? context.replace(re, '—————') : context + ' —————';
}

// split pasted text into ordered units (each becomes one spot)
function parseTextUnits(raw, mode) {
  const text = String(raw || '');
  if (mode === 'vocab') {
    return text.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((line) => {
      const m = line.match(/^(.+?)\s*[:\-–—=\t]\s*(.+)$/);
      if (m) return { answer: m[1].trim().slice(0, 40), context: m[2].trim(), isVocab: true };
      return { answer: (line.split(/\s+/)[0] || line).slice(0, 40), context: line, isVocab: true };
    });
  }
  let segs;
  if (mode === 'poem') segs = text.split(/\n+/);
  else segs = text.split(/(?<=[.!?…])\s+|\n+/); // notes / passage → sentences
  return segs.map((s) => s.trim()).filter((s) => s.replace(/[^A-Za-z0-9]/g, '').length > 1).map((s) => ({
    context: s, answer: pickKeyword(s), isVocab: false,
  }));
}

function scoreUnit(u) {
  const w = u.answer || '';
  let s = Math.min(w.length, 12);
  if (/^[A-Z]/.test(w)) s += 3;
  if (/[0-9]/.test(w)) s += 5;
  return s;
}

// which unit indices survive the auto-trim to fit `cap` spots
function keptUnitIndices(units, mode, cap) {
  if (units.length <= cap) return units.map((_, i) => i);
  const sequential = (mode === 'poem' || mode === 'passage');
  if (sequential) return units.slice(0, cap).map((_, i) => i);
  return units.map((u, i) => ({ i, s: scoreUnit(u) }))
    .sort((a, b) => b.s - a.s).slice(0, cap).map((o) => o.i).sort((a, b) => a - b);
}

// build a ready-to-play text list, trimmed to the palace's spot count
function buildTextList({ raw, title, mode, palace, overrides }) {
  const cap = palace ? Math.max(1, totalSpots(palace)) : MAX_ITEMS;
  let units = parseTextUnits(raw, mode);
  if (overrides) units = units.map((u, i) => (overrides[i] ? { ...u, answer: overrides[i] } : u));
  const keep = keptUnitIndices(units, mode, cap);
  const items = keep.map((origIdx, i) => {
    const u = units[origIdx];
    const answer = u.answer || u.context;
    return {
      id: 'tx' + i, label: answer, answer, color: colorFor(i),
      context: u.context, isVocab: !!u.isVocab,
      prompt: u.isVocab ? u.context : makeCloze(u.context, answer),
    };
  });
  return {
    id: 'text-' + Date.now(), kind: 'text', mode,
    title: title || 'My text', subtitle: items.length + ' to remember from your text',
    items,
  };
}

// Turn pasted / uploaded text into a list of up to 100 items.
const MAX_ITEMS = 100;
function parseList(raw, title) {
  const parts = String(raw || '')
    .split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const items = [];
  for (const p of parts) {
    const label = p.slice(0, 40);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id: 'i' + items.length, label, color: colorFor(items.length) });
    if (items.length >= MAX_ITEMS) break;
  }
  return { id: 'list-' + Date.now(), title: title || 'My list', subtitle: items.length + ' things to remember', items };
}

// ============================================================
// SPACED REPETITION — a light Leitner ladder. Each saved set carries an
// `srs` stage; a strong recall bumps it up the ladder (longer gap before the
// next review), a weak one knocks it back down. This is what turns a one-off
// session into something users come back to — and what memory athletes lean
// on to keep dozens of palaces fresh.
// ============================================================
const DAY_MS = 86400000;
const SRS_INTERVALS = [1, 2, 4, 8, 16, 32]; // days until the next review, per stage
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function srsAdvance(stage, accuracy) {
  const s = stage | 0;
  if (accuracy >= 0.8) return Math.min(s + 1, SRS_INTERVALS.length - 1);
  if (accuracy >= 0.5) return s;
  return Math.max(0, s - 1);
}
function srsSchedule(prevStage, accuracy, now) {
  const stage = srsAdvance(prevStage, accuracy);
  return { stage, due: (now || Date.now()) + SRS_INTERVALS[stage] * DAY_MS };
}
// human-friendly "next review" phrase
function dueLabel(due) {
  if (due == null) return '';
  const days = Math.round((startOfDay(due) - startOfDay(Date.now())) / DAY_MS);
  if (days <= 0) return 'now';
  if (days === 1) return 'tomorrow';
  if (days < 7) return 'in ' + days + ' days';
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? 'in a week' : 'in ' + weeks + ' weeks';
}

// ============================================================
// NUMBER MEMORY — the Major System. Each digit maps to a consonant sound;
// you turn a number into a word (and a vivid image) by stringing the sounds
// together and adding vowels. This is the backbone technique competitive
// memorisers use for digits, phone numbers, dates and π. We expose it as a
// content type that feeds the same place / walk / recall engine.
// ============================================================
const MAJOR = [
  { d: '0', cons: 's / z', },
  { d: '1', cons: 't / d' },
  { d: '2', cons: 'n' },
  { d: '3', cons: 'm' },
  { d: '4', cons: 'r' },
  { d: '5', cons: 'l' },
  { d: '6', cons: 'j / sh / ch' },
  { d: '7', cons: 'k / g' },
  { d: '8', cons: 'f / v' },
  { d: '9', cons: 'p / b' },
];
// Beginner-friendly single-digit "number-rhyme" pegs (a gentle on-ramp before
// the full Major System).
const RHYME_PEGS = ['hero', 'bun', 'shoe', 'tree', 'door', 'hive', 'sticks', 'heaven', 'gate', 'wine'];
// A few worked two-digit examples to show the Major System pays off.
const MAJOR_EXAMPLES = { '42': 'rain', '31': 'mat', '90': 'bus', '15': 'towel', '74': 'car', '52': 'lion' };

function majorSounds(chunk) {
  return String(chunk).split('').map((d) => (MAJOR[+d] ? MAJOR[+d].cons : '?')).join(' · ');
}
// turn a raw digit string into an ordered list of 2-digit (Major) chunks
function chunkDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const out = [];
  for (let i = 0; i < digits.length; i += 2) out.push(digits.slice(i, i + 2));
  return out;
}
// build a number list for the generic engine (typed recall: you key the digits)
function buildNumberList({ raw, title, palace }) {
  const cap = palace ? Math.max(1, totalSpots(palace)) : MAX_ITEMS;
  const chunks = chunkDigits(raw).slice(0, cap);
  const items = chunks.map((c, i) => {
    const sounds = majorSounds(c);
    const peg = MAJOR_EXAMPLES[c] || (c.length === 1 ? RHYME_PEGS[+c] : null);
    return {
      id: 'num' + i, label: c, answer: c, color: colorFor(i),
      system: 'number', sounds, peg,
      context: 'Major sounds: ' + sounds + (peg ? ' → e.g. “' + peg + '”' : ''),
      isVocab: true, prompt: sounds,
    };
  });
  return {
    id: 'num-' + Date.now(), kind: 'text', mode: 'number', system: 'number',
    title: title || 'A number', subtitle: items.length + ' chunks to remember',
    digits: chunkDigits(raw).join(''), items,
  };
}

// ============================================================
// CARD MEMORY — a beginner-friendly PAO scaffold. Each card becomes an image
// by combining a rank cue with a suit cue (e.g. King of Hearts → a KING who is
// LOVING). Advanced users ignore the suggestion and use their own system; the
// scaffold just gets newcomers placing cards fast. Recall is recognition from
// the cards you placed (pure speed comes from Pro mode's timer).
// ============================================================
const SUITS = [
  { s: '♠', name: 'Spades', color: '#23201C', word: 'a spade/sword' },
  { s: '♥', name: 'Hearts', color: '#C03A2B', word: 'love/a heart' },
  { s: '♦', name: 'Diamonds', color: '#C03A2B', word: 'a diamond/ring' },
  { s: '♣', name: 'Clubs', color: '#23201C', word: 'a clover/club' },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// concrete, number-shape-flavoured cue per rank (the "person/object" seed)
const RANK_WORD = {
  A: 'an ace pilot', '2': 'a swan', '3': 'a butterfly', '4': 'a sailboat', '5': 'a hand',
  '6': 'a snake', '7': 'a cliff', '8': 'a snowman', '9': 'a balloon', '10': 'a bat & ball',
  J: 'a joker', Q: 'a queen', K: 'a king',
};

function makeDeck() {
  const d = [];
  SUITS.forEach((su) => RANKS.forEach((r) => d.push({ rank: r, suit: su.s, suitName: su.name, color: su.color })));
  return d;
}
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// build a card list for the generic engine (recognition recall from a pool)
function buildCardList({ cards, title, palace }) {
  const cap = palace ? Math.max(1, totalSpots(palace)) : 52;
  const deck = (cards && cards.length ? cards : shuffled(makeDeck())).slice(0, cap);
  const items = deck.map((c, i) => ({
    id: 'card' + i + '-' + c.rank + c.suit,
    label: c.rank, emoji: c.suit, color: c.color,
    system: 'card', rank: c.rank, suit: c.suit, suitName: c.suitName,
    rankWord: RANK_WORD[c.rank], suitWord: (SUITS.find((s) => s.s === c.suit) || {}).word,
  }));
  return {
    id: 'cards-' + Date.now(), kind: 'cards', system: 'card',
    title: title || 'A deck of cards', subtitle: items.length + ' cards to remember', items,
  };
}

// ---- localStorage (saved ON THIS DEVICE only) -------------------------------
const STORE = { PAL: 'memora.palaces.v1', LIST: 'memora.lists.v1', SAVED: 'memora.saved.v1', STATS: 'memora.stats.v1' };
function loadJSON(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

const Store = {
  palaces() { return loadJSON(STORE.PAL, []); },
  lists() { return loadJSON(STORE.LIST, []); },
  saved() { return loadJSON(STORE.SAVED, []); },
  upsertPalace(p) { const a = this.palaces().filter((x) => x.id !== p.id); a.unshift(p); return saveJSON(STORE.PAL, a); },
  upsertList(l) { const a = this.lists().filter((x) => x.id !== l.id); a.unshift(l); return saveJSON(STORE.LIST, a); },
  removeList(id) { saveJSON(STORE.LIST, this.lists().filter((x) => x.id !== id)); },
  removePalace(id) { saveJSON(STORE.PAL, this.palaces().filter((x) => x.id !== id)); saveJSON(STORE.SAVED, this.saved().filter((s) => s.palaceId !== id)); },
  // a "saved set" = a palace + list + the items placed into it (resumable)
  upsertSaved(set) { const a = this.saved().filter((x) => x.id !== set.id); a.unshift(set); return saveJSON(STORE.SAVED, a); },
  removeSaved(id) { saveJSON(STORE.SAVED, this.saved().filter((x) => x.id !== id)); },
  // practice stats + daily streak (drives the Home strip & celebration)
  stats() { return loadJSON(STORE.STATS, { streak: 0, longest: 0, lastDay: 0, sessions: 0 }); },
  recordPractice() {
    const s = this.stats();
    const today = startOfDay(Date.now());
    if (s.lastDay !== today) {
      s.streak = (today - s.lastDay === DAY_MS) ? (s.streak || 0) + 1 : 1;
      s.longest = Math.max(s.longest || 0, s.streak);
      s.lastDay = today;
    }
    s.sessions = (s.sessions || 0) + 1;
    saveJSON(STORE.STATS, s);
    return s;
  },
  // saved sets whose next review has come due, soonest first
  dueSets(at) {
    const now = at || Date.now();
    return this.saved()
      .filter((x) => x.srs && x.srs.due != null && x.srs.due <= now)
      .sort((a, b) => (a.srs.due || 0) - (b.srs.due || 0));
  },
  resolvePalace(ref) {
    if (ref && ref.kind === 'builtin') return buildTreehousePalace();
    return this.palaces().find((p) => p.id === (ref && ref.id ? ref.id : ref)) || null;
  },
};

// A friendly one-line recall cue (used in the walk + recall hints).
const SPOT_OF = {}; // built below
TREEHOUSE_SPOTS.forEach((s, i) => { SPOT_OF[PLANET_LIST.items[i].id] = s; });

Object.assign(window, {
  PALACES,
  READY,
  PLANET_LIST,
  TREEHOUSE_SPOTS,
  PLACEMENT_PROMPTS,
  SPOT_OF,
  buildReadyPalace,
  readySpotCount,
  buildTreehousePalace,
  flattenSpots,
  totalSpots,
  colorFor,
  promptFor,
  pickKeyword,
  makeCloze,
  parseTextUnits,
  keptUnitIndices,
  scoreUnit,
  buildTextList,
  parseList,
  MAX_ITEMS,
  Store,
  SRS_INTERVALS,
  srsAdvance,
  srsSchedule,
  dueLabel,
  startOfDay,
  DAY_MS,
  MAJOR,
  RHYME_PEGS,
  MAJOR_EXAMPLES,
  majorSounds,
  chunkDigits,
  buildNumberList,
  SUITS,
  RANKS,
  RANK_WORD,
  makeDeck,
  shuffled,
  buildCardList,
});

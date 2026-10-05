/**
 * Original, chunky vector chess pieces (drawn for this project, not copied from any set).
 * Each piece is a union of simple shapes in a 100x100 box. They are drawn twice: first fat in the
 * outline colour, then in the fill colour, which gives one clean outline around the whole piece.
 */
type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const BASE = '<rect x="24" y="78" width="52" height="12" rx="6"/>';

const SHAPES: Record<Kind, { body: string; detail?: string }> = {
  p: {
    body: `<circle cx="50" cy="31" r="14"/><path d="M37 52 Q50 42 63 52 L69 79 H31 Z"/>${BASE}`,
  },
  r: {
    body: `<path d="M27 20 H40 V31 H45 V20 H55 V31 H60 V20 H73 V46 L66 53 V79 H34 V53 L27 46 Z"/>${BASE}`,
    detail: '<path d="M34 53 H66" />',
  },
  b: {
    body: `<path d="M50 15 C63 26 68 39 61 51 C68 58 69 69 67 79 H33 C31 69 32 58 39 51 C32 39 37 26 50 15 Z"/><circle cx="50" cy="13" r="6"/>${BASE}`,
    detail: '<path d="M43 40 L57 27"/>',
  },
  n: {
    body: `<path d="M71 79 H31 C30 62 37 52 46 46 C37 47 30 43 25 36 L33 24 C37 22 40 18 44 12 L49 19 C60 17 72 25 73 46 C74 58 73 69 71 79 Z"/>${BASE}`,
    detail: '<circle cx="52" cy="29" r="2.6"/>',
  },
  q: {
    body: `<path d="M29 79 L22 35 L37 52 L50 26 L63 52 L78 35 L71 79 Z"/><circle cx="22" cy="31" r="6"/><circle cx="50" cy="21" r="6.5"/><circle cx="78" cy="31" r="6"/>${BASE}`,
    detail: '<path d="M33 67 H67"/>',
  },
  k: {
    body: `<path d="M33 79 C30 62 35 51 43 45 H57 C65 51 70 62 67 79 Z"/><rect x="45.5" y="10" width="9" height="31" rx="3"/><rect x="37" y="19" width="26" height="9" rx="3"/>${BASE}`,
    detail: '<path d="M36 66 H64"/>',
  },
};

export interface PieceStyle {
  fill: string;
  outline: string;
  detail: string;
}

export const WHITE_STYLE: PieceStyle = { fill: '#fffdf6', outline: '#1d2a35', detail: '#1d2a35' };
export const BLACK_STYLE: PieceStyle = { fill: '#2a3550', outline: '#f4f1e6', detail: '#f4f1e6' };

/** SVG markup for one piece. `color` is 'w' or 'b'. */
export function pieceSvg(color: 'w' | 'b', kind: Kind, cls = 'piece'): string {
  const st = color === 'w' ? WHITE_STYLE : BLACK_STYLE;
  const s = SHAPES[kind];
  return (
    `<svg class="${cls} ${color === 'w' ? 'wp' : 'bp'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
    `<g fill="${st.outline}" stroke="${st.outline}" stroke-width="7" stroke-linejoin="round">${s.body}</g>` +
    `<g fill="${st.fill}">${s.body}</g>` +
    (s.detail ? `<g fill="${st.detail}" stroke="${st.detail}" stroke-width="3.2" stroke-linecap="round">${s.detail}</g>` : '') +
    `</svg>`
  );
}

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { moveFromUci } from './pgn';

export const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
export const opp = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const sq = (s: string) => s as Square;
export const pieceAt = (c: Chess, s: string) => c.get(sq(s));

export interface Threat {
  square: string;
  type: PieceSymbol;
  reason: 'undefended' | 'cheaper';
}

/** `color`'s pieces (not king) that the other side can win by capturing: undefended, or attacked by a cheaper piece. */
export function threatenedPieces(fen: string, color: Color): Threat[] {
  const c = new Chess(fen);
  const out: Threat[] = [];
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue;
      const attackers = c.attackers(p.square, opp(color));
      if (attackers.length === 0) continue;
      if (c.attackers(p.square, color).length === 0) {
        out.push({ square: p.square, type: p.type, reason: 'undefended' });
        continue;
      }
      const cheapest = Math.min(...attackers.map((a) => VALUE[c.get(a)!.type]));
      if (cheapest < VALUE[p.type]) out.push({ square: p.square, type: p.type, reason: 'cheaper' });
    }
  }
  return out;
}

/** Enemy pieces attacked by the piece on `from` that are worth attacking (king, undefended, or bigger). */
export function forkTargets(fen: string, from: string): string[] {
  const c = new Chess(fen);
  const mover = pieceAt(c, from);
  if (!mover || mover.type === 'k') return [];
  const targets: string[] = [];
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color === mover.color) continue;
      if (!c.attackers(p.square, mover.color).includes(sq(from))) continue;
      const undefended = c.attackers(p.square, p.color).length === 0;
      if (p.type === 'k' || undefended || VALUE[p.type] > VALUE[mover.type]) targets.push(p.square);
    }
  }
  return targets;
}

export function describePiece(c: Chess, s: string): string {
  const p = pieceAt(c, s);
  return p ? `${NAME[p.type]} on ${s}` : s;
}

export function describeFork(fen: string, to: string): string | null {
  const t = forkTargets(fen, to);
  if (t.length < 2) return null;
  const c = new Chess(fen);
  const names = t.slice(0, 3).map((s) => describePiece(c, s));
  return `forks the ${names.slice(0, -1).join(', the ')} and the ${names[names.length - 1]}`;
}

/** Material (pawn = 1, minor = 3, rook = 5, queen = 9) of each side. */
export function material(fen: string): { w: number; b: number } {
  const out = { w: 0, b: 0 };
  for (const row of new Chess(fen).board()) for (const p of row) if (p && p.type !== 'k') out[p.color] += VALUE[p.type];
  return out;
}

/** Plain-words material balance from `mine`'s point of view. */
export function materialLabel(fen: string, mine: Color): string {
  const m = material(fen);
  const d = m[mine] - m[opp(mine)];
  if (d === 0) return 'material is equal';
  const n = Math.abs(d);
  const what = n >= 9 ? 'a queen' : n >= 5 ? 'a rook' : n >= 3 ? 'a minor piece' : n === 1 ? 'a pawn' : `${n} pawns`;
  return d > 0 ? `you are up ${what}` : `you are down ${what}`;
}

export interface PlayedLine {
  sans: string[];
  moves: Move[];
  /** FEN before each move, plus the final FEN at the end. */
  fens: string[];
}

/** Play a UCI line from `fen`, stopping at the first illegal move. */
export function playLine(fen: string, line: string[], max = 99): PlayedLine {
  const c = new Chess(fen);
  const out: PlayedLine = { sans: [], moves: [], fens: [fen] };
  for (const u of line.slice(0, max)) {
    try {
      const m = moveFromUci(c, u);
      out.sans.push(m.san);
      out.moves.push(m);
      out.fens.push(c.fen());
    } catch {
      break;
    }
  }
  return out;
}

/** Net material change for `color` along a played line (captures only). Positive = `color` wins material. */
export function materialSwing(line: PlayedLine, color: Color): number {
  let n = 0;
  for (const m of line.moves) {
    if (!m.captured) continue;
    const v = VALUE[m.captured] - (m.promotion ? VALUE[m.promotion] - 1 : 0);
    n += m.color === color ? v : -v;
  }
  return n;
}

/** Passed pawns of `color`: no enemy pawn ahead on the same or adjacent files. */
export function passedPawns(fen: string, color: Color): string[] {
  const c = new Chess(fen);
  const pawns: { f: number; r: number }[] = [];
  const enemy: { f: number; r: number }[] = [];
  for (const row of c.board())
    for (const p of row)
      if (p && p.type === 'p') (p.color === color ? pawns : enemy).push({ f: p.square.charCodeAt(0) - 97, r: Number(p.square[1]) });
  const out: string[] = [];
  for (const p of pawns) {
    const blocked = enemy.some((e) => Math.abs(e.f - p.f) <= 1 && (color === 'w' ? e.r > p.r : e.r < p.r));
    if (!blocked) out.push(String.fromCharCode(97 + p.f) + p.r);
  }
  return out;
}

export function hasFriendlyPawnOnFile(fen: string, color: Color, file: string): boolean {
  const c = new Chess(fen);
  for (let r = 1; r <= 8; r++) {
    const p = c.get(sq(file + r));
    if (p && p.type === 'p' && p.color === color) return true;
  }
  return false;
}

export const kingSquare = (c: Chess, color: Color): string | null => {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
};

/** Is the king of `color` checkmated on its back rank by a rook/queen, with its own pawns boxing it in? */
export function isBackRankMate(fen: string, color: Color): boolean {
  const c = new Chess(fen);
  if (!c.isCheckmate() || c.turn() !== color) return false;
  const k = kingSquare(c, color);
  if (!k) return false;
  const back = color === 'w' ? '1' : '8';
  if (k[1] !== back) return false;
  const front = color === 'w' ? '2' : '7';
  const f = k.charCodeAt(0) - 97;
  let blockedByOwn = 0;
  for (const df of [-1, 0, 1]) {
    const ff = f + df;
    if (ff < 0 || ff > 7) continue;
    const p = c.get(sq(String.fromCharCode(97 + ff) + front));
    if (p && p.color === color) blockedByOwn++;
  }
  return blockedByOwn >= 2;
}

export const chebyshev = (a: string, b: string) =>
  Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

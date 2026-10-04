import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { lineToSan, moveFromUci } from './pgn';
import { isMateFor } from './score';
import type { Moment } from './types';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const opp = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const sq = (s: string) => s as Square;

export interface Explanation {
  headline: string;
  /** Why the played move failed. */
  whyFailed: string[];
  /** What the better move does. */
  whyBetter: string[];
  /** True when no concrete reason could be established from the board. */
  limited: boolean;
  /** A theme we are confident about (for puzzle matching), else undefined. */
  theme?: 'fork' | 'mate' | 'hangingPiece';
}

const pieceAt = (c: Chess, s: string) => c.get(sq(s));
const desc = (c: Chess, s: string) => {
  const p = pieceAt(c, s);
  return p ? `${NAME[p.type]} on ${s}` : s;
};

/** My pieces (not king) the other side can win by capturing: undefended, or attacked by a cheaper piece. */
export function threatenedPieces(fen: string, color: Color): { square: string; type: PieceSymbol; reason: 'undefended' | 'cheaper' }[] {
  const c = new Chess(fen);
  const out: { square: string; type: PieceSymbol; reason: 'undefended' | 'cheaper' }[] = [];
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

export function describeFork(fen: string, to: string): string | null {
  const t = forkTargets(fen, to);
  if (t.length < 2) return null;
  const c = new Chess(fen);
  const names = t.slice(0, 3).map((s) => desc(c, s));
  return `forks the ${names.slice(0, -1).join(', the ')} and the ${names[names.length - 1]}`;
}

/** Short facts about what a move does on the board. */
function moveFacts(fen: string, u: string) {
  const c = new Chess(fen);
  const facts: string[] = [];
  const m = moveFromUci(c, u);
  let capture = false;
  if (m.captured) {
    capture = true;
    const defended = c.attackers(m.to, opp(m.color)).length > 0;
    facts.push(`captures the ${defended ? '' : 'unprotected '}${NAME[m.captured]} on ${m.to}`);
  }
  const mate = c.isCheckmate();
  if (mate) facts.push('gives checkmate');
  else if (c.inCheck()) facts.push('gives check');
  const fork = mate ? null : describeFork(c.fen(), m.to);
  if (fork) facts.push(fork);
  return { facts, fork: !!fork, capture, mate };
}

export function explainMoment(m: Moment): Explanation {
  const mine = m.myColor;
  const them = opp(mine);
  const whyFailed: string[] = [];
  const whyBetter: string[] = [];
  let theme: Explanation['theme'];

  const before = new Chess(m.fen);
  const playedFrom = m.playedUci.slice(0, 2);
  const playedPiece = pieceAt(before, playedFrom)!;
  const played = new Chess(m.fen);
  const pm = moveFromUci(played, m.playedUci);
  const fenAfter = played.fen();

  // ---- why the played move failed -----------------------------------------
  if (m.kind === 'allowedMate') {
    const san = lineToSan(fenAfter, m.refutation);
    whyFailed.push(`After ${m.playedSan}, your opponent has a forced checkmate${san.length ? `: ${san.join(' ')}` : ''}.`);
    theme = 'mate';
  } else if (m.refutation[0]) {
    const reply = m.refutation[0];
    const rc = new Chess(fenAfter);
    const rp = pieceAt(rc, reply.slice(0, 2));
    const cap = pieceAt(rc, reply.slice(2, 4));
    const target = reply.slice(2, 4);
    const rm = moveFromUci(rc, reply);
    if (cap && cap.color === mine && rp) {
      const unprotected = new Chess(fenAfter).attackers(sq(target), mine).length === 0;
      const cheaper = VALUE[rp.type] < VALUE[cap.type];
      if (unprotected || cheaper) {
        whyFailed.push(
          `After ${m.playedSan}, your ${NAME[cap.type]} on ${target} can be captured by the opponent's ${NAME[rp.type]} (${rm.san})` +
            (unprotected ? ', and nothing of yours protects it.' : ', which wins material because the capturing piece is worth less.'),
        );
        const movedItself = m.playedUci.slice(2, 4) === target || playedFrom === target;
        if (!movedItself && before.attackers(sq(target), mine).includes(sq(playedFrom))) {
          whyFailed.push(
            `Before the move, your ${NAME[playedPiece.type]} on ${playedFrom} was protecting that ${NAME[cap.type]}. Moving it away removed the protection.`,
          );
        } else if (!movedItself && before.attackers(sq(target), them).length > 0) {
          whyFailed.push(`That ${NAME[cap.type]} was already under attack, and ${m.playedSan} did not deal with it.`);
        } else if (movedItself && pm.captured) {
          whyFailed.push(
            `${m.playedSan} won a ${NAME[pm.captured]} but cost you the ${NAME[cap.type]}: you give up about ${VALUE[cap.type]} points of material for ${VALUE[pm.captured]}.`,
          );
        } else if (movedItself) {
          whyFailed.push(`The ${NAME[cap.type]} ended up on a square where it can be taken.`);
        }
        theme = 'hangingPiece';
      }
    } else if (rp && !rm.captured) {
      const fork = describeFork(rc.fen(), rm.to);
      if (fork) {
        whyFailed.push(`The opponent's reply ${rm.san} ${fork}.`);
        theme = 'fork';
      } else if (rc.inCheck()) {
        whyFailed.push(`The opponent's reply ${rm.san} gives check and takes the initiative.`);
      }
    }
  }
  if (whyFailed.length === 0 && pm.captured) {
    whyFailed.push(`${m.playedSan} wins a ${NAME[pm.captured]}, but the engine line shows the opponent gets more back.`);
  }

  // ---- what the better move does ------------------------------------------
  if (m.kind === 'missedMate' || isMateFor(m.before)) {
    const san = lineToSan(m.fen, m.bestLine);
    whyBetter.push(`You had a forced checkmate${san.length ? `: ${san.join(' ')}` : ''}.`);
    theme = 'mate';
  } else {
    const bf = moveFacts(m.fen, m.bestUci);
    if (bf.facts.length) whyBetter.push(`${m.bestSan} ${bf.facts.join(' and ')}.`);
    if (bf.fork) theme ??= 'fork';
    if (bf.capture && !bf.fork && !bf.mate) theme ??= 'hangingPiece';
    const threatsBefore = threatenedPieces(m.fen, mine);
    const bc = new Chess(m.fen);
    moveFromUci(bc, m.bestUci);
    const threatsAfter = threatenedPieces(bc.fen(), mine).map((t) => t.square);
    const bestFrom = m.bestUci.slice(0, 2);
    const solved = threatsBefore.filter((t) => t.square === bestFrom || !threatsAfter.includes(t.square));
    if (solved.length) {
      const t = solved[0];
      whyBetter.push(
        t.square === bestFrom
          ? `${m.bestSan} moves your ${NAME[t.type]} on ${t.square} out of danger.`
          : `${m.bestSan} protects or saves your ${NAME[t.type]} on ${t.square}, which was under threat.`,
      );
    }
    if (m.kind === 'allowedMate' && whyBetter.length === 0) {
      whyBetter.push(`${m.bestSan} does not allow that forced mate, so your king stays safe.`);
    }
  }

  if (whyFailed.length && whyBetter.length === 0) {
    whyBetter.push(`${m.bestSan} avoids that loss. I can't name one simple reason beyond that, so study the engine line below.`);
  }
  const limited = whyFailed.length === 0 && whyBetter.length === 0;
  const headline =
    m.kind === 'allowedMate'
      ? `${m.playedSan} allows a forced checkmate.`
      : m.kind === 'missedMate'
        ? `${m.playedSan} misses a forced checkmate.`
        : `${m.playedSan} loses about ${(m.loss / 100).toFixed(1)} pawns of advantage (engine estimate).`;
  return { headline, whyFailed, whyBetter, limited, theme: limited ? undefined : theme };
}

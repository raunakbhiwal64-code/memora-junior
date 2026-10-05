import { Chess, type Color } from 'chess.js';
import { NAME, VALUE, chebyshev, describeFork, hasFriendlyPawnOnFile, isBackRankMate, kingSquare, material, materialSwing, opp, passedPawns, pieceAt, playLine, sq, threatenedPieces } from './facts';
import { moveFromUci } from './pgn';
import { describeScore } from './score';
import type { MomentKind, Score } from './types';
import type { Phase } from './phase';

/** The only tags the app will ever assign. A tag needs concrete board / engine-line evidence. */
export const TAGS = [
  'hung piece',
  'knight fork',
  'missed check/capture/threat scan',
  'forcing move without capture-check',
  'king safety / castling into attack',
  'early queen move',
  'loosening pawn move',
  'missed pawn break',
  'rook placement',
  'missed tactic (other)',
  'allowed mate threat',
  'endgame technique: king activity',
  'endgame technique: opposition',
  'endgame technique: rook behind passed pawn',
  'endgame technique: passed-pawn race',
  'endgame technique: wrong trade',
  'endgame technique: missed win/draw',
] as const;
export type PatternTag = (typeof TAGS)[number];

export interface TagInput {
  fen: string;
  color: Color;
  moveNumber: number;
  phase: Phase;
  playedUci: string;
  playedSan: string;
  bestUci: string;
  bestSan: string;
  bestLine: string[];
  /** Opponent's line after my played move. */
  refutation: string[];
  kind: MomentKind;
  loss: number;
  /** Best root score and played root score, my point of view. */
  before: Score;
  after: Score;
  /** The opponent's previous move, if there was one. */
  lastOpponent?: { uci: string; san: string };
}

export interface TagResult {
  tag: PatternTag;
  evidence: string;
  /** Lichess puzzle theme this mechanism can honestly be matched to. */
  theme?: string;
}

const centreDist = (s: string) => Math.min(...['d4', 'e4', 'd5', 'e5'].map((c) => chebyshev(s, c)));

function mateTheme(n: number): string | undefined {
  return n <= 1 ? 'mateIn1' : n === 2 ? 'mateIn2' : undefined;
}

export function tagMoment(i: TagInput): TagResult | null {
  const mine = i.color;
  const them = opp(mine);
  const before = new Chess(i.fen);
  const playedPiece = pieceAt(before, i.playedUci.slice(0, 2));
  if (!playedPiece) return null;
  const clone = new Chess(i.fen);
  const pm = moveFromUci(clone, i.playedUci);
  const fenAfter = clone.fen();
  const givesCheck = clone.inCheck();
  const ref = playLine(fenAfter, i.refutation, 6);
  const best = playLine(i.fen, i.bestLine, 6);

  // ---- mate -------------------------------------------------------------
  if (i.kind === 'allowedMate') {
    const n = Math.max(1, Math.round(Math.abs(i.after.mate ?? 1)));
    const matedAt = ref.fens.findIndex((f) => new Chess(f).isCheckmate());
    const final = matedAt > 0 ? ref.fens[matedAt] : undefined;
    const line = matedAt > 0 ? ref.sans.slice(0, matedAt).join(' ') : ref.sans.join(' ');
    const evidence = `After ${i.playedSan} the engine finds a forced mate in ${n}${line ? `: ${line}${matedAt > 0 ? '' : ' …'}` : ''}.`;
    return { tag: 'allowed mate threat', evidence, theme: final && isBackRankMate(final, mine) ? 'backRankMate' : mateTheme(n) };
  }
  if (i.kind === 'missedMate') {
    const n = Math.max(1, Math.round(Math.abs(i.before.mate ?? 1)));
    return { tag: 'missed tactic (other)', evidence: `You had a forced mate in ${n}: ${best.sans.join(' ')}.`, theme: mateTheme(n) };
  }

  // ---- what the opponent's best reply does -------------------------------
  const r1 = ref.moves[0];
  if (r1) {
    // knight fork (needs the fork AND follow-through in the line)
    const forkText = r1.piece === 'n' ? describeFork(ref.fens[1], r1.to) : null;
    const followThrough = materialSwing({ ...ref, moves: ref.moves.slice(0, 3) }, them) >= 2;
    if (forkText && followThrough) {
      return { tag: 'knight fork', evidence: `${r1.san} ${forkText}, and the line ${ref.sans.slice(0, 4).join(' ')} wins material.`, theme: 'fork' };
    }
    if (r1.captured && r1.color === them) {
      const target = r1.to;
      const moved = pm.to === target; // my played piece itself stands there
      const defendersAfter = new Chess(fenAfter).attackers(sq(target), mine).length;
      const capturerValue = VALUE[r1.piece];
      const hung = defendersAfter === 0 || capturerValue < VALUE[r1.captured];
      const gainedBack = pm.captured ? VALUE[pm.captured] : 0;
      if (hung && VALUE[r1.captured] > gainedBack) {
        const what = `${NAME[r1.captured]} on ${target}`;
        const how = defendersAfter === 0 ? 'unprotected' : 'attackable by a cheaper piece';
        const wasAttacked = !moved && threatenedPieces(i.fen, mine).some((t) => t.square === target);
        if (i.lastOpponent && wasAttacked) {
          return {
            tag: 'missed check/capture/threat scan',
            evidence: `${i.lastOpponent.san} attacked your ${what}. ${i.playedSan} did not deal with it, and ${r1.san} won it.`,
            theme: 'hangingPiece',
          };
        }
        if (pm.captured || givesCheck) {
          return {
            tag: 'forcing move without capture-check',
            evidence: `${i.playedSan} was a ${givesCheck && !pm.captured ? 'check' : 'capture'}, but it left your ${what} ${how}, and ${r1.san} simply took it.`,
            theme: 'hangingPiece',
          };
        }
        return { tag: 'hung piece', evidence: `${i.playedSan} left your ${what} ${how}; ${r1.san} wins it.`, theme: 'hangingPiece' };
      }
    }
    // a fork by another piece is a threat I failed to scan for
    const otherFork = r1.piece !== 'n' && !r1.captured ? describeFork(ref.fens[1], r1.to) : null;
    if (otherFork && materialSwing({ ...ref, moves: ref.moves.slice(0, 3) }, them) >= 2) {
      return {
        tag: 'missed check/capture/threat scan',
        evidence: `${r1.san} ${otherFork}, and the line ${ref.sans.slice(0, 4).join(' ')} wins material.`,
        theme: 'fork',
      };
    }
    // king safety
    const attackOnKing = ref.sans.slice(0, 3).some((s) => /[+#]/.test(s));
    if (pm.san.startsWith('O-O') && attackOnKing) {
      return { tag: 'king safety / castling into attack', evidence: `After ${i.playedSan}: ${ref.sans.slice(0, 4).join(' ')}. Castling put the king straight under attack.` };
    }
    const k = kingSquare(before, mine);
    const kingSide = k ? (k.charCodeAt(0) >= 101 ? 'fgh' : 'abc') : '';
    if (playedPiece.type === 'p' && kingSide.includes(i.playedUci[0]) && k && Math.abs(k.charCodeAt(0) - i.playedUci.charCodeAt(0)) <= 2 && (k[1] === '1' || k[1] === '8') && attackOnKing) {
      return { tag: 'loosening pawn move', evidence: `${i.playedSan} moved a pawn in front of your king; then ${ref.sans.slice(0, 4).join(' ')} attacks the king.` };
    }
    if (playedPiece.type === 'q' && i.moveNumber <= 10) {
      const afterReply = new Chess(ref.fens[1]);
      const q = afterReply.get(sq(pm.to));
      const queenAttacked = !!q && q.type === 'q' && q.color === mine && afterReply.attackers(sq(pm.to), them).includes(sq(r1.to));
      if (queenAttacked || /\+/.test(r1.san)) {
        return { tag: 'early queen move', evidence: `The queen came out on move ${i.moveNumber}, and ${r1.san} ${queenAttacked ? 'attacks it' : 'gains a tempo with check'}.` };
      }
    }
  }

  // ---- what the best move would have done --------------------------------
  const b1 = best.moves[0];
  if (!b1) return null;
  if (i.phase === 'end') {
    const kBefore = kingSquare(before, mine);
    if (i.before.cp !== undefined && i.after.cp !== undefined) {
      if (i.before.cp >= 200 && i.after.cp <= 50) {
        return { tag: 'endgame technique: missed win/draw', evidence: `The position was ${describeScore(i.before)}; ${i.playedSan} let it drop to ${describeScore(i.after)}. ${i.bestSan} kept it.` };
      }
      if (i.before.cp >= -50 && i.after.cp <= -200) {
        return { tag: 'endgame technique: missed win/draw', evidence: `The position was ${describeScore(i.before)}; ${i.playedSan} turned it ${describeScore(i.after)}. ${i.bestSan} held it.` };
      }
    }
    if (b1.piece === 'k' && kBefore && centreDist(b1.to) < centreDist(kBefore)) {
      return { tag: 'endgame technique: king activity', evidence: `${i.bestSan} brings the king toward the centre (${kBefore} to ${b1.to}) instead of ${i.playedSan}.` };
    }
    if (b1.piece === 'r') {
      const file = b1.to[0];
      const pawns = passedPawns(i.fen, mine).filter((p) => p[0] === file && (mine === 'w' ? Number(p[1]) > Number(b1.to[1]) : Number(p[1]) < Number(b1.to[1])));
      if (pawns.length) return { tag: 'endgame technique: rook behind passed pawn', evidence: `${i.bestSan} puts the rook behind your passed pawn on ${pawns[0]}.` };
    }
    if (b1.piece === 'p' && passedPawns(i.fen, mine).includes(b1.from)) {
      return { tag: 'endgame technique: passed-pawn race', evidence: `${i.bestSan} pushes your passed pawn on ${b1.from}.` };
    }
    const onlyKingsPawns = ![...before.board().flat()].some((p) => p && !['k', 'p'].includes(p.type));
    if (onlyKingsPawns && b1.piece === 'k') {
      const kb = new Chess(best.fens[1]);
      const ka = kingSquare(kb, mine);
      const ke = kingSquare(kb, them);
      const kbefore = kingSquare(before, them);
      if (ka && ke && chebyshev(ka, ke) === 2 && (ka[0] === ke[0] || ka[1] === ke[1]) && kBefore && kbefore && !(kBefore[0] === kbefore[0] || kBefore[1] === kbefore[1])) {
        return { tag: 'endgame technique: opposition', evidence: `${i.bestSan} takes the opposition (kings ${ka} and ${ke}).` };
      }
    }
    if (pm.captured && playedPiece.type !== 'p' && !b1.captured && i.loss >= 100) {
      const m = material(fenAfter);
      if (Math.abs(m.w - m.b) <= 1) {
        return { tag: 'endgame technique: wrong trade', evidence: `${i.playedSan} traded off ${NAME[pm.captured]}s; ${i.bestSan} kept the pieces on.` };
      }
    }
  }
  const gain = materialSwing({ ...best, moves: best.moves.slice(0, 4) }, mine);
  if (gain >= 2) {
    let theme: string | undefined;
    if (describeFork(best.fens[1], b1.to) && b1.piece !== 'k') theme = 'fork';
    else if (b1.captured && new Chess(i.fen).attackers(sq(b1.to), them).length === 0) theme = 'hangingPiece';
    return { tag: 'missed tactic (other)', evidence: `${i.bestSan} starts a line that wins material: ${best.sans.slice(0, 4).join(' ')}.`, theme };
  }
  if (b1.piece === 'p' && i.phase !== 'end') {
    const dir = mine === 'w' ? 1 : -1;
    const f = b1.to.charCodeAt(0) - 97;
    const r = Number(b1.to[1]) + dir;
    const targets = [-1, 1]
      .map((df) => String.fromCharCode(97 + f + df) + r)
      .filter((s) => /^[a-h][1-8]$/.test(s))
      .filter((s) => {
        const p = new Chess(best.fens[1]).get(sq(s));
        return p && p.color === them && p.type === 'p';
      });
    if (b1.captured || targets.length) {
      return { tag: 'missed pawn break', evidence: `${i.bestSan} is a pawn break${b1.captured ? ' that captures' : `: it attacks the pawn on ${targets[0]}`}.` };
    }
  }
  if (b1.piece === 'r') {
    const toFile = b1.to[0];
    const fromFile = b1.from[0];
    const ownOnTo = hasFriendlyPawnOnFile(i.fen, mine, toFile);
    const ownOnFrom = hasFriendlyPawnOnFile(i.fen, mine, fromFile);
    if (!ownOnTo && ownOnFrom) {
      return { tag: 'rook placement', evidence: `${i.bestSan} puts the rook on the ${toFile}-file, which has none of your pawns, instead of leaving it behind a pawn.` };
    }
  }
  return null;
}

import type { Color, MomentKind, Score } from './types';

/**
 * All scores handed around the app are from MY colour's point of view, in centipawns (cp) or mate distance.
 * Mate is kept apart from centipawns everywhere. `CAP` is for DISPLAY ONLY (bars, sorting labels), never for arithmetic.
 */
export const CAP = 1000;

/** UCI scores are from the side to move's view. Convert to `mine`'s view. */
export function toMine(score: Score, sideToMove: Color, mine: Color): Score {
  const flip = sideToMove !== mine;
  if (score.mate !== undefined) {
    const sign = score.mate === 0 ? -1 : Math.sign(score.mate);
    const n = Math.abs(score.mate);
    const mineSign = flip ? -sign : sign;
    // mate 0 = the side to move is checkmated; keep it distinguishable from "no mate"
    return { mate: n === 0 ? (mineSign > 0 ? 0.0001 : -0.0001) : mineSign * n };
  }
  const cp = score.cp ?? 0;
  return { cp: flip ? -cp : cp };
}

export const isMateFor = (s: Score) => s.mate !== undefined && s.mate > 0;
export const isMatedAgainst = (s: Score) => s.mate !== undefined && s.mate < 0;

/** Display only: centipawns clamped to [-CAP, CAP]; mate maps to the cap. Never use for loss arithmetic. */
export function capped(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? CAP : -CAP;
  return Math.max(-CAP, Math.min(CAP, s.cp ?? 0));
}

export interface LossResult {
  kind: MomentKind | 'none';
  /** Centipawn loss (cp vs cp only). 0 for mate kinds. */
  loss: number;
  /** Larger = more urgent. Mate kinds outrank any centipawn loss; shorter mates are more urgent. */
  urgency: number;
  /** The best root move was a clearly winning position that the played move threw away (cp only). */
  winningCollapse: boolean;
}

/**
 * Compare my best root move with the move I played, both searched at the same root, same depth,
 * both in MY point of view. Mate is never turned into centipawns.
 */
export function compareRoot(best: Score, played: Score): LossResult {
  const none: LossResult = { kind: 'none', loss: 0, urgency: 0, winningCollapse: false };
  if (isMateFor(best)) {
    if (isMateFor(played)) return none; // still mating; a longer mate is not taught as an error
    const n = Math.max(1, Math.round(Math.abs(best.mate!)));
    return { kind: 'missedMate', loss: 0, urgency: 1_000_000 - n, winningCollapse: false };
  }
  if (isMatedAgainst(best)) return none; // lost anyway
  if (isMatedAgainst(played)) {
    const n = Math.max(1, Math.round(Math.abs(played.mate!)));
    return { kind: 'allowedMate', loss: 0, urgency: 1_000_000 - n, winningCollapse: false };
  }
  if (isMateFor(played)) return none; // cannot happen for a best root move; treated as no loss
  const b = best.cp ?? 0;
  const p = played.cp ?? 0;
  const loss = Math.max(0, b - p);
  return { kind: loss > 0 ? 'cp' : 'none', loss, urgency: loss, winningCollapse: b >= 300 && p <= 100 };
}

export interface Grade {
  ok: boolean;
  /** best = the engine's top move; sound = within tolerance; worse; missed-mate / allows-mate. */
  kind: 'best' | 'sound' | 'worse' | 'missedMate' | 'allowsMate';
  loss: number;
  word: string;
}

/** Grade a practice move by checked loss (default tolerance 30cp), mate-aware. */
export function gradeMove(best: Score, played: Score, isBestMove: boolean, toleranceCp = 30): Grade {
  const r = compareRoot(best, played);
  if (r.kind === 'allowedMate') return { ok: false, kind: 'allowsMate', loss: 0, word: 'This allows a forced checkmate' };
  if (r.kind === 'missedMate') return { ok: false, kind: 'missedMate', loss: 0, word: 'You had a forced checkmate and this lets it go' };
  if (isBestMove || r.loss === 0) return { ok: true, kind: 'best', loss: r.loss, word: 'The engine\'s top choice' };
  if (r.loss <= toleranceCp) return { ok: true, kind: 'sound', loss: r.loss, word: 'A sound alternative' };
  return { ok: false, kind: 'worse', loss: r.loss, word: `This gives up about ${(r.loss / 100).toFixed(1)} pawns` };
}

export function formatScore(s: Score): string {
  if (s.mate !== undefined) {
    const n = Math.round(Math.abs(s.mate));
    if (n === 0) return s.mate > 0 ? 'you give checkmate' : 'you are checkmated';
    return s.mate > 0 ? `mate in ${n}` : `mated in ${n}`;
  }
  const v = (s.cp ?? 0) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

/** Plain words for a score in my view: "equal", "slightly better", "winning"... */
export function describeScore(s: Score): string {
  if (s.mate !== undefined) return s.mate > 0 ? 'a forced mate for you' : 'a forced mate for them';
  const cp = s.cp ?? 0;
  const a = Math.abs(cp);
  const side = cp > 0 ? 'better' : 'worse';
  if (a < 30) return 'equal';
  if (a < 100) return `slightly ${side}`;
  if (a < 250) return cp > 0 ? 'clearly better' : 'clearly worse';
  if (a < 500) return cp > 0 ? 'much better' : 'much worse';
  return cp > 0 ? 'winning' : 'lost';
}

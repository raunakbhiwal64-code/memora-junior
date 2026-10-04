import type { Color, MomentKind, Score } from './types';

/** Cap used when comparing evaluations, so a "mate" never dwarfs ordinary losses. */
export const CAP = 1000;
/** Positions already this decided are not teachable (still winning / already lost). */
export const DECIDED = 700;

/** UCI scores are from the side to move's view. Convert to `mine`'s view. */
export function toMine(score: Score, sideToMove: Color, mine: Color): Score {
  const flip = sideToMove !== mine;
  if (score.mate !== undefined) {
    const sign = score.mate === 0 ? -1 : Math.sign(score.mate);
    const n = Math.abs(score.mate);
    const mineSign = flip ? -sign : sign;
    // keep "mate 0" (already checkmated) distinguishable: mine mated => mate 0 with negative flag
    return { mate: n === 0 ? (mineSign > 0 ? 0.0001 : -0.0001) : mineSign * n };
  }
  const cp = score.cp ?? 0;
  return { cp: flip ? -cp : cp };
}

export const isMateFor = (s: Score) => s.mate !== undefined && s.mate > 0;
export const isMatedAgainst = (s: Score) => s.mate !== undefined && s.mate < 0;

/** Centipawns clamped to [-CAP, CAP]; mate scores map to the cap. */
export function capped(s: Score): number {
  if (s.mate !== undefined) return s.mate > 0 ? CAP : -CAP;
  return Math.max(-CAP, Math.min(CAP, s.cp ?? 0));
}

export interface LossResult {
  kind: MomentKind | 'none';
  /** Larger = worse. Mate kinds are ranked above any centipawn loss. */
  loss: number;
}

/** Compare my score before and after my move (both in MY point of view). */
export function classifyLoss(before: Score, after: Score): LossResult {
  if (isMateFor(before) && !isMateFor(after) && capped(after) < 600) {
    return { kind: 'missedMate', loss: 2000 };
  }
  if (isMatedAgainst(after) && !isMatedAgainst(before)) {
    return { kind: 'allowedMate', loss: 2000 };
  }
  const b = capped(before);
  const a = capped(after);
  if (a >= DECIDED || b <= -DECIDED) return { kind: 'none', loss: Math.max(0, b - a) };
  const loss = b - a;
  return { kind: loss > 0 ? 'cp' : 'none', loss: Math.max(0, loss) };
}

export function isMeaningful(r: LossResult, thresholdCp: number): boolean {
  return r.kind === 'missedMate' || r.kind === 'allowedMate' || (r.kind === 'cp' && r.loss >= thresholdCp);
}

/** Plain-language verdict for a practice move (loss in my point of view). */
export function judgeMove(before: Score, after: Score): { word: string; good: boolean; loss: number } {
  const r = classifyLoss(before, after);
  if (r.kind === 'allowedMate') return { word: 'Blunder: this allows a forced checkmate', good: false, loss: r.loss };
  if (r.kind === 'missedMate') return { word: 'You had a forced mate and this lets it go', good: false, loss: r.loss };
  const loss = r.loss;
  if (loss <= 40) return { word: 'Good move', good: true, loss };
  if (loss <= 120) return { word: 'Playable, but a little worse than the best', good: true, loss };
  if (loss <= 300) return { word: 'A mistake: it gives away a lot', good: false, loss };
  return { word: 'A blunder: it gives away a lot', good: false, loss };
}

export function formatScore(s: Score): string {
  if (s.mate !== undefined) {
    const n = Math.round(Math.abs(s.mate));
    return s.mate > 0 ? `mate in ${n || 0}` : `mated in ${n || 0}`;
  }
  const v = (s.cp ?? 0) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

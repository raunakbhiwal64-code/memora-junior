/**
 * Game phase of a position, from the FEN alone. These are tunable heuristics, not chess-theory claims.
 * Every classification carries its reason, and a manual override can replace it.
 */
export type Phase = 'opening' | 'middle' | 'end';

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'opening', label: 'Opening' },
  { id: 'middle', label: 'Middle game' },
  { id: 'end', label: 'End game' },
];

export const PHASE_LABEL: Record<Phase, string> = { opening: 'Opening', middle: 'Middle game', end: 'End game' };

/** Tunable defaults (stored with each result so they can be reviewed). */
export const PHASE_DEFAULTS = {
  /** Opening = fullmoves 1..this while the opening structure applies. */
  openingLastMove: 12,
  /** End game (no queens): knights, bishops and rooks of BOTH sides together, N/B = 3, R = 5. */
  endgameMinorRookMax: 13,
  /** Queen endings: queens on the board and at most this much N/B/R combined are marked for review. */
  queenEndingMinorRookMax: 8,
};

export interface PhaseInfo {
  phase: Phase;
  reason: string;
  /** A heuristic could not decide cleanly (for example a queen ending). */
  needsReview?: boolean;
}

const VALUE: Record<string, number> = { n: 3, b: 3, r: 5 };

export function classifyPhase(fen: string, d = PHASE_DEFAULTS): PhaseInfo {
  const [board, , , , , full] = fen.split(' ');
  const fullmove = Number(full);
  let queens = 0;
  let minorRook = 0;
  for (const ch of board) {
    const k = ch.toLowerCase();
    if (k === 'q') queens++;
    else minorRook += VALUE[k] ?? 0;
  }
  if (queens === 0 && minorRook <= d.endgameMinorRookMax) {
    return { phase: 'end', reason: `no queens and knights/bishops/rooks total ${minorRook} (limit ${d.endgameMinorRookMax})` };
  }
  if (queens > 0 && minorRook <= d.queenEndingMinorRookMax) {
    return { phase: 'end', reason: `queen ending: queens on the board and only ${minorRook} points of knights/bishops/rooks`, needsReview: true };
  }
  if (fullmove <= d.openingLastMove) return { phase: 'opening', reason: `move ${fullmove} is within the first ${d.openingLastMove} moves` };
  return { phase: 'middle', reason: `after move ${d.openingLastMove} with pieces still on the board` };
}

export const phaseOf = (fen: string): Phase => classifyPhase(fen).phase;

/** Opening >= 100cp; middle game >= 150cp; end game >= 100cp; a verified repertoire deviation >= 60cp (opening). */
export const PHASE_THRESHOLDS: Record<Phase, number> = { opening: 100, middle: 150, end: 100 };
export const REPERTOIRE_DEVIATION_CP = 60;

export const PHASE_RULE =
  `How phases are decided (tunable defaults): Opening = the first ${PHASE_DEFAULTS.openingLastMove} moves. ` +
  `End game = no queens and knights, bishops and rooks of both sides together total ${PHASE_DEFAULTS.endgameMinorRookMax} points or fewer ` +
  `(knight/bishop = 3, rook = 5). Queen endings are marked for review. Middle game = everything else. You can change a position's phase by hand.`;

/** Game phase of a position, from the FEN alone. A simple, documented rule, not a chess-theory claim. */
export type Phase = 'opening' | 'middle' | 'end';

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'opening', label: 'Opening' },
  { id: 'middle', label: 'Middle game' },
  { id: 'end', label: 'End game' },
];

/** Opening: the first 10 moves. End game: both sides together have at most 24 points of queens, rooks, bishops and knights (Q9 R5 B3 N3). Otherwise middle game. */
export const OPENING_LAST_MOVE = 10;
export const ENDGAME_MATERIAL = 24;

const VALUE: Record<string, number> = { q: 9, r: 5, b: 3, n: 3 };

export function phaseOf(fen: string): Phase {
  const [board, , , , , full] = fen.split(' ');
  if (Number(full) <= OPENING_LAST_MOVE) return 'opening';
  let material = 0;
  for (const ch of board) material += VALUE[ch.toLowerCase()] ?? 0;
  return material <= ENDGAME_MATERIAL ? 'end' : 'middle';
}

export const PHASE_RULE = `How phases are decided: Opening = the first ${OPENING_LAST_MOVE} moves. End game = after that, when both sides together have ${ENDGAME_MATERIAL} points or fewer of queens, rooks, bishops and knights. Middle game = everything else.`;

import type { Phase } from './phase';

export type Color = 'w' | 'b';

/** Score exactly as UCI reports it: from the point of view of the side to move. */
export interface Score {
  cp?: number;
  /** Moves to mate. >0 side to move mates, <0 side to move is mated, 0 = side to move is checkmated. */
  mate?: number;
}

export interface EvalResult {
  score: Score;
  /** Principal variation in UCI. */
  pv: string[];
  bestmove: string;
  depth: number;
}

export interface GameInfo {
  id: string;
  url: string;
  pgn: string;
  white: string;
  black: string;
  myColor: Color;
  opponent: string;
  /** Unix seconds, 0 if unknown. */
  endTime: number;
  timeClass: string;
  result: string;
  isFixture?: boolean;
}

export type MomentKind = 'cp' | 'missedMate' | 'allowedMate';

export interface Moment {
  gameId: string;
  gameUrl: string;
  opponent: string;
  myColor: Color;
  /** 0-based ply index of my move inside the game. */
  ply: number;
  moveNumber: number;
  /** Position before my move (the critical position). */
  fen: string;
  playedUci: string;
  playedSan: string;
  bestUci: string;
  bestSan: string;
  /** Engine line from `fen` starting with the best move, UCI, all legal. */
  bestLine: string[];
  /** Engine line after my played move (opponent to move), UCI, all legal. */
  refutation: string[];
  /** Scores in MY colour's point of view, centipawns (mate scores kept apart). */
  before: Score;
  after: Score;
  /** Centipawn loss (clamped), or a large number for mate kinds. */
  loss: number;
  kind: MomentKind;
  /** Opponent's move that led into the critical position, if any. */
  lastMove?: { from: string; to: string };
  /** Opening / middle game / end game, from the position (see phase.ts). */
  phase: Phase;
  isFixture?: boolean;
}

export interface Puzzle {
  id: string;
  /** FEN BEFORE the opponent's setup move (Lichess database convention). */
  fen: string;
  /** Moves[0] is the setup move; the learner starts with Moves[1]. */
  moves: string[];
  rating: number;
  themes: string[];
  isFixture?: boolean;
}

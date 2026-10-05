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

export interface EngineInfo {
  name: string;
  depth: number;
  multipv: number;
}

export interface AltMove {
  uci: string;
  san: string;
  /** Score in MY point of view. */
  score: Score;
}

export interface Moment {
  /** `${gameId}:${ply}`, unique per game and move. */
  id: string;
  gameId: string;
  gameUrl: string;
  /** Unix seconds, 0 if unknown. */
  gameDate: number;
  gameResult: string;
  timeClass: string;
  opponent: string;
  myColor: Color;
  /** 0-based ply index of my move inside the game. */
  ply: number;
  moveNumber: number;
  /** Position before my move (the exact target position for practice). */
  fen: string;
  /** Opponent's move that led into the position, if any. */
  lastMove?: { from: string; to: string };
  /** Up to 3 full moves from the actual game that lead into `fen`. Replaying them from `startFen` gives `fen`. */
  leadIn?: { startFen: string; moves: string[] };
  playedUci: string;
  playedSan: string;
  bestUci: string;
  bestSan: string;
  /** Engine line from `fen` starting with the best move, UCI, all legal. */
  bestLine: string[];
  /** Engine line after my played move (opponent to move), UCI, all legal. */
  refutation: string[];
  /** Best root move's score, my point of view. This is also the eval of the position before my move. */
  before: Score;
  /** Played move's root score, my point of view (same root, same depth, same settings as `before`). */
  after: Score;
  /** Centipawn loss (cp vs cp only); 0 for mate kinds. */
  loss: number;
  kind: MomentKind;
  urgency: number;
  winningCollapse: boolean;
  /** Second-best root move and the gap to the best (centipawns), when both are plain scores. */
  second?: AltMove;
  gapToSecondCp?: number;
  /** Other top root moves from MultiPV (excluding the best). */
  alternatives: AltMove[];
  phase: Phase;
  phaseReason: string;
  needsReview?: boolean;
  /** Pattern tag with the concrete board/PV evidence that supports it. Absent when no evidence was found. */
  tag?: string;
  tagEvidence?: string;
  /** Lichess puzzle theme this tag can honestly be matched to, if any. */
  tagTheme?: string;
  engine: EngineInfo;
  recheck: { depth: number; status: 'confirmed' | 'changed' };
  repertoire: 'in-repertoire' | 'deviation' | 'unknown';
  /** The earliest costly mistake of its game: where the slide began. Shown first in the paths. */
  cause?: boolean;
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

import { Chess } from 'chess.js';
import { moveFromUci } from './pgn';
import type { Puzzle } from './types';

export interface PuzzleFile {
  meta: { source: string; license: string; generated: string; note?: string };
  puzzles: Puzzle[];
}

/** Lichess convention: Moves[0] is the opponent's setup move, played first. The learner starts at Moves[1]. */
export class PuzzleSession {
  readonly chess: Chess;
  /** Index into puzzle.moves of the next move the learner must play. */
  private next = 1;
  readonly learner: 'w' | 'b';
  lastMove: { from: string; to: string };

  constructor(public puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
    const setup = moveFromUci(this.chess, puzzle.moves[0]);
    this.lastMove = { from: setup.from, to: setup.to };
    this.learner = this.chess.turn();
  }

  get solved() {
    return this.next >= this.puzzle.moves.length;
  }

  /** Learner tries a move. Wrong or illegal moves leave the position unchanged. */
  try(uci: string): { result: 'illegal' | 'wrong' | 'correct' | 'solved'; reply?: string } {
    if (this.solved) return { result: 'solved' };
    const test = new Chess(this.chess.fen());
    try {
      moveFromUci(test, uci);
    } catch {
      return { result: 'illegal' };
    }
    const expected = this.puzzle.moves[this.next];
    // Lichess accepts any checkmating move as a solution.
    if (uci !== expected && !test.isCheckmate()) return { result: 'wrong' };
    const m = moveFromUci(this.chess, uci);
    this.lastMove = { from: m.from, to: m.to };
    this.next++;
    if (this.solved || test.isCheckmate()) {
      this.next = this.puzzle.moves.length;
      return { result: 'solved' };
    }
    const reply = this.puzzle.moves[this.next];
    const r = moveFromUci(this.chess, reply);
    this.lastMove = { from: r.from, to: r.to };
    this.next++;
    return { result: this.solved ? 'solved' : 'correct', reply };
  }

  /** The solution as SAN from the starting position (after the setup move). */
  solutionSan(): string[] {
    const c = new Chess(this.puzzle.fen);
    moveFromUci(c, this.puzzle.moves[0]);
    return this.puzzle.moves.slice(1).map((u) => moveFromUci(c, u).san);
  }
}

/** Proposed calibration band (not a claim about my rating) and the wider band the local file holds. */
export const PUZZLE_BAND: [number, number] = [1000, 1300];
export const PUZZLE_FILE_BAND: [number, number] = [800, 1400];

export const THEME_LABEL: Record<string, string> = {
  fork: 'fork',
  hangingPiece: 'hanging piece',
  mateIn1: 'mate in 1',
  mateIn2: 'mate in 2',
  backRankMate: 'back-rank mate',
};

export interface PuzzlePick {
  puzzle: Puzzle;
  matched: boolean;
  label: string;
  /** The band had to be widened because no puzzle of the theme existed inside it. */
  widened?: boolean;
}

export interface PuzzleMatch {
  pick: PuzzlePick | null;
  /** Why no puzzle is offered. Never filled with an unrelated puzzle. */
  skipReason?: string;
}

/** For a "knight fork" tag, the solver's first move must be a knight move (after the setup move). */
function firstSolverMoveIsKnight(p: Puzzle): boolean {
  try {
    const c = new Chess(p.fen);
    moveFromUci(c, p.moves[0]);
    return c.get(p.moves[1].slice(0, 2) as never)?.type === 'n';
  } catch {
    return false;
  }
}

/**
 * Match a puzzle to the mechanism evidenced for a mistake. `theme` is a real Lichess theme name
 * (fork, hangingPiece, mateIn1, mateIn2, backRankMate). No theme means no puzzle: never an unrelated filler.
 */
export function matchPuzzle(
  file: PuzzleFile | null,
  tag: string | undefined,
  theme: string | undefined,
  rand: () => number = Math.random,
  band: [number, number] = PUZZLE_BAND,
): PuzzleMatch {
  if (!theme) {
    return { pick: null, skipReason: 'No concrete tactical mechanism was identified for this mistake, so no puzzle is offered (unrelated puzzles are not used as filler).' };
  }
  if (!file) return { pick: null, skipReason: 'The local puzzle file has not been built yet (run npm run make-puzzles).' };
  const usable = file.puzzles.filter((p) => p.moves.length >= 2 && p.themes.includes(theme) && (tag !== 'knight fork' || firstSolverMoveIsKnight(p)));
  const inBand = usable.filter((p) => p.rating >= band[0] && p.rating <= band[1]);
  const label = THEME_LABEL[theme] ?? theme;
  const what = tag === 'knight fork' ? 'knight fork' : label;
  if (inBand.length) {
    return { pick: { puzzle: inBand[Math.floor(rand() * inBand.length)], matched: true, label: `Matches your mistake: ${what}` } };
  }
  const wide = usable.filter((p) => p.rating >= PUZZLE_FILE_BAND[0] && p.rating <= PUZZLE_FILE_BAND[1]);
  if (wide.length) {
    return { pick: { puzzle: wide[Math.floor(rand() * wide.length)], matched: true, widened: true, label: `Matches your mistake: ${what} (no puzzle in ${band[0]}-${band[1]}; showing ${PUZZLE_FILE_BAND[0]}-${PUZZLE_FILE_BAND[1]})` } };
  }
  return { pick: null, skipReason: `The local puzzle file has no ${what} puzzle, so none is offered.` };
}

export async function loadPuzzleFile(url: string): Promise<PuzzleFile> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new Error('Could not load the puzzle file.');
  }
  if (!res.ok) throw new Error('The puzzle file has not been built yet.');
  let data: PuzzleFile;
  try {
    data = (await res.json()) as PuzzleFile;
  } catch {
    throw new Error('The puzzle file has not been built yet.');
  }
  if (!Array.isArray(data.puzzles) || data.puzzles.length === 0) throw new Error('The puzzle file is empty.');
  return data;
}

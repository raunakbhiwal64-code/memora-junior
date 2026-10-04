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

export const THEME_FOR: Record<string, { themes: string[]; label: string }> = {
  fork: { themes: ['fork'], label: 'fork' },
  mate: { themes: ['mateIn1', 'mateIn2', 'backRankMate'], label: 'checkmate threat' },
  hangingPiece: { themes: ['hangingPiece'], label: 'hanging piece' },
};

export interface PuzzlePick {
  puzzle: Puzzle;
  matched: boolean;
  label: string;
}

/** Choose a puzzle: a theme match if we are confident, otherwise "general tactics". */
export function pickPuzzle(
  file: PuzzleFile,
  theme: string | undefined,
  rand: () => number = Math.random,
  band: [number, number] = [800, 1400],
): PuzzlePick | null {
  const inBand = file.puzzles.filter((p) => p.rating >= band[0] && p.rating <= band[1] && p.moves.length >= 2);
  const wanted = theme ? THEME_FOR[theme] : undefined;
  if (wanted) {
    const pool = inBand.filter((p) => p.themes.some((t) => wanted.themes.includes(t)));
    if (pool.length) {
      const puzzle = pool[Math.floor(rand() * pool.length)];
      return { puzzle, matched: true, label: `Matches the theme of your mistake: ${wanted.label}` };
    }
  }
  if (inBand.length === 0) return null;
  const puzzle = inBand[Math.floor(rand() * inBand.length)];
  return { puzzle, matched: false, label: 'General tactics (not matched to your mistake)' };
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

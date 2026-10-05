import { Chess } from 'chess.js';
import type { EngineLike, SearchResult } from './engine';
import { lineToSan } from './pgn';
import { gradeMove, toMine, type Grade } from './score';
import type { Color, Score } from './types';

export interface GradedMove {
  grade: Grade;
  best: { uci: string; san: string; score: Score };
  playedScore: Score;
  /** Top root moves, my point of view. */
  top: { uci: string; san: string; score: Score }[];
}

/** Grades moves by checked loss against the best root move at the SAME position, depth and settings. Root searches are cached. */
export class RootGrader {
  private cache = new Map<string, Promise<SearchResult>>();
  constructor(
    private engine: EngineLike,
    private depth = 12,
    private multipv = 3,
  ) {}

  root(fen: string): Promise<SearchResult> {
    let p = this.cache.get(fen);
    if (!p) {
      p = this.engine.search(fen, this.depth, { multipv: this.multipv });
      this.cache.set(fen, p);
    }
    return p;
  }

  async grade(fen: string, playedUci: string, mine: Color, toleranceCp = 30): Promise<GradedMove> {
    const stm = new Chess(fen).turn();
    const root = await this.root(fen);
    const view = (s: Score) => toMine(s, stm, mine);
    const top = root.lines.map((l) => ({ uci: l.move, san: lineToSan(fen, [l.move])[0] ?? l.move, score: view(l.score) }));
    let line = root.lines.find((l) => l.move === playedUci);
    if (!line) line = (await this.engine.search(fen, this.depth, { searchmoves: [playedUci] })).lines[0];
    const best = top[0];
    const playedScore = view(line.score);
    return { grade: gradeMove(best.score, playedScore, best.uci === playedUci, toleranceCp), best, playedScore, top };
  }

  /** The engine's best reply move (UCI) in a position, from the cached root search. */
  async bestMove(fen: string): Promise<string> {
    return (await this.root(fen)).bestmove;
  }
}

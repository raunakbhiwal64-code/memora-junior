import { Chess } from 'chess.js';
import type { EngineLike } from './engine';
import { moveFromUci } from './pgn';
import { judgeMove, toMine } from './score';
import type { Moment, Score } from './types';

export const MY_MOVES = 3;

export interface Attempt {
  uci: string;
  san: string;
  verdict: string;
  good: boolean;
  /** Same move that was played in the real game. */
  sameAsGame: boolean;
  engineReply?: { uci: string; san: string };
  finished: boolean;
  gameOver?: string;
}

/** Practice at the critical position: my move, engine reply, up to MY_MOVES moves by me. */
export class PracticeSession {
  chess: Chess;
  movesPlayed = 0;
  history: Attempt[] = [];
  lastMove?: { from: string; to: string };

  constructor(
    public moment: Moment,
    private engine: EngineLike,
    private depth: number,
  ) {
    this.chess = new Chess(moment.fen);
    this.lastMove = moment.lastMove;
  }

  reset() {
    this.chess = new Chess(this.moment.fen);
    this.movesPlayed = 0;
    this.history = [];
    this.lastMove = this.moment.lastMove;
  }

  get finished() {
    return this.movesPlayed >= MY_MOVES || this.chess.isGameOver();
  }

  get turnText() {
    return this.chess.turn() === 'w' ? 'White' : 'Black';
  }

  /** Legal-move check only (no engine). */
  isLegal(from: string, to: string, promotion?: string): boolean {
    try {
      new Chess(this.chess.fen()).move({ from, to, promotion });
      return true;
    } catch {
      return false;
    }
  }

  async play(from: string, to: string, promotion?: string): Promise<Attempt> {
    const mine = this.moment.myColor;
    const fenBefore = this.chess.fen();
    const evBefore = await this.engine.analyse(fenBefore, this.depth);
    const before: Score = toMine(evBefore.score, mine, mine);
    const m = this.chess.move({ from, to, promotion });
    this.lastMove = { from: m.from, to: m.to };
    this.movesPlayed++;
    const uciMove = m.from + m.to + (m.promotion ?? '');
    const over = this.chess.isGameOver();
    const evAfter = await this.engine.analyse(this.chess.fen(), this.depth);
    const opp = mine === 'w' ? 'b' : 'w';
    const after: Score = this.chess.isCheckmate() ? { mate: 1 } : toMine(evAfter.score, opp, mine);
    const j = judgeMove(before, after);
    const attempt: Attempt = {
      uci: uciMove,
      san: m.san,
      verdict: this.chess.isCheckmate() ? 'Checkmate!' : j.word,
      good: this.chess.isCheckmate() ? true : j.good,
      sameAsGame: uciMove === this.moment.playedUci && this.movesPlayed === 1,
      finished: false,
    };
    if (over) {
      attempt.gameOver = this.chess.isCheckmate() ? 'Checkmate.' : 'The game is a draw.';
    } else if (this.movesPlayed < MY_MOVES && evAfter.bestmove) {
      const r = moveFromUci(this.chess, evAfter.bestmove);
      this.lastMove = { from: r.from, to: r.to };
      attempt.engineReply = { uci: evAfter.bestmove, san: r.san };
      if (this.chess.isGameOver()) attempt.gameOver = this.chess.isCheckmate() ? 'Checkmate.' : 'The game is a draw.';
    }
    attempt.finished = this.finished;
    this.history.push(attempt);
    return attempt;
  }
}

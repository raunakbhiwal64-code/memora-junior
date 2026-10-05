import { Chess } from 'chess.js';
import { RootGrader, type GradedMove } from './grading';
import type { EngineLike } from './engine';
import { moveFromUci } from './pgn';
import type { Grade } from './score';
import type { Moment } from './types';

/** Moves I play after the first (graded) move, with the engine answering. */
export const CONTINUATION_MOVES = 2;

export type Outcome = 'pending' | 'independent' | 'corrected' | 'shown' | 'miss';

export interface Attempt {
  uci: string;
  san: string;
  grade: Grade;
  /** The first, graded move at the exact target position. */
  isFirst: boolean;
  /** Same move that was played in the real game. */
  sameAsGame: boolean;
  best: GradedMove['best'];
  engineReply?: { uci: string; san: string };
  gameOver?: string;
}

export interface LeadInStep {
  fen: string;
  san: string;
  from: string;
  to: string;
}

/** Replays the actual game moves leading into the target position. The last step's FEN equals `moment.fen`. */
export function leadInSteps(m: Pick<Moment, 'leadIn'>): LeadInStep[] {
  if (!m.leadIn) return [];
  const c = new Chess(m.leadIn.startFen);
  const out: LeadInStep[] = [];
  for (const u of m.leadIn.moves) {
    const mv = moveFromUci(c, u);
    out.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to });
  }
  return out;
}

/**
 * Practice at the exact target position: my first move is graded against the best root move (30cp tolerance),
 * then the engine answers and I play up to CONTINUATION_MOVES more. Success is tracked as independent
 * (right first time), corrected (right after a retry) or shown (answer revealed).
 */
export class PracticeSession {
  chess: Chess;
  lastMove?: { from: string; to: string };
  firstDone = false;
  failures = 0;
  shown = false;
  continuationPlayed = 0;
  attempts: Attempt[] = [];
  private grader: RootGrader;

  constructor(
    public moment: Moment,
    engine: EngineLike,
    depth: number,
  ) {
    this.grader = new RootGrader(engine, depth);
    this.chess = new Chess(moment.fen);
    this.lastMove = moment.lastMove;
  }

  /** Back to the exact target position (the first move can be tried again). Counts as a retry only after a failed attempt. */
  reset() {
    this.chess = new Chess(this.moment.fen);
    this.lastMove = this.moment.lastMove;
    this.continuationPlayed = 0;
    if (!this.firstDone) return;
  }

  get outcome(): Outcome {
    if (this.shown) return 'shown';
    if (this.firstDone) return this.failures === 0 ? 'independent' : 'corrected';
    return this.failures > 0 ? 'miss' : 'pending';
  }

  get finished() {
    return (this.firstDone && this.continuationPlayed >= CONTINUATION_MOVES) || this.chess.isGameOver();
  }

  get turnText() {
    return this.chess.turn() === 'w' ? 'White' : 'Black';
  }

  isLegal(from: string, to: string, promotion?: string): boolean {
    try {
      new Chess(this.chess.fen()).move({ from, to, promotion });
      return true;
    } catch {
      return false;
    }
  }

  /** The learner gave up on the first move and asked to see the answer. */
  showAnswer() {
    this.shown = true;
  }

  /** After a failed first attempt: put the board back to the exact target position. */
  retry() {
    this.chess = new Chess(this.moment.fen);
    this.lastMove = this.moment.lastMove;
  }

  async play(from: string, to: string, promotion?: string): Promise<Attempt> {
    const mine = this.moment.myColor;
    const fenBefore = this.chess.fen();
    const isFirst = !this.firstDone;
    const uciMove = from + to + (promotion ?? '');
    const graded = await this.grader.grade(fenBefore, uciMove, mine);
    const m = this.chess.move({ from, to, promotion });
    this.lastMove = { from: m.from, to: m.to };
    const attempt: Attempt = {
      uci: uciMove,
      san: m.san,
      grade: this.chess.isCheckmate() ? { ok: true, kind: 'best', loss: 0, word: 'Checkmate' } : graded.grade,
      isFirst,
      sameAsGame: isFirst && uciMove === this.moment.playedUci,
      best: graded.best,
    };
    if (isFirst) {
      if (attempt.grade.ok) this.firstDone = true;
      else this.failures++;
    } else this.continuationPlayed++;
    if (this.chess.isGameOver()) {
      attempt.gameOver = this.chess.isCheckmate() ? 'Checkmate.' : 'The game is a draw.';
    } else if (isFirst ? attempt.grade.ok : this.continuationPlayed < CONTINUATION_MOVES) {
      const reply = await this.grader.bestMove(this.chess.fen());
      if (reply) {
        const r = moveFromUci(this.chess, reply);
        this.lastMove = { from: r.from, to: r.to };
        attempt.engineReply = { uci: reply, san: r.san };
        if (this.chess.isGameOver()) attempt.gameOver = this.chess.isCheckmate() ? 'Checkmate.' : 'The game is a draw.';
      }
    }
    this.attempts.push(attempt);
    return attempt;
  }
}

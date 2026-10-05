import { Chess } from 'chess.js';
import type { QuizItem } from './curriculum/content';
import { quizPosition } from './curriculum/content';
import type { RootGrader } from './grading';
import { moveFromUci } from './pgn';

export type QuizVerdict = 'answer' | 'alternative' | 'sound-other' | 'wrong';

export interface QuizResult {
  verdict: QuizVerdict;
  /** Credited as a correct answer for the lesson idea. */
  credited: boolean;
  san: string;
  message: string;
}

const bare = (san: string) => san.replace(/[+#?!]/g, '');

/**
 * Grade a quiz move. Credited moves are the lesson's accepted answers (engine-verified). Any other move is checked against
 * the engine: a sound move is "reasonable, but not the idea we are practising" (no credit); anything else is not yet.
 * The answer is never named in the message.
 */
export async function gradeQuizMove(item: QuizItem, uci: string, grader?: RootGrader): Promise<QuizResult> {
  const pos = quizPosition(item);
  const c = new Chess(pos.fen);
  const san = moveFromUci(c, uci).san;
  const hit = item.accept.find((a) => bare(a.move) === bare(san));
  if (hit) return { verdict: hit.kind, credited: true, san, message: hit.why };
  const note = item.notes[bare(san)] ?? item.notes[san];
  if (grader) {
    const g = await grader.grade(pos.fen, uci, pos.color);
    if (g.grade.ok) {
      return { verdict: 'sound-other', credited: false, san, message: note ?? 'A sound move (checked by the engine), but not the idea this exercise practises. Try again.' };
    }
    return { verdict: 'wrong', credited: false, san, message: note ?? `${g.grade.word}. Not yet: look again at what changes after that move.` };
  }
  return { verdict: 'wrong', credited: false, san, message: note ?? 'Not yet. Look again at the idea of this lesson.' };
}

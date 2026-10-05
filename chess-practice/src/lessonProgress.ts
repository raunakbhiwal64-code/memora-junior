import type { KV } from './kv';
import type { LessonState } from './progress';

export type QuizOutcome = 'independent' | 'corrected' | 'shown';

export interface LessonProgress {
  started: boolean;
  /** Furthest step reached (0-based). */
  stepsSeen: number;
  quiz: Record<string, { outcome: QuizOutcome; tries: number }>;
  completed: boolean;
}

const key = (id: string) => `lessonprog:${id}`;
const blank = (): LessonProgress => ({ started: false, stepsSeen: 0, quiz: {}, completed: false });

export const getLessonProgress = (kv: KV, id: string): LessonProgress => ({ ...blank(), ...(kv.get<LessonProgress>(key(id)) ?? {}) });

export function noteStep(kv: KV, id: string, index: number): void {
  const p = getLessonProgress(kv, id);
  kv.set(key(id), { ...p, started: true, stepsSeen: Math.max(p.stepsSeen, index) });
}

export function noteQuiz(kv: KV, id: string, qid: string, outcome: QuizOutcome, tries: number): void {
  const p = getLessonProgress(kv, id);
  // a later independent success replaces an earlier shown/corrected one; a worse result never overwrites a better one
  const rank: Record<QuizOutcome, number> = { shown: 0, corrected: 1, independent: 2 };
  const prev = p.quiz[qid];
  const next = !prev || rank[outcome] >= rank[prev.outcome] ? { outcome, tries } : prev;
  kv.set(key(id), { ...p, started: true, quiz: { ...p.quiz, [qid]: next } });
}

export function completeLesson(kv: KV, id: string): void {
  const p = getLessonProgress(kv, id);
  kv.set(key(id), { ...p, started: true, completed: true });
}

/** ready / in progress / practised / revisit. "Practised" is not "mastered". */
export function lessonState(p: LessonProgress, quizCount: number): LessonState {
  if (!p.started) return 'ready';
  if (!p.completed) return 'inProgress';
  const n = Math.max(1, quizCount);
  const independent = Object.values(p.quiz).filter((q) => q.outcome === 'independent').length;
  return independent / n >= 0.5 ? 'practised' : 'revisit';
}

export function quizSummary(p: LessonProgress, quizCount: number) {
  const v = Object.values(p.quiz);
  return {
    total: quizCount,
    independent: v.filter((q) => q.outcome === 'independent').length,
    corrected: v.filter((q) => q.outcome === 'corrected').length,
    shown: v.filter((q) => q.outcome === 'shown').length,
  };
}

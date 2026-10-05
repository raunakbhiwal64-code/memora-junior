import { describe, expect, it } from 'vitest';
import { attemptCounts, logAttempt } from '../src/attempts';
import { loadAnalysis, saveAnalysis } from '../src/analysisStore';
import { memoryKV } from '../src/kv';
import { getLessonProgress, lessonState, noteQuiz, noteStep, completeLesson, quizSummary } from '../src/lessonProgress';
import { summariseLeaks, resultKind } from '../src/leaks';
import { applyOverrides, setPhaseOverride } from '../src/phaseOverride';
import { advanceRotation, noteRoundCompleted, suggestedPhase } from '../src/rotation';
import { XP_PER_ROUND, completeRound, localDate, streakOf, summary } from '../src/rounds';
import { allReviews, dueItems, recordOutcome, reviewConfig, setReviewIntervals } from '../src/reviews';
import { currentSession, startSession } from '../src/session';
import type { Moment } from '../src/types';

const day = (iso: string, h = 12) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`);

describe('XP, practice days and streak (local, honest)', () => {
  it('awards 10 XP once per round: retries and repeats never farm XP', () => {
    const kv = memoryKV();
    const a = completeRound(kv, 'moment:g:10', day('2026-10-05'));
    expect(a).toMatchObject({ xpGained: XP_PER_ROUND, alreadyCounted: false, newPracticeDay: true, totalXp: 10, streak: 1 });
    const b = completeRound(kv, 'moment:g:10', day('2026-10-05', 15));
    expect(b).toMatchObject({ xpGained: 0, alreadyCounted: true, newPracticeDay: false, totalXp: 10 });
    const c = completeRound(kv, 'lesson:london-foundation', day('2026-10-05', 18));
    expect(c.totalXp).toBe(20);
    expect(summary(kv, day('2026-10-05')).practiceDays).toBe(1);
  });
  it('counts one practice day per local calendar date and a gentle streak', () => {
    const kv = memoryKV();
    completeRound(kv, 'r1', day('2026-10-03'));
    completeRound(kv, 'r2', day('2026-10-04'));
    expect(completeRound(kv, 'r3', day('2026-10-05')).streak).toBe(3);
    expect(streakOf(['2026-10-03', '2026-10-04'], day('2026-10-05'))).toBe(2); // yesterday still counts until a day is missed
    expect(streakOf(['2026-10-01'], day('2026-10-05'))).toBe(0); // a gap just restarts, with no penalty
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('spaced repetition (proposed defaults, editable)', () => {
  const item = { id: 'moment:g:10', kind: 'moment' as const, ref: 'g:10', label: 'x' };
  const NOW = Date.UTC(2026, 9, 5, 12);
  it('a miss or give-up is due next session and resets the success count', () => {
    const kv = memoryKV();
    recordOutcome(kv, item, 'independent', NOW, 1);
    recordOutcome(kv, item, 'shown', NOW, 1);
    const r = allReviews(kv)[item.id];
    expect(r.independentSuccesses).toBe(0);
    expect(dueItems(kv, NOW, 1)).toHaveLength(0);
    expect(dueItems(kv, NOW, 2)).toHaveLength(1);
  });
  it('independent successes go 1, 3, 7 days, then keep the last interval; no mastery claim', () => {
    const kv = memoryKV();
    const days = [1, 3, 7, 7];
    days.forEach((d, i) => {
      const r = recordOutcome(kv, item, 'independent', NOW, 1);
      expect(r.dueAt).toBe(NOW + d * 86_400_000);
      expect(r.independentSuccesses).toBe(i + 1);
    });
    expect(dueItems(kv, NOW + 6 * 86_400_000, 1)).toHaveLength(0);
    expect(dueItems(kv, NOW + 8 * 86_400_000, 1)).toHaveLength(1);
  });
  it('a corrected answer is due next session without erasing earlier independent successes', () => {
    const kv = memoryKV();
    recordOutcome(kv, item, 'independent', NOW, 1);
    const r = recordOutcome(kv, item, 'corrected', NOW, 1);
    expect(r.independentSuccesses).toBe(1);
    expect(r.dueSession).toBe(2);
  });
  it('intervals are editable and validated', () => {
    const kv = memoryKV();
    expect(setReviewIntervals(kv, '2, 5, 10').ok).toBe(true);
    expect(reviewConfig(kv).intervalsDays).toEqual([2, 5, 10]);
    expect(setReviewIntervals(kv, '0,x').ok).toBe(false);
    expect(reviewConfig(kv).intervalsDays).toEqual([2, 5, 10]);
  });
  it('sessions are counted per app load', () => {
    const kv = memoryKV();
    expect(startSession(kv)).toBe(1);
    expect(startSession(kv)).toBe(2);
    expect(currentSession(kv)).toBe(2);
  });
});

describe('opening -> middle game -> end game rotation', () => {
  it('advances only after a round in the suggested phase, never on app open, with free choice', () => {
    const kv = memoryKV();
    expect(suggestedPhase(kv)).toBe('opening');
    expect(noteRoundCompleted(kv, 'end')).toBe(false); // practising another phase by choice: no penalty, no change
    expect(suggestedPhase(kv)).toBe('opening');
    expect(noteRoundCompleted(kv, 'opening')).toBe(true);
    expect(suggestedPhase(kv)).toBe('middle');
    noteRoundCompleted(kv, 'middle');
    noteRoundCompleted(kv, 'end');
    expect(suggestedPhase(kv)).toBe('opening'); // the cycle repeats
    expect(advanceRotation(kv)).toBe('middle'); // explicit "skip"
  });
});

describe('lesson progress', () => {
  it('ready -> in progress -> practised / revisit; a retry never overwrites a better result', () => {
    const kv = memoryKV();
    expect(lessonState(getLessonProgress(kv, 'L'), 4)).toBe('ready');
    noteStep(kv, 'L', 2);
    expect(lessonState(getLessonProgress(kv, 'L'), 4)).toBe('inProgress');
    noteQuiz(kv, 'L', 'q1', 'independent', 1);
    noteQuiz(kv, 'L', 'q1', 'shown', 3);
    expect(getLessonProgress(kv, 'L').quiz.q1.outcome).toBe('independent');
    noteQuiz(kv, 'L', 'q2', 'corrected', 2);
    noteQuiz(kv, 'L', 'q3', 'shown', 1);
    completeLesson(kv, 'L');
    expect(lessonState(getLessonProgress(kv, 'L'), 4)).toBe('revisit'); // 1 of 4 independent
    noteQuiz(kv, 'L', 'q2', 'independent', 1);
    noteQuiz(kv, 'L', 'q4', 'independent', 1);
    expect(lessonState(getLessonProgress(kv, 'L'), 4)).toBe('practised');
    expect(quizSummary(getLessonProgress(kv, 'L'), 4)).toEqual({ total: 4, independent: 3, corrected: 0, shown: 1 });
  });
});

describe('attempt log: unique items versus retries', () => {
  it('counts distinct items separately from tries', () => {
    const kv = memoryKV();
    for (const outcome of ['shown', 'corrected', 'independent'] as const) logAttempt(kv, { ts: 1, kind: 'moment', refId: 'g:10', outcome });
    logAttempt(kv, { ts: 2, kind: 'moment', refId: 'g:20', outcome: 'independent' });
    expect(attemptCounts(kv, 'moment')).toEqual({ uniqueItems: 2, tries: 4, independent: 2 });
  });
});

const mom = (id: string, gameId: string, tag: string | undefined, over: Partial<Moment> = {}): Moment => ({
  id, gameId, gameUrl: '', gameDate: 1_700_000_000, gameResult: 'win', timeClass: 'blitz', opponent: 'x', myColor: 'w', ply: 10, moveNumber: 6, fen: '', playedUci: '', playedSan: '', bestUci: '', bestSan: '',
  bestLine: [], refutation: [], before: { cp: 0 }, after: { cp: -200 }, loss: 200, kind: 'cp', urgency: 200, winningCollapse: false, alternatives: [], phase: 'middle', phaseReason: '',
  engine: { name: 't', depth: 1, multipv: 1 }, recheck: { depth: 1, status: 'confirmed' }, repertoire: 'unknown', tag, ...over,
});

describe('recurring patterns', () => {
  it('counts distinct games (not retries), shows the sample and window, and never invents patterns', () => {
    const ms = [mom('a:1', 'a', 'hung piece'), mom('a:2', 'a', 'hung piece'), mom('b:1', 'b', 'hung piece', { gameResult: 'resigned', myColor: 'b', gameDate: 1_700_100_000 }), mom('c:1', 'c', undefined)];
    const s = summariseLeaks(ms, 5);
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ tag: 'hung piece', games: 2, moments: 3 });
    expect(s.rows[0].byResult).toMatchObject({ win: 1, loss: 1 });
    expect(s.untagged).toBe(1);
    expect(s.sampleGames).toBe(5);
    expect(s.windowStart).toBe(1_700_000_000);
    expect(s.note).toMatch(/win does not show you convert/);
    expect(summariseLeaks([], 3).rows).toEqual([]);
  });
  it('maps Chess.com result codes', () => {
    expect(['win', 'resigned', 'agreed', 'weird'].map(resultKind)).toEqual(['win', 'loss', 'draw', 'unknown']);
  });
});

describe('saved analysis and manual phase overrides', () => {
  const result = { moments: [mom('a:1', 'a', 'hung piece')], debug: [], summary: { games: 1, myMoves: 1, eligible: 1, picked: 1, engine: 't', depth: 12, recheckDepth: 16 } };
  const game = (id: string, fixture = false) => ({ id, url: '', pgn: '', white: '', black: '', myColor: 'w' as const, opponent: '', endTime: 0, timeClass: '', result: '', isFixture: fixture });
  it('is only reused for exactly the same games, and test fixtures are never saved as yours', () => {
    const kv = memoryKV();
    saveAnalysis(kv, [game('a'), game('b')], result);
    expect(loadAnalysis(kv, [game('b'), game('a')])?.result.moments).toHaveLength(1);
    expect(loadAnalysis(kv, [game('a')])).toBeUndefined();
    const kv2 = memoryKV();
    saveAnalysis(kv2, [game('f', true)], result);
    expect(loadAnalysis(kv2, [game('f', true)])).toBeUndefined();
  });
  it('a manual phase choice replaces the heuristic and keeps its reason', () => {
    const kv = memoryKV();
    setPhaseOverride(kv, 'a:1', 'end');
    const [m] = applyOverrides(kv, [mom('a:1', 'a', undefined, { phaseReason: 'after move 12' })]);
    expect(m.phase).toBe('end');
    expect(m.phaseReason).toMatch(/set by you to End game \(was: after move 12\)/);
    setPhaseOverride(kv, 'a:1', null);
    expect(applyOverrides(kv, [mom('a:1', 'a', undefined)])[0].phase).toBe('middle');
  });
});

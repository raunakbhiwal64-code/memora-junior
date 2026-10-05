import { describe, expect, it } from 'vitest';
import { renderPaths } from '../src/paths';
import type { Phase } from '../src/phase';
import { buildPaths, lessonKey, noteAttempt, notePractised, stateOf, type LessonRecord, type RecordStore } from '../src/progress';
import type { Moment } from '../src/types';

const mem = (): RecordStore => {
  const m = new Map<string, LessonRecord>();
  return { get: (k) => m.get(k), set: (k, r) => void m.set(k, r) };
};
/** Synthetic moments for UI/progress logic only. */
const moment = (ply: number, phase: Phase): Moment => ({
  id: `g:${ply}`, gameId: 'g', gameUrl: '', gameDate: 0, gameResult: 'win', timeClass: 'rapid', opponent: 'Opp', myColor: 'w', ply, moveNumber: ply, fen: '', playedUci: 'a2a3', playedSan: 'a3',
  bestUci: 'e2e4', bestSan: 'e4', bestLine: [], refutation: [], before: { cp: 0 }, after: { cp: -200 }, loss: 200, kind: 'cp', urgency: 200, winningCollapse: false, alternatives: [], phase,
  phaseReason: 'test', engine: { name: 't', depth: 1, multipv: 1 }, recheck: { depth: 1, status: 'confirmed' }, repertoire: 'unknown',
});

describe('lesson state', () => {
  it('moves ready -> in progress -> practised, and flags revisit when no good move was found', () => {
    const s = mem();
    const m = moment(10, 'middle');
    const k = lessonKey(m);
    expect(stateOf(s.get(k))).toBe('ready');
    notePractised(s, k);
    expect(stateOf(s.get(k))).toBe('ready');
    noteAttempt(s, k, false);
    expect(stateOf(s.get(k))).toBe('inProgress');
    notePractised(s, k);
    expect(stateOf(s.get(k))).toBe('revisit');
    noteAttempt(s, k, true);
    expect(stateOf(s.get(k))).toBe('practised');
  });
});

describe('buildPaths', () => {
  const moments = [moment(10, 'opening'), moment(30, 'middle'), moment(40, 'middle'), moment(50, 'middle')];
  it('groups real moments by phase; an empty phase stays empty and still exists', () => {
    const paths = buildPaths(moments, mem());
    expect(paths.map((p) => [p.label, p.total])).toEqual([['Opening', 1], ['Middle game', 3], ['End game', 0]]);
    expect(paths[2].resume).toBeUndefined();
  });
  it('resume picks in-progress first, then the next ready lesson', () => {
    const s = mem();
    expect(buildPaths(moments, s)[1].resume).toEqual({ index: 1, label: 'Start' });
    noteAttempt(s, lessonKey(moments[1]), true);
    notePractised(s, lessonKey(moments[1]));
    noteAttempt(s, lessonKey(moments[2]), false);
    expect(buildPaths(moments, s)[1].resume).toEqual({ index: 2, label: 'Resume' });
  });
  it('lets every phase be entered independently (nothing is locked)', () => {
    const paths = buildPaths([moment(10, 'opening'), moment(60, 'end')], mem());
    expect(paths[0].resume).toBeDefined();
    expect(paths[2].resume).toBeDefined();
  });
});

describe('renderPaths', () => {
  it('renders honest empty states, progress text and never reveals the original move or tag', () => {
    const s = mem();
    const ms = [moment(10, 'opening'), moment(30, 'middle')];
    noteAttempt(s, lessonKey(ms[0]), true);
    notePractised(s, lessonKey(ms[0]));
    const html = renderPaths(buildPaths(ms, s), { fixture: false, filter: 'all' });
    for (const label of ['Opening', 'Middle game', 'End game']) expect(html).toContain(label);
    expect(html).toContain('1 of 1 position practised');
    expect(html).toContain('No end game move');
    expect(html).toContain('Nothing is invented');
    expect(html).not.toMatch(/\ba3\b/);
    const only = renderPaths(buildPaths(ms, s), { fixture: false, filter: 'end' });
    expect(only).toContain('End game');
    expect(only).not.toContain('Middle game</h2>');
  });
});

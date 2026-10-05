import { describe, expect, it } from 'vitest';
import { buildPaths, lessonKey, noteAttempt, notePractised, stateOf, type LessonRecord, type RecordStore } from '../src/progress';
import { renderPaths } from '../src/paths';
import type { Moment } from '../src/types';
import type { Phase } from '../src/phase';

const mem = (): RecordStore => {
  const m = new Map<string, LessonRecord>();
  return { get: (k) => m.get(k), set: (k, r) => void m.set(k, r) };
};
/** Synthetic moments for UI/progress logic only. */
const moment = (ply: number, phase: Phase): Moment => ({
  gameId: 'g', gameUrl: '', opponent: 'Opp', myColor: 'w', ply, moveNumber: ply, fen: '', playedUci: 'a2a3', playedSan: 'a3',
  bestUci: 'e2e4', bestSan: 'e4', bestLine: [], refutation: [], before: { cp: 0 }, after: { cp: -200 }, loss: 200, kind: 'cp', phase,
});

describe('lesson state', () => {
  it('moves ready -> in progress -> practised, and flags revisit when no good move was found', () => {
    const s = mem();
    const m = moment(10, 'middle');
    const k = lessonKey(m);
    expect(stateOf(s.get(k))).toBe('ready');
    notePractised(s, k); // reading the answer without trying does not count
    expect(stateOf(s.get(k))).toBe('ready');
    noteAttempt(s, k, false);
    expect(stateOf(s.get(k))).toBe('inProgress');
    notePractised(s, k);
    expect(stateOf(s.get(k))).toBe('revisit');
    noteAttempt(s, k, true); // a corrected retry
    expect(stateOf(s.get(k))).toBe('practised');
  });
});

describe('buildPaths', () => {
  const moments = [moment(10, 'opening'), moment(30, 'middle'), moment(40, 'middle'), moment(50, 'middle')];
  it('groups real moments by phase; an empty phase stays empty and still exists', () => {
    const paths = buildPaths(moments, mem());
    expect(paths.map((p) => [p.label, p.total])).toEqual([['Opening', 1], ['Middle game', 3], ['End game', 0]]);
    expect(paths[2].resume).toBeUndefined();
    expect(paths[1].lessons.map((l) => l.index)).toEqual([1, 2, 3]);
  });
  it('resume picks in-progress first, then the next ready lesson, and counts practised', () => {
    const s = mem();
    expect(buildPaths(moments, s)[1].resume).toEqual({ index: 1, label: 'Start' });
    noteAttempt(s, lessonKey(moments[1]), true);
    notePractised(s, lessonKey(moments[1]));
    noteAttempt(s, lessonKey(moments[2]), false); // started, not finished
    const p = buildPaths(moments, s)[1];
    expect(p.practised).toBe(1);
    expect(p.resume).toEqual({ index: 2, label: 'Resume' });
    notePractised(s, lessonKey(moments[2]));
    const p2 = buildPaths(moments, s)[1];
    expect(p2.practised).toBe(2);
    expect(p2.resume).toEqual({ index: 3, label: 'Continue' });
  });
  it('lets every phase be entered independently (nothing is locked)', () => {
    const paths = buildPaths([moment(10, 'opening'), moment(60, 'end')], mem());
    expect(paths[0].resume).toBeDefined();
    expect(paths[2].resume).toBeDefined();
  });
});

describe('renderPaths', () => {
  it('renders all three phases, honest empty text, progress text and state labels', () => {
    const s = mem();
    const ms = [moment(10, 'opening'), moment(30, 'middle')];
    noteAttempt(s, lessonKey(ms[0]), true);
    notePractised(s, lessonKey(ms[0]));
    const html = renderPaths(buildPaths(ms, s), { fixture: false, threshold: '1 pawn' });
    for (const label of ['Opening', 'Middle game', 'End game']) expect(html).toContain(label);
    expect(html).toContain('1 of 1 position practised');
    expect(html).toContain('No end-game move');
    expect(html).toContain('Nothing is invented');
    expect(html).toContain('Practised');
    expect(html).toContain('Ready');
    expect(html).not.toMatch(/a3|played/); // never reveals the original move
  });
});

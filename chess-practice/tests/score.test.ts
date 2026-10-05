import { describe, expect, it } from 'vitest';
import { compareRoot, describeScore, formatScore, gradeMove, toMine } from '../src/score';

describe('score perspective (both colours)', () => {
  it('keeps the sign when I am the side to move', () => {
    expect(toMine({ cp: 120 }, 'w', 'w')).toEqual({ cp: 120 });
    expect(toMine({ cp: 120 }, 'b', 'b')).toEqual({ cp: 120 });
  });
  it('flips the sign when the opponent is to move', () => {
    expect(toMine({ cp: 120 }, 'b', 'w')).toEqual({ cp: -120 });
    expect(toMine({ cp: 120 }, 'w', 'b')).toEqual({ cp: -120 });
  });
  it('maps mate scores to my view', () => {
    expect(toMine({ mate: 2 }, 'w', 'w')).toEqual({ mate: 2 });
    expect(toMine({ mate: 1 }, 'w', 'b')).toEqual({ mate: -1 });
    expect(toMine({ mate: -3 }, 'w', 'b')).toEqual({ mate: 3 });
  });
});

describe('root-move loss', () => {
  it('is best minus played, in centipawns', () => {
    expect(compareRoot({ cp: 30 }, { cp: -150 })).toMatchObject({ kind: 'cp', loss: 180 });
    expect(compareRoot({ cp: 30 }, { cp: 30 })).toMatchObject({ kind: 'none', loss: 0 });
    expect(compareRoot({ cp: 30 }, { cp: 80 }).loss).toBe(0); // never negative
  });
  it('keeps mate apart from centipawns: no capped mate arithmetic', () => {
    const missed = compareRoot({ mate: 3 }, { cp: 900 });
    expect(missed.kind).toBe('missedMate');
    expect(missed.loss).toBe(0);
    const allowed = compareRoot({ cp: 1500 }, { mate: -2 });
    expect(allowed.kind).toBe('allowedMate');
    expect(compareRoot({ mate: 3 }, { mate: 5 }).kind).toBe('none'); // still mating
    expect(compareRoot({ mate: -2 }, { mate: -1 }).kind).toBe('none'); // lost anyway
  });
  it('ranks shorter mates as more urgent, and any mate above any centipawn loss', () => {
    const m1 = compareRoot({ cp: 0 }, { mate: -1 });
    const m3 = compareRoot({ cp: 0 }, { mate: -3 });
    expect(m1.urgency).toBeGreaterThan(m3.urgency);
    expect(m3.urgency).toBeGreaterThan(compareRoot({ cp: 3000 }, { cp: -3000 }).urgency);
  });
  it('flags a winning collapse instead of dropping it', () => {
    expect(compareRoot({ cp: 700 }, { cp: 20 })).toMatchObject({ kind: 'cp', loss: 680, winningCollapse: true });
  });
});

describe('practice grading', () => {
  it('accepts the best move and anything within 30cp, mate-aware', () => {
    expect(gradeMove({ cp: 50 }, { cp: 50 }, true)).toMatchObject({ ok: true, kind: 'best' });
    expect(gradeMove({ cp: 50 }, { cp: 25 }, false)).toMatchObject({ ok: true, kind: 'sound' });
    expect(gradeMove({ cp: 50 }, { cp: 15 }, false)).toMatchObject({ ok: false, kind: 'worse', loss: 35 });
    expect(gradeMove({ mate: 2 }, { cp: 900 }, false)).toMatchObject({ ok: false, kind: 'missedMate' });
    expect(gradeMove({ cp: 0 }, { mate: -1 }, false)).toMatchObject({ ok: false, kind: 'allowsMate' });
  });
  it('respects a different tolerance', () => {
    expect(gradeMove({ cp: 50 }, { cp: 15 }, false, 40).ok).toBe(true);
  });
});

describe('words for scores', () => {
  it('says equal / better / winning in plain words and never turns mate into pawns', () => {
    expect(describeScore({ cp: 10 })).toBe('equal');
    expect(describeScore({ cp: 60 })).toBe('slightly better');
    expect(describeScore({ cp: -180 })).toBe('clearly worse');
    expect(describeScore({ cp: 700 })).toBe('winning');
    expect(describeScore({ mate: -2 })).toBe('a forced mate for them');
    expect(formatScore({ mate: -2 })).toBe('mated in 2');
    expect(formatScore({ cp: 120 })).toBe('+1.2');
  });
});

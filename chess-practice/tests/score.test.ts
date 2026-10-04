import { describe, expect, it } from 'vitest';
import { classifyLoss, isMeaningful, judgeMove, toMine } from '../src/score';

describe('score perspective', () => {
  it('keeps the sign when I am the side to move', () => {
    expect(toMine({ cp: 120 }, 'w', 'w')).toEqual({ cp: 120 });
    expect(toMine({ cp: 120 }, 'b', 'b')).toEqual({ cp: 120 });
  });
  it('flips the sign when the opponent is to move (both colours)', () => {
    expect(toMine({ cp: 120 }, 'b', 'w')).toEqual({ cp: -120 });
    expect(toMine({ cp: 120 }, 'w', 'b')).toEqual({ cp: -120 });
  });
  it('maps mate scores to my view', () => {
    expect(toMine({ mate: 2 }, 'w', 'w')).toEqual({ mate: 2 });
    expect(toMine({ mate: 1 }, 'w', 'b')).toEqual({ mate: -1 });
    expect(toMine({ mate: -3 }, 'w', 'b')).toEqual({ mate: 3 });
  });
});

describe('loss classification', () => {
  it('measures an ordinary loss in my view', () => {
    const r = classifyLoss({ cp: 30 }, { cp: -150 });
    expect(r).toEqual({ kind: 'cp', loss: 180 });
    expect(isMeaningful(r, 100)).toBe(true);
  });
  it('ignores small losses', () => {
    expect(isMeaningful(classifyLoss({ cp: 30 }, { cp: -20 }), 100)).toBe(false);
  });
  it('does not call an improvement a loss', () => {
    expect(classifyLoss({ cp: 0 }, { cp: 80 }).kind).toBe('none');
  });
  it('ignores positions that were already lost or are still decisively won', () => {
    expect(classifyLoss({ cp: -900 }, { cp: -1000 }).kind).toBe('none');
    expect(classifyLoss({ cp: 900 }, { cp: 750 }).kind).toBe('none');
  });
  it('handles mate separately from centipawns', () => {
    expect(classifyLoss({ cp: 30 }, { mate: -1 }).kind).toBe('allowedMate');
    expect(classifyLoss({ mate: 3 }, { cp: 40 }).kind).toBe('missedMate');
    expect(classifyLoss({ mate: 3 }, { mate: 5 }).kind).toBe('none');
  });
});

describe('judgeMove', () => {
  it('uses plain words', () => {
    expect(judgeMove({ cp: 50 }, { cp: 40 }).good).toBe(true);
    expect(judgeMove({ cp: 50 }, { cp: -300 }).good).toBe(false);
    expect(judgeMove({ cp: 50 }, { mate: -2 }).word).toMatch(/mate/);
  });
});

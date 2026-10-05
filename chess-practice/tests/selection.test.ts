import { describe, expect, it } from 'vitest';
import { DEFAULTS, eligibility, pickForGame, type Scan } from '../src/moments';
import type { Phase } from '../src/phase';
import type { Score } from '../src/types';

const s = (best: Score, played: Score, over: Partial<Scan> = {}) => {
  const bc = best.cp ?? 0;
  const pc = played.cp ?? 0;
  return { best: { uci: 'a2a3', san: 'a3', score: best, pv: [] }, played: { score: played, pv: [], inTopLines: false }, kind: 'cp' as const, loss: Math.max(0, bc - pc), winningCollapse: bc >= 300 && pc <= 100, ...over };
};
const ok = (best: Score, played: Score, phase: Phase, rep: 'in-repertoire' | 'deviation' | 'unknown' = 'unknown') => eligibility(s(best, played), phase, DEFAULTS, rep).ok;

describe('phase thresholds', () => {
  it('opening >= 100cp, middle game >= 150cp, end game >= 100cp', () => {
    expect(ok({ cp: 20 }, { cp: -90 }, 'opening')).toBe(true); // 110
    expect(ok({ cp: 20 }, { cp: -60 }, 'opening')).toBe(false); // 80
    expect(ok({ cp: 20 }, { cp: -110 }, 'middle')).toBe(false); // 130 < 150
    expect(ok({ cp: 20 }, { cp: -140 }, 'middle')).toBe(true); // 160
    expect(ok({ cp: 20 }, { cp: -90 }, 'end')).toBe(true);
  });
  it('a verified repertoire deviation counts from 60cp in the opening only', () => {
    expect(ok({ cp: 20 }, { cp: -50 }, 'opening', 'deviation')).toBe(true); // 70
    expect(ok({ cp: 20 }, { cp: -50 }, 'opening', 'unknown')).toBe(false);
    expect(ok({ cp: 20 }, { cp: -50 }, 'middle', 'deviation')).toBe(false);
    // a sound off-script move is not an error
    expect(ok({ cp: 20 }, { cp: 0 }, 'opening', 'deviation')).toBe(false);
  });
  it('mate kinds are always eligible', () => {
    expect(eligibility(s({ cp: 30 }, { mate: -1 }, { kind: 'allowedMate', loss: 0 }), 'middle', DEFAULTS).ok).toBe(true);
    expect(eligibility(s({ mate: 2 }, { cp: 100 }, { kind: 'missedMate', loss: 0 }), 'end', DEFAULTS).ok).toBe(true);
  });
});

describe('noise filter', () => {
  it('skips moves played when already lost (pre-move eval below -300)', () => {
    const r = eligibility(s({ cp: -350 }, { cp: -900 }), 'middle', DEFAULTS);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/already lost/);
    expect(ok({ cp: -250 }, { cp: -600 }, 'middle')).toBe(true); // not yet below -300
  });
  it('skips a clearly winning position only if the played move still wins (above +300)', () => {
    expect(ok({ cp: 700 }, { cp: 400 }, 'middle')).toBe(false);
    expect(eligibility(s({ cp: 700 }, { cp: 50 }), 'middle', DEFAULTS).ok).toBe(true); // a decisive collapse is KEPT
    expect(eligibility(s({ cp: 700 }, { cp: 50 }), 'middle', DEFAULTS).reason).toMatch(/winning collapse/);
  });
  it('never drops a mistake because a different move would also have been fine', () => {
    expect(eligibility(s({ cp: 30 }, { cp: 30 }, { kind: 'none', loss: 0 }), 'middle', DEFAULTS).ok).toBe(false);
  });
});

describe('picking 0-3 per game', () => {
  const c = (ply: number, loss: number, tag?: string, urgency = loss) => ({ scan: { ply, loss, urgency }, tag });
  it('never pads: no candidates means no picks, and fewer than 3 means fewer than 3', () => {
    expect(pickForGame([], 3)).toEqual([]);
    expect(pickForGame([c(10, 200, 'hung piece')], 3)).toHaveLength(1);
  });
  it('includes the biggest eligible loss and the earliest cause, then new themes', () => {
    const picks = pickForGame([c(40, 500, 'hung piece'), c(12, 120, 'early queen move'), c(30, 300, 'hung piece'), c(60, 250, 'knight fork')], 3);
    expect(picks.map((p) => p.scan.ply).sort((a, b) => a - b)).toEqual([12, 40, 60]);
    expect(picks.some((p) => p.scan.ply === 40)).toBe(true); // biggest
    expect(picks.some((p) => p.scan.ply === 12)).toBe(true); // earliest
  });
  it('is at most 3 per game and skips repeats of the same episode (within 4 plies)', () => {
    const picks = pickForGame([c(20, 400), c(22, 390), c(40, 300), c(60, 200), c(80, 150)], 3);
    expect(picks).toHaveLength(3);
    expect(picks.filter((p) => Math.abs(p.scan.ply - 20) < 4)).toHaveLength(1);
  });
  it('ranks mate urgency above centipawn loss, shorter mates first', () => {
    const picks = pickForGame([c(10, 900, undefined, 900), c(20, 0, undefined, 1_000_000 - 1), c(30, 0, undefined, 1_000_000 - 3)], 3);
    expect(picks.map((p) => p.scan.ply)).toEqual([20, 30, 10]);
  });
});

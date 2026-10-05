import { afterAll, describe, expect, it } from 'vitest';
import { FIXTURE_GAME_LOSING } from '../src/fixtures';
import { DEFAULTS, candidatesOf, findMoments, isTeachable, type Scan } from '../src/moments';
import { createNodeEngine } from './nodeEngine';

/** Synthetic scans (logic only). Scores are in MY point of view. */
const scan = (ply: number, before: number, after: number, over: Partial<Scan> = {}): Scan => ({
  gameId: 'g', ply, fen: 'x', before: { cp: before }, after: { cp: after }, kind: 'cp', loss: before - after, ...over,
});

describe('which mistakes are teachable', () => {
  it('skips mistakes made when I was already clearly worse', () => {
    expect(isTeachable(scan(30, -300, -900), DEFAULTS)).toBe(false);
    expect(isTeachable(scan(30, -151, -600), DEFAULTS)).toBe(false);
    expect(isTeachable(scan(30, -100, -500), DEFAULTS)).toBe(true);
  });
  it('keeps a meaningful loss from an equal or better position', () => {
    expect(isTeachable(scan(10, 20, -150), DEFAULTS)).toBe(true);
    expect(isTeachable(scan(10, 20, -30), DEFAULTS)).toBe(false); // 0.5 pawn: too small
  });
  it('keeps a smaller drop when it is the move that tipped me into a clearly worse position', () => {
    expect(isTeachable(scan(10, -110, -160), DEFAULTS)).toBe(true); // 50cp drop, crosses the line
    expect(isTeachable(scan(10, -60, -110), DEFAULTS)).toBe(false); // 50cp drop, stays above the line
  });
  it('never teaches a move that was fine', () => {
    expect(isTeachable(scan(10, 20, 20, { kind: 'none', loss: 0 }), DEFAULTS)).toBe(false);
  });
  it('marks the earliest teachable mistake of a game as where the slide began', () => {
    const c = candidatesOf([scan(40, 100, -300), scan(14, 30, -140), scan(60, -400, -900)], DEFAULTS);
    expect(c.map((x) => x.ply)).toEqual([14, 40]); // the ply-60 blunder was already lost
    expect(c[0].first).toBe(true);
    expect(c[1].first).toBe(false);
    expect(c[0].rank).toBeGreaterThan(c[1].rank - 1); // earlier cause outranks the bigger later loss
  });
});

describe('a game with an early cause and a huge late blunder (real engine)', () => {
  const { engine, close } = createNodeEngine();
  afterAll(close);
  it('teaches the earlier mistakes, not the late blunder made while already losing', async () => {
    const ms = await findMoments([FIXTURE_GAME_LOSING], engine);
    expect(ms.length).toBeGreaterThan(0);
    const late = 32; // 17.a4 (ply index 32), before-score about -1.9
    expect(ms.map((m) => m.ply)).not.toContain(late);
    expect(Math.min(...ms.map((m) => m.ply))).toBeLessThan(late);
    // every taught position was NOT already clearly worse
    for (const m of ms) expect(m.before.cp ?? 1000).toBeGreaterThan(DEFAULTS.alreadyWorseCp);
  }, 120000);
});

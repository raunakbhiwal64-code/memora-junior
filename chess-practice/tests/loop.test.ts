import { afterAll, describe, expect, it } from 'vitest';
import { explainMoment } from '../src/explain';
import { FIXTURE_GAME_BLACK, FIXTURE_GAME_WHITE, FIXTURE_PUZZLE } from '../src/fixtures';
import { findMoments } from '../src/moments';
import { PracticeSession } from '../src/practice';
import { PuzzleSession } from '../src/puzzle';
import { createNodeEngine } from './nodeEngine';

/** Integration test with the real Stockfish 19 lite build, on the clearly-marked FIXTURE games. */
const { engine, close } = createNodeEngine();
afterAll(close);

describe('whole loop on fixtures (real engine)', () => {
  it('finds one moment per colour with scores in MY point of view', async () => {
    const ms = await findMoments([FIXTURE_GAME_BLACK, FIXTURE_GAME_WHITE], engine);
    expect(ms).toHaveLength(2);
    const black = ms.find((m) => m.myColor === 'b')!;
    const white = ms.find((m) => m.myColor === 'w')!;

    // Black blunders Scholar's mate: before ~equal for Black, after = mated.
    expect(black.playedSan).toBe('Nf6');
    expect(black.kind).toBe('allowedMate');
    expect(black.before.cp).toBeGreaterThan(-100);
    expect(black.after.mate).toBeLessThan(0);

    // White gives a knight for a pawn: after is clearly negative for White.
    expect(white.playedSan).toBe('Nxg5');
    expect(white.kind).toBe('cp');
    expect(white.after.cp!).toBeLessThan(-300);
    expect(white.before.cp!).toBeGreaterThan(-100);

    for (const m of ms) {
      expect(m.fen).not.toBe('');
      expect(m.bestLine.length).toBeGreaterThan(0);
      expect(m.bestUci).toBe(m.bestLine[0]);
      expect(m.bestUci).not.toBe(m.playedUci);
    }
  }, 120000);

  it('explains with board facts, not invented commentary', async () => {
    const ms = await findMoments([FIXTURE_GAME_BLACK, FIXTURE_GAME_WHITE], engine);
    const black = explainMoment(ms.find((m) => m.myColor === 'b')!);
    expect(black.whyFailed.join(' ')).toMatch(/forced checkmate: Qxf7#/);
    expect(black.theme).toBe('mate');
    const white = explainMoment(ms.find((m) => m.myColor === 'w')!);
    expect(white.whyFailed.join(' ')).toMatch(/knight on g5 can be captured .*hxg5/);
    expect(white.whyFailed.join(' ')).toMatch(/3 points of material for 1/);
    expect(white.theme).toBe('hangingPiece');
    expect(white.limited).toBe(false);
  }, 120000);

  it('practice: judges by evaluation, not exact match', async () => {
    const ms = await findMoments([FIXTURE_GAME_BLACK], engine);
    const m = ms[0];
    // 3...Nf6 is the blunder (same as game); 3...g6 and 3...Qe7 should both be fine.
    const bad = new PracticeSession(m, engine, 10);
    const a1 = await bad.play('g8', 'f6');
    expect(a1.sameAsGame).toBe(true);
    expect(a1.good).toBe(false);
    for (const [from, to] of [['g7', 'g6'], ['d8', 'e7']]) {
      const s = new PracticeSession(m, engine, 10);
      const a = await s.play(from, to);
      expect(a.good, `${from}${to}`).toBe(true);
      expect(a.engineReply).toBeDefined();
    }
  }, 120000);

  it('puzzle fixture follows the setup-move rule', () => {
    const s = new PuzzleSession(FIXTURE_PUZZLE);
    expect(s.try('d5c7').result).toBe('correct');
  });
});

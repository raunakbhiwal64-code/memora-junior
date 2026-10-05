import { describe, expect, it } from 'vitest';
import { FIXTURE_GAMES, FIXTURE_GAME_LONDON_QB6, FIXTURE_GAME_SHELL_F7 } from '../src/fixtures';
import { linkLesson, matchGame, responseStats, posKey } from '../src/families';
import { parseGame } from '../src/pgn';
import type { GameInfo, Moment } from '../src/types';

const game = (id: string, myColor: 'w' | 'b', moves: string, endTime = 1_700_000_000): GameInfo => ({
  id, url: '', pgn: `[White "a"]\n[Black "b"]\n\n${moves} *`, white: 'a', black: 'b', myColor, opponent: 'o', endTime, timeClass: 'rapid', result: 'win',
});
const ids = (g: GameInfo) => matchGame(g).map((m) => m.lessonId);

describe('matching games to lessons by position, not by move text', () => {
  it('recognises a London from the pieces, including a transposed move order', () => {
    expect(ids(game('t1', 'w', '1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3'))).toContain('london-foundation');
    expect(ids(game('t2', 'w', '1. Nf3 d5 2. d4 Nf6 3. Bf4 e6 4. e3'))).toContain('london-foundation'); // transposition
    expect(ids(game('t3', 'w', '1. e4 e5 2. Nf3 Nc6 3. Bb5'))).not.toContain('london-foundation');
  });
  it('detects the response families and the exact seed boards', () => {
    expect(ids(game('r1', 'w', '1. d4 c5'))).toContain('london-vs-c5'); // exact anchor: the position after 1.d4 c5
    expect(matchGame(game('r1', 'w', '1. d4 c5')).find((m) => m.lessonId === 'london-vs-c5')?.exact).toBe(true);
    expect(ids(game('r2', 'w', '1. d4 g6'))).toContain('london-vs-flank-starts');
    expect(ids(game('r3', 'w', '1. d4 b6'))).toContain('london-vs-flank-starts');
    const qb6 = matchGame(FIXTURE_GAME_LONDON_QB6);
    expect(qb6.map((m) => m.lessonId)).toEqual(expect.arrayContaining(['london-foundation', 'london-vs-c5', 'london-vs-qb6']));
    expect(qb6.find((m) => m.lessonId === 'london-vs-qb6')?.exact).toBe(true); // the L4 board from your game
  });
  it('detects the Black shell and its responses, and uses only the learner\'s colour', () => {
    const shell = matchGame(FIXTURE_GAME_SHELL_F7).map((m) => m.lessonId);
    expect(shell).toEqual(expect.arrayContaining(['black-foundation', 'black-vs-bc4-ng5']));
    expect(ids(game('b2', 'b', '1. e4 d6 2. Nf3 c6 3. e5'))).toContain('black-vs-early-e5');
    expect(ids(game('w3', 'w', '1. e4 d6 2. Nf3 c6 3. e5'))).toEqual([]); // I am White: Black lessons do not apply
    expect(ids(game('lc', 'b', '1. d4 d6 2. d5'))).not.toContain('black-vs-early-e5');
  });
  it('every game position used for matching comes from legal play', () => {
    for (const g of FIXTURE_GAMES) expect(() => parseGame(g.pgn)).not.toThrow();
    expect(posKey('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  });
});

describe('response frequencies are recomputed from the imported games', () => {
  it('counts n of N with a sample window, never hard-coded', () => {
    const games = [game('a', 'w', '1. d4 d5 2. Bf4 c5 3. e3 Nc6', 1_700_000_000), game('b', 'w', '1. d4 d5 2. Bf4 Nf6 3. e3 e6', 1_700_500_000), game('c', 'w', '1. d4 d5 2. Bf4 c5 3. e3 Qb6', 1_700_900_000), game('d', 'w', '1. e4 e5', 1_701_000_000)];
    const { stats, sample } = responseStats(games);
    const c5 = stats.find((s) => s.lessonId === 'london-vs-c5')!;
    expect(c5).toMatchObject({ count: 2, of: 3 }); // 2 of the 3 London games, not of all 4
    expect(stats.find((s) => s.lessonId === 'london-vs-qb6')).toMatchObject({ count: 1, of: 3 });
    expect(sample).toMatchObject({ games: 4, windowStart: 1_700_000_000, windowEnd: 1_701_000_000 });
    expect(responseStats([]).stats.every((s) => s.count === 0)).toBe(true);
  });
});

describe('lesson -> matching game -> matching mistake, or an honest empty state', () => {
  const mom = (gameId: string, ply: number, phase: 'opening' | 'middle'): Moment =>
    ({ id: `${gameId}:${ply}`, gameId, ply, moveNumber: Math.floor(ply / 2) + 1, phase, opponent: 'o', myColor: 'w' } as unknown as Moment);
  it('links the matched game and the mistakes close to the lesson position', () => {
    const l = linkLesson('london-vs-qb6', [FIXTURE_GAME_LONDON_QB6], [mom('fixture-london-qb6', 8, 'opening'), mom('fixture-london-qb6', 60, 'middle')]);
    expect(l.games).toHaveLength(1);
    expect(l.moments.map((m) => m.ply)).toEqual([8]);
  });
  it('says so when nothing matches', () => {
    const l = linkLesson('london-vs-qb6', [game('x', 'w', '1. e4 e5')], []);
    expect(l).toEqual({ games: [], moments: [] });
  });
});

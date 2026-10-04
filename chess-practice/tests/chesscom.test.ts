import { describe, expect, it } from 'vitest';
import { ApiError, fetchRecentGames, selectGames } from '../src/chesscom';

const PGN = '[White "Rbhiwal"]\n[Black "opp"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0';
/** TEST DATA shaped like the Chess.com API, hand-made for these tests. */
const raw = (over: Record<string, unknown> = {}, n = 0) => ({
  url: `https://www.chess.com/game/live/${1000 + n}`,
  pgn: PGN,
  time_class: 'rapid',
  rules: 'chess',
  end_time: 1_700_000_000 + n,
  white: { username: 'Rbhiwal', result: 'win' },
  black: { username: 'opp', result: 'resigned' },
  ...over,
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('selectGames', () => {
  it('keeps completed standard blitz/rapid games, newest first, max count', () => {
    const list = [
      raw({}, 1),
      raw({ time_class: 'bullet' }, 2),
      raw({ rules: 'chess960' }, 3),
      raw({ pgn: undefined }, 4),
      raw({ white: { username: 'Rbhiwal', result: 'abandoned' } }, 5),
      raw({ time_class: 'blitz' }, 6),
      raw({ white: { username: 'x', result: 'win' }, black: { username: 'y', result: 'resigned' } }, 7),
    ];
    const out = selectGames(list as never, 'rbhiwal', 5);
    expect(out.map((g) => g.endTime)).toEqual([1_700_000_006, 1_700_000_001]);
    expect(out[0].myColor).toBe('w');
    expect(out[0].opponent).toBe('opp');
  });
  it('detects black', () => {
    const blackPgn = PGN.replace('[White "Rbhiwal"]', '[White "opp"]').replace('[Black "opp"]', '[Black "Rbhiwal"]');
    const g = selectGames(
      [raw({ pgn: blackPgn, white: { username: 'opp', result: 'win' }, black: { username: 'Rbhiwal', result: 'resigned' } })] as never,
      'Rbhiwal',
      5,
    );
    expect(g[0].myColor).toBe('b');
    expect(g[0].opponent).toBe('opp');
  });
});

describe('fetchRecentGames', () => {
  const arch = (n: number) => `https://api.chess.com/pub/player/rbhiwal/games/2026/0${n}`;
  it('fetches archives then the latest archive, one request at a time', async () => {
    const calls: string[] = [];
    let inflight = 0;
    let maxInflight = 0;
    const f = async (u: string) => {
      calls.push(u);
      maxInflight = Math.max(maxInflight, ++inflight);
      await new Promise((r) => setTimeout(r, 1));
      inflight--;
      if (u.endsWith('/archives')) return json({ archives: [arch(1), arch(2)] });
      return json({ games: [raw({}, 1), raw({}, 2)] });
    };
    const games = await fetchRecentGames('Rbhiwal', 2, f);
    expect(calls).toEqual(['https://api.chess.com/pub/player/rbhiwal/games/archives', arch(2)]);
    expect(maxInflight).toBe(1);
    expect(games).toHaveLength(2);
  });
  it('goes back one archive when the latest has too few games', async () => {
    const f = async (u: string) => {
      if (u.endsWith('/archives')) return json({ archives: [arch(1), arch(2)] });
      return json({ games: u === arch(2) ? [raw({}, 1)] : [raw({}, 2), raw({}, 3)] });
    };
    expect(await fetchRecentGames('Rbhiwal', 3, f)).toHaveLength(3);
  });
  it('reports API failures clearly', async () => {
    await expect(fetchRecentGames('x', 5, async () => json({}, 404))).rejects.toMatchObject({ kind: 'notfound' });
    await expect(fetchRecentGames('x', 5, async () => json({}, 500))).rejects.toMatchObject({ kind: 'http' });
    await expect(
      fetchRecentGames('x', 5, async () => {
        throw new TypeError('offline');
      }),
    ).rejects.toMatchObject({ kind: 'network' });
    await expect(fetchRecentGames('x', 5, async () => new Response('<html>', { status: 200 }))).rejects.toBeInstanceOf(ApiError);
    await expect(fetchRecentGames('', 5, async () => json({}))).rejects.toMatchObject({ kind: 'notfound' });
  });
  it('says so when there are no suitable games', async () => {
    const f = async (u: string) => (u.endsWith('/archives') ? json({ archives: [arch(1)] }) : json({ games: [raw({ time_class: 'bullet' })] }));
    await expect(fetchRecentGames('Rbhiwal', 5, f)).rejects.toMatchObject({ kind: 'nogames' });
  });
});

import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/** TEST DATA shaped like the Chess.com archive; hand-built, not real games. */
const dir = mkdtempSync(join(tmpdir(), 'seedcheck-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (file: string) =>
  new Promise<{ status: number; stdout: string }>((resolve) =>
    execFile(process.execPath, ['scripts/check-seeds-against-archive.mjs', '--file', file], { encoding: 'utf8' }, (err, stdout) =>
      resolve({ status: err ? Number((err as { code?: number }).code ?? 1) : 0, stdout }),
    ),
  );

describe('check-seeds script', () => {
  it('finds a seed position inside the game it came from, including by transposition', async () => {
    // L4.qb6 is "d4 d5 Bf4 c5 e3 Nc6 Nf3 Qb6"; here it is reached with a different move order
    const pgn = '1. Nf3 d5 2. d4 c5 3. Bf4 Nc6 4. e3 Qb6 5. c3 Qxb2 *';
    const f = join(dir, 'a.json');
    writeFileSync(f, JSON.stringify({ games: [{ url: 'https://www.chess.com/game/live/184468491044', pgn, white: { username: 'x' }, black: { username: 'y' } }] }));
    const r = await run(f);
    expect(r.stdout).toMatch(/position found\s+L4\.qb6\s+game 184468491044 after ply 8/);
    expect(r.stdout).toMatch(/L4\.trap/); // same game is named by the trap seed: not reached by this short game
    expect(r.stdout).toMatch(/not in this archive\s+B2\.f7/);
  });
  it('reports a position that never occurs, and exits with an error', async () => {
    const f = join(dir, 'b.json');
    writeFileSync(f, JSON.stringify({ games: [{ url: 'https://www.chess.com/game/live/184461095806', pgn: '1. e4 e5 2. Nf3 Nc6 *', white: { username: 'a' }, black: { username: 'b' } }] }));
    const r = await run(f);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/NOT REACHED\s+B2\.f7/);
  });
  it('fails clearly on a missing file', async () => {
    expect((await run(join(dir, 'nope.json'))).status).toBe(1);
  });
});

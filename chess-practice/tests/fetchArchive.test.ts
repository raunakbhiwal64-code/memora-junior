import { execFile, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** TEST DATA shaped like the Chess.com API; the script is run against a local server, not Chess.com. */
let server: http.Server;
let port = 0;
const out = new URL('../data/archives/zz-test-2026-09.json', import.meta.url);
beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/player/zz-test/games/2026/09') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ games: [{ time_class: 'rapid' }, { time_class: 'blitz' }, { time_class: 'rapid' }] }));
    } else {
      res.writeHead(404);
      res.end('{}');
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  port = (server.address() as { port: number }).port;
});
afterAll(() => {
  server.close();
  rmSync(out, { force: true });
});

/** Async on purpose: the local test server lives in this process and must stay free to answer. */
const run = (args: string[]) =>
  new Promise<{ status: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      process.execPath,
      ['scripts/fetch-archive.mjs', ...args],
      { env: { ...process.env, CHESSCOM_BASE: `http://localhost:${port}` }, encoding: 'utf8' },
      (err, stdout, stderr) => resolve({ status: err ? Number((err as { code?: number }).code ?? 1) : 0, stdout, stderr }),
    );
  });

describe('fetch-archive script', () => {
  it('saves the month to data/archives and summarises it', async () => {
    const r = await run(['--user', 'ZZ-Test', '--month', '2026-09']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Saved 3 games \(rapid: 2, blitz: 1\)/);
    expect(existsSync(out)).toBe(true);
    expect(JSON.parse(readFileSync(out, 'utf8')).games).toHaveLength(3);
  });
  it('rejects bad input and reports a missing user clearly', async () => {
    expect((await run(['--user', 'x y', '--month', '2026-09'])).status).toBe(2);
    expect((await run(['--user', 'zz-test', '--month', '2026-13'])).status).toBe(2);
    const r = await run(['--user', 'nobody-here', '--month', '2026-09']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/does not know that user or month/);
  });
  it('keeps data/ out of git', () => {
    const ignored = execFileSync('git', ['check-ignore', 'data/archives/x.json'], { encoding: 'utf8' }).trim();
    expect(ignored).toBe('data/archives/x.json');
  });
});

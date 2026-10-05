// Saves one month of PUBLIC Chess.com games to data/archives/<user>-<yyyy>-<mm>.json for offline checking.
//   npm run fetch-archive -- --user rbhiwal --month 2026-09
// No password or key is used. The data/ folder is not committed.
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const user = (get('--user') ?? 'rbhiwal').toLowerCase();
const month = get('--month') ?? '';
const base = process.env.CHESSCOM_BASE ?? 'https://api.chess.com/pub';

if (!/^[a-z0-9_-]{2,30}$/.test(user) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
  console.error('Usage: npm run fetch-archive -- --user rbhiwal --month 2026-09');
  process.exit(2);
}
const [yyyy, mm] = month.split('-');
const url = `${base}/player/${encodeURIComponent(user)}/games/${yyyy}/${mm}`;

try {
  const res = await fetch(url);
  if (res.status === 404) throw new Error('Chess.com does not know that user or month.');
  if (!res.ok) throw new Error(`Chess.com answered HTTP ${res.status}.`);
  const data = await res.json();
  if (!Array.isArray(data.games)) throw new Error('Unexpected response: no games list.');
  const outDir = new URL('../data/archives/', import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const file = new URL(`${user}-${month}.json`, outDir);
  writeFileSync(file, JSON.stringify(data));
  const classes = {};
  for (const g of data.games) classes[g.time_class] = (classes[g.time_class] ?? 0) + 1;
  console.log(`Saved ${data.games.length} games (${Object.entries(classes).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}) to data/archives/${user}-${month}.json`);
} catch (e) {
  console.error('Could not fetch the archive:', e.message);
  process.exit(1);
}

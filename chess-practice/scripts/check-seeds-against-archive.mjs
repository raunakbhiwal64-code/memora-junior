// Checks that each curriculum seed that names a Chess.com game really occurs in that game.
//   npm run fetch-archive -- --user rbhiwal --month 2026-09
//   npm run check-seeds -- --file data/archives/rbhiwal-2026-09.json
// For every seed with a game ID it finds the game in the archive, replays the PGN and reports the ply where the seed's position
// is reached (move counters ignored, so transpositions count). Nothing is changed; this only reports.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const args = process.argv.slice(2);
const file = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
if (!file) {
  console.error('Usage: npm run check-seeds -- --file data/archives/rbhiwal-2026-09.json');
  process.exit(2);
}
const seedsFile = new URL('../src/curriculum/seeds.json', import.meta.url);
const seeds = JSON.parse(readFileSync(seedsFile, 'utf8'));
let archive;
try {
  archive = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error('Could not read the archive:', e.message);
  process.exit(1);
}
const games = Array.isArray(archive.games) ? archive.games : [];
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const seedFen = (s) => {
  if (s.fen) return new Chess(s.fen).fen();
  const c = new Chess();
  for (const m of (s.prefix ?? '').split(/\s+/).filter(Boolean)) c.move(m);
  return c.fen();
};

let found = 0;
let missing = 0;
let notReached = 0;
for (const s of seeds) {
  const src = (s.source ?? []).find((x) => x.gameId);
  if (!src) continue;
  const g = games.find((x) => String(x.url ?? '').endsWith('/' + src.gameId));
  if (!g) {
    missing++;
    console.log(`not in this archive  ${s.id.padEnd(14)} game ${src.gameId}`);
    continue;
  }
  const target = key(seedFen(s));
  const c = new Chess();
  try {
    c.loadPgn(g.pgn);
  } catch (e) {
    console.log(`PGN unreadable      ${s.id.padEnd(14)} game ${src.gameId}: ${e.message}`);
    continue;
  }
  const replay = new Chess();
  let hit = -1;
  const moves = c.history();
  if (key(replay.fen()) === target) hit = 0;
  moves.forEach((m, i) => {
    replay.move(m);
    if (hit < 0 && key(replay.fen()) === target) hit = i + 1;
  });
  if (hit >= 0) {
    found++;
    console.log(`position found      ${s.id.padEnd(14)} game ${src.gameId} after ply ${hit} (${g.white?.username ?? '?'} vs ${g.black?.username ?? '?'})`);
  } else {
    notReached++;
    console.log(`NOT REACHED         ${s.id.padEnd(14)} game ${src.gameId}: the position never occurs in this game. First moves: ${moves.slice(0, 12).join(' ')}`);
  }
}
console.log(`\n${found} seed position(s) found in their games, ${notReached} not reached, ${missing} game(s) not in this archive.`);
process.exit(notReached ? 1 : 0);

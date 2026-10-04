// Builds public/puzzles.json: a small beginner-friendly subset of the official
// Lichess puzzle database (CC0). Run once on your computer:  npm run make-puzzles
//
// Source: https://database.lichess.org/#puzzles  (lichess_db_puzzle.csv.zst)
// Needs Node 22.15+ (built-in zstd). Reads the download as a stream and stops
// early, so it does NOT download the whole file.
//
// Optional: node scripts/make-puzzles.mjs --file path/to/lichess_db_puzzle.csv[.zst]
import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';
import { createInterface } from 'node:readline';

const URL_DB = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const OUT = new URL('../public/puzzles.json', import.meta.url);
const WANT = ['fork', 'pin', 'skewer', 'hangingPiece', 'mateIn1', 'mateIn2', 'backRankMate'];
const PER_THEME = 300;
const MAX_ROWS = 1_500_000;
const BAND = [800, 1400];
const MIN_POPULARITY = 80;

const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

function openStream() {
  if (fileArg) {
    const raw = createReadStream(fileArg);
    return fileArg.endsWith('.zst') ? raw.pipe(zlib.createZstdDecompress()) : raw;
  }
  if (typeof zlib.createZstdDecompress !== 'function') {
    console.error('This Node version has no built-in zstd. Install Node 22.15 or newer, or pass --file with an unpacked .csv.');
    process.exit(1);
  }
  return fetch(URL_DB).then((res) => {
    if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
    return Readable.fromWeb(res.body).pipe(zlib.createZstdDecompress());
  });
}

/** Pure row filter (exported for tests). Columns follow the official CSV header. */
export function parseRow(line) {
  const c = line.split(',');
  if (c.length < 8 || c[0] === 'PuzzleId') return null;
  const [id, fen, moves, rating, , popularity, , themes] = c;
  const mv = moves.trim().split(/\s+/);
  if (!id || !fen || mv.length < 3) return null;
  return { id, fen, moves: mv, rating: Number(rating), popularity: Number(popularity), themes: themes.trim().split(/\s+/) };
}

export function accept(p) {
  return !!p && p.rating >= BAND[0] && p.rating <= BAND[1] && p.popularity >= MIN_POPULARITY && p.moves.length <= 6;
}

async function main() {
  const stream = await openStream();
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const buckets = Object.fromEntries(WANT.map((t) => [t, []]));
  const seen = new Set();
  let rows = 0;
  for await (const line of rl) {
    if (++rows > MAX_ROWS) break;
    const p = parseRow(line);
    if (!accept(p)) continue;
    for (const t of WANT) {
      if (buckets[t].length < PER_THEME && p.themes.includes(t) && !seen.has(p.id)) {
        buckets[t].push({ id: p.id, fen: p.fen, moves: p.moves, rating: p.rating, themes: p.themes });
        seen.add(p.id);
        break;
      }
    }
    if (WANT.every((t) => buckets[t].length >= PER_THEME)) break;
  }
  rl.close();
  stream.destroy?.();
  const puzzles = Object.values(buckets).flat();
  if (puzzles.length === 0) throw new Error('No puzzles matched. Is the input the official Lichess puzzle CSV?');
  mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({
      meta: {
        source: 'https://database.lichess.org/#puzzles',
        license: 'CC0 (public domain dedication)',
        generated: new Date().toISOString().slice(0, 10),
        note: `Subset: rating ${BAND[0]}-${BAND[1]}, popularity >= ${MIN_POPULARITY}, up to ${PER_THEME} per theme. FEN is before the opponent's setup move (Moves[0]).`,
      },
      puzzles,
    }),
  );
  const counts = WANT.map((t) => `${t}: ${buckets[t].length}`).join(', ');
  console.log(`Wrote ${puzzles.length} puzzles to public/puzzles.json (${counts}). Rows scanned: ${rows}.`);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((e) => {
    console.error('Could not build the puzzle file:', e.message);
    process.exit(1);
  });
}

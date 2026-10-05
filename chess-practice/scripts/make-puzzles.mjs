// Builds public/puzzles.json: a small beginner-friendly subset of the official
// Lichess puzzle database (CC0). Run once on your computer:  npm run make-puzzles
//
// Source: https://database.lichess.org/#puzzles  (lichess_db_puzzle.csv.zst, ~300 MB)
// The file is read as a stream and reading STOPS as soon as enough puzzles are
// found, so only the first part of the file is downloaded. Decompression uses the
// pure-JavaScript `fzstd` package (works on any Node version, including Windows).
//
// Optional: node scripts/make-puzzles.mjs --file path/to/lichess_db_puzzle.csv[.zst]
import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Decompress } from 'fzstd';

const URL_DB = process.env.PUZZLE_URL || 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const OUT = new URL('../public/puzzles.json', import.meta.url);
const WANT = ['fork', 'pin', 'skewer', 'hangingPiece', 'mateIn1', 'mateIn2', 'backRankMate'];
const PER_THEME = 300;
const MAX_ROWS = 1_500_000;
const BAND = [800, 1400];
const MIN_POPULARITY = 80;

const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const net = { status: '', type: '', length: '', bytes: 0 };

/** Pure row parser (exported for tests). Columns follow the official CSV header. */
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

async function* sourceBytes(abort) {
  if (fileArg) {
    for await (const c of createReadStream(fileArg)) yield c;
    return;
  }
  const res = await fetch(URL_DB, { signal: abort.signal });
  net.status = `${res.status} ${res.statusText}`;
  net.type = res.headers.get('content-type') ?? '';
  net.length = res.headers.get('content-length') ?? '';
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  for await (const c of res.body) {
    net.bytes += c.length;
    yield c;
  }
}

/** Feeds every decoded text line to `handle`; stops early when handle returns true. */
async function readLines(handle) {
  const abort = new AbortController();
  const isZst = fileArg ? fileArg.endsWith('.zst') : true;
  const td = new TextDecoder();
  let tail = '';
  let stop = false;
  const onText = (u8) => {
    tail += td.decode(u8, { stream: true });
    const parts = tail.split('\n');
    tail = parts.pop();
    for (const p of parts) {
      if (handle(p.endsWith('\r') ? p.slice(0, -1) : p)) {
        stop = true;
        return;
      }
    }
  };
  try {
    if (isZst) {
      const dec = new Decompress((chunk) => {
        if (!stop) onText(chunk);
      });
      for await (const c of sourceBytes(abort)) {
        dec.push(c);
        if (stop) break;
      }
      if (!stop) dec.push(new Uint8Array(0), true);
    } else {
      for await (const c of sourceBytes(abort)) {
        onText(c);
        if (stop) break;
      }
    }
    if (!stop && tail) handle(tail);
  } finally {
    abort.abort();
  }
}

async function main() {
  const buckets = Object.fromEntries(WANT.map((t) => [t, []]));
  const seen = new Set();
  const stats = { rows: 0, parsed: 0, inBand: 0, popular: 0, short: 0, wantedTheme: 0 };
  let firstLine = '';
  let lastProgress = Date.now();
  await readLines((line) => {
    if (!firstLine) firstLine = line;
    if (++stats.rows > MAX_ROWS) return true;
    if (Date.now() - lastProgress > 3000) {
      lastProgress = Date.now();
      const got = Object.values(buckets).reduce((n, b) => n + b.length, 0);
      console.log(`  ...read ${stats.rows.toLocaleString()} rows, kept ${got} puzzles`);
    }
    const p = parseRow(line);
    if (!p || Number.isNaN(p.rating)) return false;
    stats.parsed++;
    if (p.rating < BAND[0] || p.rating > BAND[1]) return false;
    stats.inBand++;
    if (!(p.popularity >= MIN_POPULARITY)) return false;
    stats.popular++;
    if (p.moves.length > 6) return false;
    stats.short++;
    if (!WANT.some((t) => p.themes.includes(t))) return false;
    stats.wantedTheme++;
    for (const t of WANT) {
      if (buckets[t].length < PER_THEME && p.themes.includes(t) && !seen.has(p.id)) {
        buckets[t].push({ id: p.id, fen: p.fen, moves: p.moves, rating: p.rating, themes: p.themes });
        seen.add(p.id);
        break;
      }
    }
    return WANT.every((t) => buckets[t].length >= PER_THEME);
  });
  const puzzles = Object.values(buckets).flat();
  if (puzzles.length === 0) {
    console.error('Diagnostics:', JSON.stringify(stats));
    console.error('First line read:', firstLine.slice(0, 200) || '(nothing was read)');
    if (!fileArg) console.error('Download:', JSON.stringify(net));
    throw new Error('No puzzles matched. Is the input the official Lichess puzzle CSV?');
  }
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
  console.log(`Wrote ${puzzles.length} puzzles to public/puzzles.json (${counts}). Rows scanned: ${stats.rows}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Could not build the puzzle file:', e.message);
      process.exit(1);
    });
}

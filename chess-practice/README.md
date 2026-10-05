# Chess Practice

Learn from positions in **your own** Chess.com games. A small, static web app: no server,
no database, no accounts, no paid services. Everything runs in your browser.

**The loop:** load your recent games → the engine finds up to 3 important mistakes →
each one becomes a playable board → you try a better move → a plain-language explanation
→ one real Lichess puzzle.

> All engine results are **estimates**, not certainty. Test fixtures are always labelled
> "TEST FIXTURE"; nothing fake is ever shown as live data.

## Start (Windows, macOS or Linux)

You need **Node.js 22.15 or newer** (check with `node --version`) and Git.

```
npm install
npm run dev
```

Open **http://localhost:5173/** in Chrome, Edge or Firefox.

**Stop:** click the terminal window and press `Ctrl + C`.

## First use

1. Type your Chess.com username (default `Rbhiwal`) and press **Load my last 5 blitz/rapid games**.
   No password is ever needed; only Chess.com's public read-only API is used.
2. Press **Find my mistakes**. The engine runs inside the page; a few minutes for five games
   is normal. Results are cached in your browser, so repeating is fast.
3. Pick a learning path (**Opening**, **Middle game** or **End game**; all are open at any time) and press its button or one of its lessons, try a move, then **Show explanation**. Each path only contains real mistakes from your games in that phase; an empty path says so. Progress ("2 of 3 positions practised") is saved in this browser only.
4. Press **Get a puzzle**. This needs the small puzzle file (next section).

No internet? Use **Use the test fixture games** to try the whole loop.
Prefer not to use the API? Paste a PGN instead.

## Build the puzzle file (once)

The full Lichess puzzle database is far too large for a browser, so the app uses a small
subset (a few thousand puzzles, rating 800-1400) cut from the official CC0 database.
This was chosen over the live Lichess puzzle endpoint because the database format
(FEN + UCI moves, with `Moves[0]` as the opponent's setup move) is exactly what the
app's puzzle player expects, it works offline afterwards, and it has no rate limits.

```
npm run make-puzzles
```

This streams `lichess_db_puzzle.csv.zst` (about 300 MB in full) from https://database.lichess.org/, stops after
it has enough puzzles (it only downloads the first part of the file) and writes `public/puzzles.json`.
Run it once, then (re)start `npm run dev`. If the download is blocked, download the file
yourself and run `node scripts/make-puzzles.mjs --file path\to\lichess_db_puzzle.csv.zst`.

## Tests

```
npm test
```

Covers: score perspective for both colours, mate scores, PGN errors, the Chess.com import
(sequential requests, going back an archive, API failures), illegal moves, castling, en passant,
promotion, the Lichess setup-move rule, and a full loop on the fixtures with the real engine.
The fixtures (`src/fixtures.ts`) are hand-made, clearly marked, and not real games or Lichess data.

## How it works

| Piece | Choice |
|---|---|
| Build / language | Vite + TypeScript |
| Rules, PGN | chess.js |
| Engine | Stockfish 19 "lite" single-threaded WebAssembly, in a Web Worker (needs no special server headers) |
| Search budget | depth 12 for every move (same before and after); the best candidates are re-checked at depth 16 |
| Mistake rule | engine estimate says you lost at least 1 pawn of advantage, or allowed / missed a forced mate; positions that were already lost or are still decisively won are ignored |
| Explanations | simple templates over board facts (captures, undefended pieces, checks, forks, mates); if no reason can be found it says "explanation limited" |
| Storage | browser `localStorage` only (cached analysis, username) |

Use **Clear saved results** in the app to wipe the cache.

## Privacy

Games are fetched straight from Chess.com into your browser. Nothing is sent to any server of
ours (there is none). If you later publish this app on GitHub Pages, the page is public: anyone
with the link can see the default username and use the app; analysis results stay in each visitor's own browser.

## Licence and credits

GPL-3.0-or-later (see `LICENSE`) because it bundles Stockfish (GPLv3). Dependencies and data
sources are listed in `THIRD_PARTY.md`. Lichess puzzle IDs are shown for attribution.

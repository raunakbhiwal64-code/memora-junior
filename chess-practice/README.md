# Chess Practice

An app for adult learners: learn from positions in **your own** Chess.com games. A small, static web app: no server,
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
On the board, click or tap a piece and then a highlighted square, or drag the piece. Use **Hint** for a nudge that never names the answer; the explanation and the arrows (red dashed = your move, green solid = the engine's pick) appear only after you have tried.
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

## Curriculum data and verification (stage 0b shell)

The opening course is plain data in `src/curriculum/`: `lessons.json` (IDs, colour, prerequisites, concept IDs, sources,
honest labels) and `seeds.json` (exact positions built from legal move lists, each with checkable claims). **No lesson
content or scored quiz is built yet**; every lesson is marked `pending`, and the standard Pirc is marked `not-grounded`.

```
npm run verify-curriculum        # re-checks every seed with the installed Stockfish (depth 18, MultiPV 3, ~45 s)
```

This writes `src/curriculum/verification.generated.json` (engine name, depth, measured values, pass/fail, and where the
older Stockfish 14.1 notes agree or differ). A seed counts as **verified** only if the report was produced for exactly
its current definition; change a seed and it falls back to **pending** until you re-run the command. Every search
starts from a fresh engine state, so two runs give identical reports. Invalid seeds are withheld, never shown.

## Saved data, backup and offline use

Imported games, progress and engine results stay in this browser (`localStorage`, prefix `chess-practice:`, schema v1).
"Use my saved games" works with the internet blocked when the app runs from your own computer (`npm run dev`).
"Download backup" writes everything to a JSON file; "Restore backup" only **adds** what is missing. "Clear saved
analysis" removes only recomputable engine results; progress and saved games are kept.
To use a hosted copy offline later, a service worker would be needed; that is not built yet.

To save a month of your public Chess.com games for checking real positions (no password; files stay in the
git-ignored `data/` folder):

```
npm run fetch-archive -- --user rbhiwal --month 2026-09
```

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
| Mistake rule | the engine estimates a single move lost at least 1 pawn, or allowed / missed a forced mate, or tipped you from "not worse" to "more than 1.5 pawns worse" (drop of 0.5+). Moves made when you were **already** more than 1.5 pawns worse are skipped (damage control, not the cause), and the earliest teachable mistake of each game is ranked first |
| Explanations | simple templates over board facts (captures, undefended pieces, checks, forks, mates); if no reason can be found it says "explanation limited" |
| Storage | browser `localStorage` only (cached analysis, username) |

Use **Clear saved results** in the app to wipe the cache.

## Privacy

Games are fetched straight from Chess.com into your browser. Nothing is sent to any server of
ours (there is none). If you later publish this app on GitHub Pages, the page is public: anyone
with the link can see the default username and use the app; analysis results stay in each visitor's own browser.

## Publish on GitHub Pages (optional)

This app lives in the `chess-practice/` folder of the `memora-junior` repository, as a separate piece from the
Memora Junior app. It is for adult learners. The build is fully static with relative paths, so the same files work at
`localhost` and under a Pages address such as `https://<username>.github.io/memora-junior/chess-practice/`.

The workflow `.github/workflows/pages.yml` (at the repo root) is **manual only**: nothing is published until you run it.
It publishes the Memora Junior app at `/` (unchanged) and this app at `/chess-practice/`.

1. The repository must be **public** (GitHub Pages on a private repo needs a paid plan).
2. Settings > Pages > Source: **GitHub Actions**.
3. Actions > "Publish to GitHub Pages" > **Run workflow** (on `main`).

No secrets, tokens or passwords are used. **A public page is visible to anyone with the link**: it shows the default
Chess.com username (`Rbhiwal`, editable in `src/main.ts`) and anyone can use the app, but games and analysis are fetched
and stored only in each visitor's own browser.

## Licence and credits

GPL-3.0-or-later (see `LICENSE`) because it bundles Stockfish (GPLv3). Dependencies and data
sources are listed in `THIRD_PARTY.md`. Lichess puzzle IDs are shown for attribution.

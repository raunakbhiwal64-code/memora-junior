# Third-party software and data

| Item | Use | Licence |
|---|---|---|
| [Stockfish](https://stockfishchess.org/) 19 (compiled to WebAssembly by [stockfish.js](https://github.com/nmrugg/stockfish.js), Nathan Rugg / Chess.com) | Chess engine, shipped in `public/engine/` | GPL-3.0 |
| [chess.js](https://github.com/jhlywa/chess.js) | Move generation, PGN, legality | BSD-2-Clause |
| [Vite](https://vite.dev/) | Dev server and build | MIT |
| [TypeScript](https://www.typescriptlang.org/) | Language / type checking | Apache-2.0 |
| [Vitest](https://vitest.dev/) | Tests | MIT |
| [fzstd](https://github.com/101arrowz/fzstd) | Pure-JavaScript zstd decoder, used only by `npm run make-puzzles` | MIT |
| [Lichess puzzle database](https://database.lichess.org/#puzzles) | Subset in `public/puzzles.json` (built by `npm run make-puzzles`) | CC0 |
| [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api) | Read-only game import, called from your browser | Chess.com terms of use |

Because Stockfish is GPL-3.0 and is distributed with this app, the app as a whole is
distributed under GPL-3.0 (the full text is in `LICENSE`, copied from the Stockfish package).
The Stockfish source is at https://github.com/official-stockfish/Stockfish and the
WebAssembly build at https://github.com/nmrugg/stockfish.js.

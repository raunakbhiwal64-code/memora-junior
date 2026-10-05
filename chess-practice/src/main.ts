import './style.css';
import { Chess } from 'chess.js';
import { Board } from './board';
import { cacheClear } from './cache';
import { ApiError, fetchRecentGames } from './chesscom';
import { createBrowserEngine, type Engine } from './engine';
import { explainMoment } from './explain';
import { FIXTURE_GAMES, FIXTURE_PUZZLE } from './fixtures';
import { DEFAULTS, findMoments } from './moments';
import { PgnError, colorOf, lineToSan, moveFromUci, parseGame } from './pgn';
import { MY_MOVES, PracticeSession } from './practice';
import { PuzzleSession, loadPuzzleFile, pickPuzzle, type PuzzlePick } from './puzzle';
import { renderPaths } from './paths';
import { buildPaths, lessonKey, localStore, noteAttempt, notePractised } from './progress';
import { formatScore } from './score';
import type { GameInfo, Moment } from './types';

const app = document.getElementById('app')!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const USER_KEY = 'chess-practice:username';
const PUZZLE_URL = new URL('puzzles.json', document.baseURI).href;

let username = (() => {
  try {
    return localStorage.getItem(USER_KEY) || 'Rbhiwal';
  } catch {
    return 'Rbhiwal';
  }
})();
let games: GameInfo[] = [];
let moments: Moment[] = [];
let engine: Engine | null = null;
let importError: { msg: string; retry: boolean } | null = null;
let importStatus = '';
let pgnError = '';
let abort: AbortController | null = null;

function getEngine(): Engine {
  if (!engine) engine = createBrowserEngine();
  return engine;
}

const shell = (inner: string) =>
  `<h1>Chess Practice</h1><p class="note">Learn from positions in your own games. Everything runs in this browser tab; nothing is uploaded. Engine results are estimates, not certainty.</p>${inner}`;

// ---------------------------------------------------------------- import ----
function viewImport() {
  const rows = games
    .map(
      (g, i) =>
        `<tr><td>${i + 1}</td><td>${esc(g.opponent)}</td><td>${g.myColor === 'w' ? 'White' : 'Black'}</td><td>${
          g.endTime ? new Date(g.endTime * 1000).toLocaleDateString() : '–'
        }</td><td>${esc(g.timeClass)}</td><td>${
          g.isFixture ? '<b>TEST FIXTURE</b>' : `<a href="${esc(g.url)}" target="_blank" rel="noopener">game link</a>`
        }</td></tr>`,
    )
    .join('');
  app.innerHTML = shell(`
  <section>
    <h2>1. Load your recent games</h2>
    <label>Chess.com username: <input type="text" id="user" value="${esc(username)}" autocomplete="off" /></label>
    <button class="btn primary" id="load">Load my last 5 blitz/rapid games</button>
    <p class="note">Uses Chess.com's public, read-only API. No password is ever needed.</p>
    <p id="status" class="note">${esc(importStatus)}</p>
    ${importError ? `<div class="err">${esc(importError.msg)} ${importError.retry ? '<button class="btn" id="retry">Retry</button>' : ''}</div>` : ''}
    ${games.length ? `<table><tr><th>#</th><th>Opponent</th><th>You</th><th>Date</th><th>Type</th><th>Link</th></tr>${rows}</table>
    <p><button class="btn primary" id="analyse">2. Find my mistakes in these games</button></p>` : ''}
  </section>
  <section>
    <h2>Or paste a PGN</h2>
    <textarea id="pgn" placeholder="Paste one game's PGN here"></textarea>
    <p>I played: <select id="pgncolor"><option value="">detect from username</option><option value="w">White</option><option value="b">Black</option></select>
    <button class="btn" id="usepgn">Use this PGN</button></p>
    ${pgnError ? `<div class="err">${esc(pgnError)}</div>` : ''}
  </section>
  <section>
    <h2>Try it without internet</h2>
    <div class="fixture">TEST FIXTURE: four generated test games (an opening, middle-game and end-game mistake as White, and one as Black). They are not your games and not real Chess.com data.</div>
    <button class="btn" id="fixture">Use the test fixture games</button>
    <button class="btn" id="clear">Clear saved results</button>
  </section>`);
  const user = app.querySelector<HTMLInputElement>('#user')!;
  user.addEventListener('input', () => {
    username = user.value;
    try {
      localStorage.setItem(USER_KEY, username);
    } catch {
      /* optional */
    }
  });
  const load = async () => {
    importError = null;
    games = [];
    moments = [];
    importStatus = 'Starting…';
    viewImport();
    try {
      games = await fetchRecentGames(username, 5, (u) => fetch(u), (m) => {
        importStatus = m;
        const el = app.querySelector('#status');
        if (el) el.textContent = m;
      });
      importStatus = `Found ${games.length} game${games.length === 1 ? '' : 's'}.`;
    } catch (e) {
      importStatus = '';
      importError = { msg: e instanceof ApiError ? e.message : 'Something went wrong while loading games.', retry: true };
    }
    viewImport();
  };
  app.querySelector('#load')!.addEventListener('click', load);
  app.querySelector('#retry')?.addEventListener('click', load);
  app.querySelector('#analyse')?.addEventListener('click', () => viewAnalysis());
  app.querySelector('#usepgn')!.addEventListener('click', () => {
    const text = app.querySelector<HTMLTextAreaElement>('#pgn')!.value;
    const forced = app.querySelector<HTMLSelectElement>('#pgncolor')!.value as '' | 'w' | 'b';
    try {
      const parsed = parseGame(text);
      const color = forced || colorOf(parsed.headers, username);
      if (!color) {
        pgnError = `Could not tell which side you played. Pick White or Black above (the PGN names are "${parsed.headers.White ?? '?'}" and "${parsed.headers.Black ?? '?'}", your username is "${username}").`;
        return viewImport();
      }
      pgnError = '';
      importError = null;
      const white = parsed.headers.White ?? 'White';
      const black = parsed.headers.Black ?? 'Black';
      games = [
        {
          id: 'pgn-' + hash(text),
          url: parsed.headers.Link ?? parsed.headers.Site ?? '',
          pgn: text,
          white,
          black,
          myColor: color,
          opponent: color === 'w' ? black : white,
          endTime: 0,
          timeClass: parsed.headers.Event ?? 'pasted',
          result: parsed.headers.Result ?? '',
        },
      ];
      importStatus = 'PGN loaded.';
    } catch (e) {
      pgnError = e instanceof PgnError ? e.message : 'Could not read that PGN.';
    }
    viewImport();
  });
  app.querySelector('#fixture')!.addEventListener('click', () => {
    games = FIXTURE_GAMES;
    importError = null;
    importStatus = 'Test fixture loaded (not your games).';
    viewImport();
  });
  app.querySelector('#clear')!.addEventListener('click', () => {
    cacheClear();
    importStatus = 'Saved results cleared.';
    viewImport();
  });
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// -------------------------------------------------------------- analysis ----
async function viewAnalysis() {
  abort = new AbortController();
  app.innerHTML = shell(`<section><h2>Finding your biggest mistakes…</h2>
    <p class="note">The chess engine runs inside this page. A few minutes is normal for five games; results are saved so a repeat is quick.</p>
    <progress id="bar" value="0" max="1"></progress><p id="label" class="note"></p>
    <button class="btn" id="cancel">Cancel</button></section>`);
  const bar = app.querySelector<HTMLProgressElement>('#bar')!;
  const label = app.querySelector('#label')!;
  app.querySelector('#cancel')!.addEventListener('click', () => abort?.abort());
  try {
    moments = await findMoments(
      games,
      getEngine(),
      DEFAULTS,
      (done, total, text) => {
        bar.max = Math.max(1, total);
        bar.value = done;
        label.textContent = `${text} (${done}/${total} of your moves checked)`;
      },
      abort.signal,
    );
    viewMoments();
  } catch (e) {
    const cancelled = (e as Error).name === 'AbortError';
    importError = { msg: cancelled ? 'Analysis cancelled.' : `The analysis stopped: ${(e as Error).message}`, retry: false };
    if (!cancelled) engine = null;
    viewImport();
  }
}

// ------------------------------------------------------------ learning paths ----
function viewMoments() {
  const fixture = moments.some((m) => m.isFixture);
  app.innerHTML = shell(`<section class="home">
    ${renderPaths(buildPaths(moments), { fixture, threshold: `${DEFAULTS.thresholdCp / 100} pawn` })}
    ${moments.length === 0 ? '<p>None of these games had a move that lost a meaningful amount of advantage. Nothing is invented: try more games.</p>' : ''}
    <p><button class="btn" id="back">Back to games</button></p></section>`);
  app.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((b) =>
    b.addEventListener('click', () => viewPractice(Number(b.dataset.i))),
  );
  app.querySelectorAll<HTMLButtonElement>('button[data-resume]').forEach((b) =>
    b.addEventListener('click', () => b.dataset.resume !== '' && viewPractice(Number(b.dataset.resume))),
  );
  app.querySelector('#back')!.addEventListener('click', viewImport);
}

// -------------------------------------------------------------- practice ----
function viewPractice(index: number) {
  const m = moments[index];
  const session = new PracticeSession(m, getEngine(), DEFAULTS.depth);
  let busy = false;
  let revealed = false;
  let attempted = false;
  app.innerHTML = shell(`<section>
    <h2>Position ${index + 1} of ${moments.length}: vs ${esc(m.opponent)}, move ${m.moveNumber}</h2>
    ${m.isFixture ? '<div class="fixture">TEST FIXTURE position (not from your games).</div>' : ''}
    <p class="status" id="turn"></p>
    <div id="boardwrap"><div id="board"></div></div>
    <p id="msg"></p>
    <button class="btn" id="reset">Reset / try again</button>
    <button class="btn" id="reveal" disabled>Show explanation</button>
    <button class="btn" id="back">Back to paths</button>
    <div id="explain"></div>
  </section>`);
  const board = new Board(app.querySelector('#board')!);
  const msg = app.querySelector<HTMLElement>('#msg')!;
  const turn = app.querySelector<HTMLElement>('#turn')!;
  const revealBtn = app.querySelector<HTMLButtonElement>('#reveal')!;

  const refresh = () => {
    board.set({ fen: session.chess.fen(), orientation: m.myColor, lastMove: session.lastMove, interactive: !busy && !session.finished && !revealed });
    turn.textContent = `You play ${m.myColor === 'w' ? 'White' : 'Black'}. ${session.turnText} to move.${
      session.movesPlayed === 0 ? " The opponent's last move is highlighted. Find a good move." : ` (Your move ${Math.min(session.movesPlayed + 1, MY_MOVES)} of ${MY_MOVES}.)`
    }`;
  };
  board.onIllegal = () => (msg.innerHTML = '<span class="bad">That move is not legal. Try another.</span>');
  board.onMove = async (from, to, promotion) => {
    if (!session.isLegal(from, to, promotion)) {
      msg.innerHTML = '<span class="bad">That move is not legal. Try another.</span>';
      return;
    }
    busy = true;
    msg.textContent = 'Checking your move…';
    board.set({ interactive: false });
    try {
      const a = await session.play(from, to, promotion);
      attempted = true;
      noteAttempt(localStore, lessonKey(m), a.good);
      revealBtn.disabled = false;
      msg.innerHTML = `<span class="${a.good ? 'good' : 'bad'}">${esc(a.san)}: ${esc(a.verdict)}.</span>${
        a.sameAsGame ? ' This is the same move you played in the game.' : ''
      }${a.engineReply ? ` Opponent replies ${esc(a.engineReply.san)}.` : ''}${a.gameOver ? ' ' + a.gameOver : ''}${
        a.finished ? ' That is the end of this practice. Press "Show explanation".' : ' Now play your next move.'
      }`;
    } catch (e) {
      msg.innerHTML = `<span class="bad">The engine had a problem: ${esc((e as Error).message)}</span>`;
      engine = null;
    }
    busy = false;
    refresh();
    if (session.finished) revealBtn.focus();
  };
  app.querySelector('#reset')!.addEventListener('click', () => {
    session.reset();
    revealed = false;
    msg.textContent = '';
    app.querySelector('#explain')!.innerHTML = '';
    refresh();
  });
  app.querySelector('#back')!.addEventListener('click', viewMoments);
  revealBtn.addEventListener('click', () => {
    if (!attempted) return;
    revealed = true;
    notePractised(localStore, lessonKey(m));
    refresh();
    showExplanation(m, board, index);
  });
  refresh();
}

// ----------------------------------------------------------- explanation ----
function showExplanation(m: Moment, board: Board, index: number) {
  const ex = explainMoment(m);
  const bestSan = lineToSan(m.fen, m.bestLine);
  const afterFen = (() => {
    const c = new Chess(m.fen);
    moveFromUci(c, m.playedUci);
    return c.fen();
  })();
  const refSan = lineToSan(afterFen, m.refutation);
  const box = app.querySelector<HTMLElement>('#explain')!;
  box.innerHTML = `
    <h2>What happened</h2>
    <p>In the game you played <b>${esc(m.playedSan)}</b>. The engine prefers <b>${esc(m.bestSan)}</b>.</p>
    <p><b>${esc(ex.headline)}</b></p>
    <p class="note">Engine estimate (depth-limited, not certainty): before your move ${esc(formatScore(m.before))}, after ${esc(formatScore(m.after))}, from your side's view.</p>
    ${ex.whyFailed.length ? `<h2>Why ${esc(m.playedSan)} failed</h2><ul class="facts">${ex.whyFailed.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${ex.whyBetter.length ? `<h2>What ${esc(m.bestSan)} does</h2><ul class="facts">${ex.whyBetter.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${ex.limited ? '<p class="note"><b>Explanation limited:</b> I could not find a simple concrete reason from the board, so study the lines below.</p>' : ''}
    <p>Watch the lines on the board:
      <button class="btn" id="vbest">Better line: ${esc(bestSan.join(' '))}</button>
      <button class="btn" id="vplayed">After your move: ${esc([m.playedSan, ...refSan].join(' '))}</button></p>
    <p><button class="btn" id="vprev" disabled>◀</button> <span id="vpos" class="note"></span> <button class="btn" id="vnext" disabled>▶</button></p>
    <h2>One similar puzzle</h2>
    <button class="btn primary" id="puzzle">Get a puzzle</button>
    <button class="btn" id="paths">Back to paths</button>`;
  let line: string[] = [];
  let i = 0;
  const show = () => {
    const c = new Chess(m.fen);
    let last: { from: string; to: string } | undefined;
    for (let k = 0; k < i; k++) {
      const r = moveFromUci(c, line[k]);
      last = { from: r.from, to: r.to };
    }
    board.set({ fen: c.fen(), orientation: m.myColor, lastMove: last, interactive: false });
    box.querySelector('#vpos')!.textContent = `step ${i} of ${line.length}`;
    (box.querySelector('#vprev') as HTMLButtonElement).disabled = i === 0;
    (box.querySelector('#vnext') as HTMLButtonElement).disabled = i >= line.length;
  };
  box.querySelector('#vbest')!.addEventListener('click', () => {
    line = m.bestLine;
    i = 0;
    show();
  });
  box.querySelector('#vplayed')!.addEventListener('click', () => {
    line = [m.playedUci, ...m.refutation];
    i = 0;
    show();
  });
  box.querySelector('#vprev')!.addEventListener('click', () => {
    i = Math.max(0, i - 1);
    show();
  });
  box.querySelector('#vnext')!.addEventListener('click', () => {
    i = Math.min(line.length, i + 1);
    show();
  });
  box.querySelector('#paths')!.addEventListener('click', viewMoments);
  box.querySelector('#puzzle')!.addEventListener('click', () => viewPuzzle(m, ex.theme, index));
  box.scrollIntoView({ behavior: 'smooth' });
}

// ---------------------------------------------------------------- puzzle ----
async function viewPuzzle(m: Moment, theme: string | undefined, index: number) {
  app.innerHTML = shell('<section><p>Looking for a puzzle…</p></section>');
  let pick: PuzzlePick | null = null;
  let problem = '';
  try {
    const file = await loadPuzzleFile(PUZZLE_URL);
    pick = pickPuzzle(file, theme);
    if (!pick) problem = 'The puzzle file has no beginner-level puzzles.';
  } catch (e) {
    problem = (e as Error).message;
  }
  if (!pick && m.isFixture) {
    pick = { puzzle: FIXTURE_PUZZLE, matched: false, label: 'TEST FIXTURE puzzle (hand-made, not from Lichess)' };
  }
  if (!pick) {
    app.innerHTML = shell(`<section><div class="err">${esc(problem)} To build it once, stop the app and run <code>npm run make-puzzles</code> in the project folder (see README), then start the app again.</div>
      <button class="btn" id="back">Back</button></section>`);
    app.querySelector('#back')!.addEventListener('click', () => viewPractice(index));
    return;
  }
  const session = new PuzzleSession(pick.puzzle);
  const p = pick.puzzle;
  app.innerHTML = shell(`<section>
    <h2>Puzzle</h2>
    ${p.isFixture ? '<div class="fixture">TEST FIXTURE puzzle: hand-made, not from the Lichess database.</div>' : ''}
    <p><b>${esc(pick.label)}</b></p>
    <p class="note">Rating ${p.rating}. Themes: ${esc(p.themes.join(', '))}.${
      p.isFixture ? '' : ` Puzzle <a href="https://lichess.org/training/${esc(p.id)}" target="_blank" rel="noopener">${esc(p.id)}</a> from the Lichess puzzle database (CC0).`
    }</p>
    <p class="status" id="turn">${session.learner === 'w' ? 'White' : 'Black'} to move. The opponent's setup move is highlighted. Find the best continuation.</p>
    <div id="board"></div><p id="msg"></p>
    <button class="btn" id="solution">Show solution</button>
    <button class="btn" id="back">Back</button></section>`);
  const board = new Board(app.querySelector('#board')!);
  const msg = app.querySelector<HTMLElement>('#msg')!;
  const refresh = (interactive = true) =>
    board.set({ fen: session.chess.fen(), orientation: session.learner, lastMove: session.lastMove, interactive: interactive && !session.solved });
  board.onIllegal = () => (msg.innerHTML = '<span class="bad">That move is not legal.</span>');
  board.onMove = (from, to, promotion) => {
    const r = session.try(from + to + (promotion ?? ''));
    if (r.result === 'illegal') msg.innerHTML = '<span class="bad">That move is not legal.</span>';
    else if (r.result === 'wrong') msg.innerHTML = '<span class="bad">Not the move this puzzle wants. Try again.</span>';
    else if (r.result === 'solved') msg.innerHTML = '<span class="good">Solved! Well done.</span>';
    else msg.innerHTML = '<span class="good">Correct.</span> Keep going.';
    refresh();
  };
  app.querySelector('#solution')!.addEventListener('click', () => {
    msg.textContent = 'Solution: ' + session.solutionSan().join(' ');
  });
  app.querySelector('#back')!.addEventListener('click', () => viewMoments());
  refresh();
}

viewImport();

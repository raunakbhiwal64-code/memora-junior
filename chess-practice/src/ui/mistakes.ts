import { loadAnalysis, saveAnalysis } from '../analysisStore';
import { ApiError, fetchRecentGames } from '../chesscom';
import { toCsv } from '../debug';
import { FIXTURE_GAMES } from '../fixtures';
import { loadSavedGames, saveGames } from '../games';
import { summariseLeaks } from '../leaks';
import { DEFAULTS, analyseGames } from '../moments';
import { PHASES, PHASE_LABEL, type Phase } from '../phase';
import { applyOverrides } from '../phaseOverride';
import { PgnError, colorOf, parseGame } from '../pgn';
import { buildPaths, localStore } from '../progress';
import { renderPaths } from '../paths';
import { repertoireCheck } from '../repertoire';
import { clearAnalysisCache, exportBackup, restoreBackup } from '../storage';
import { formatScore } from '../score';
import { app, esc, fmtDate, fmtWindow, getEngine, kv, nav, render, state, USER_KEY } from './ctx';
import { teacherHtml } from './teacher';

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Use a saved analysis if it was made for exactly these games. */
export function restoreAnalysis(): boolean {
  const a = loadAnalysis(kv, state.games);
  if (!a) return false;
  state.moments = applyOverrides(kv, a.result.moments);
  state.debug = a.result.debug;
  state.summary = a.result.summary;
  return true;
}

// ---------------------------------------------------------------- import ----
export function viewImport() {
  const saved = loadSavedGames();
  const rows = state.games
    .map(
      (g, i) =>
        `<tr><td>${i + 1}</td><td>${esc(g.opponent)}</td><td>${g.myColor === 'w' ? 'White' : 'Black'}</td><td>${fmtDate(g.endTime)}</td><td>${esc(g.timeClass)}</td><td>${
          g.isFixture ? '<b>TEST FIXTURE</b>' : `<a href="${esc(g.url)}" target="_blank" rel="noopener">game link</a>`
        }</td></tr>`,
    )
    .join('');
  render(
    `<section>
    <h2>Load your recent games</h2>
    <label>Chess.com username: <input type="text" id="user" value="${esc(state.username)}" autocomplete="off" /></label>
    <button class="btn primary" id="load">Load my last 5 blitz/rapid games</button>
    <p class="note">Uses Chess.com's public, read-only API. No password is ever needed.</p>
    <p id="status" class="note">${esc(state.importStatus)}</p>
    ${state.importError ? `<div class="err">${esc(state.importError.msg)} ${state.importError.retry ? '<button class="btn" id="retry">Retry</button>' : ''}</div>` : ''}
    ${
      state.games.length
        ? `<table><tr><th>#</th><th>Opponent</th><th>You</th><th>Date</th><th>Type</th><th>Link</th></tr>${rows}</table>
    <p><button class="btn primary" id="analyse">Find my mistakes in these games</button> <button class="btn" id="tomistakes">See my mistakes</button></p>`
        : ''
    }
  </section>
  <section>
    <h2>Or paste a PGN</h2>
    <textarea id="pgn" placeholder="Paste one game's PGN here"></textarea>
    <p>I played: <select id="pgncolor"><option value="">detect from username</option><option value="w">White</option><option value="b">Black</option></select>
    <button class="btn" id="usepgn">Use this PGN</button></p>
    ${state.pgnError ? `<div class="err">${esc(state.pgnError)}</div>` : ''}
  </section>
  <section>
    <h2>Saved on this computer</h2>
    ${
      saved
        ? `<p>Last import: ${saved.games.length} game${saved.games.length === 1 ? '' : 's'} for <b>${esc(saved.username)}</b>, saved ${esc(new Date(saved.savedAt).toLocaleString())}.</p>
    <p><button class="btn primary" id="usesaved">Use my saved games (works offline)</button></p>`
        : '<p class="note">No saved games yet. After you load games they are kept in this browser, so the app works offline later.</p>'
    }
    <p><button class="btn" id="backup">Download backup</button>
    <label class="btn">Restore backup <input type="file" id="restore" accept="application/json,.json" hidden></label>
    <button class="btn" id="clear">Clear saved analysis</button></p>
    <p id="datamsg" class="note" aria-live="polite"></p>
    <p class="note">A backup holds your progress, saved games and analysis. Restoring only adds what is missing; it never overwrites or deletes. "Clear saved analysis" removes only the engine results (they are recomputed); your progress and saved games stay.</p>
  </section>
  <section>
    <h2>Try it with test data</h2>
    <div class="fixture">TEST FIXTURE: six generated test games (opening, middle-game and end-game mistakes as White, a London game against …Qb6, and two as Black). They are not your games and not real Chess.com data.</div>
    <button class="btn" id="fixture">Use the test fixture games</button>
  </section>`,
    'mistakes',
  );
  const user = app.querySelector<HTMLInputElement>('#user')!;
  user.addEventListener('input', () => {
    state.username = user.value;
    try {
      localStorage.setItem(USER_KEY, state.username);
    } catch {
      /* optional */
    }
  });
  const setGames = () => {
    state.moments = [];
    state.debug = [];
    state.summary = undefined;
    restoreAnalysis();
  };
  const load = async () => {
    state.importError = null;
    state.games = [];
    state.moments = [];
    state.importStatus = 'Starting…';
    viewImport();
    try {
      state.games = await fetchRecentGames(state.username, 5, (u) => fetch(u), (m) => {
        state.importStatus = m;
        const el = app.querySelector('#status');
        if (el) el.textContent = m;
      });
      state.importStatus = `Found ${state.games.length} game${state.games.length === 1 ? '' : 's'}.`;
      saveGames(state.username, state.games);
      setGames();
    } catch (e) {
      state.importStatus = '';
      state.importError = { msg: e instanceof ApiError ? e.message : 'Something went wrong while loading games.', retry: true };
    }
    viewImport();
  };
  app.querySelector('#load')!.addEventListener('click', load);
  app.querySelector('#retry')?.addEventListener('click', load);
  app.querySelector('#analyse')?.addEventListener('click', () => viewAnalysis());
  app.querySelector('#tomistakes')?.addEventListener('click', () => viewMistakes());
  app.querySelector('#usepgn')!.addEventListener('click', () => {
    const text = app.querySelector<HTMLTextAreaElement>('#pgn')!.value;
    const forced = app.querySelector<HTMLSelectElement>('#pgncolor')!.value as '' | 'w' | 'b';
    try {
      const parsed = parseGame(text);
      const color = forced || colorOf(parsed.headers, state.username);
      if (!color) {
        state.pgnError = `Could not tell which side you played. Pick White or Black above (the PGN names are "${parsed.headers.White ?? '?'}" and "${parsed.headers.Black ?? '?'}", your username is "${state.username}").`;
        return viewImport();
      }
      state.pgnError = '';
      state.importError = null;
      const white = parsed.headers.White ?? 'White';
      const black = parsed.headers.Black ?? 'Black';
      state.games = [
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
      state.importStatus = 'PGN loaded.';
      setGames();
    } catch (e) {
      state.pgnError = e instanceof PgnError ? e.message : 'Could not read that PGN.';
    }
    viewImport();
  });
  app.querySelector('#fixture')!.addEventListener('click', () => {
    state.games = FIXTURE_GAMES;
    state.importError = null;
    state.importStatus = 'Test fixture loaded (not your games).';
    state.moments = [];
    state.debug = [];
    state.summary = undefined;
    viewImport();
  });
  const dataMsg = (t: string) => {
    const el = app.querySelector('#datamsg');
    if (el) el.textContent = t;
  };
  app.querySelector('#usesaved')?.addEventListener('click', () => {
    if (!saved) return;
    state.username = saved.username || state.username;
    state.games = saved.games;
    state.importError = null;
    state.importStatus = `Using ${state.games.length} saved game${state.games.length === 1 ? '' : 's'} (no internet needed).`;
    setGames();
    viewImport();
  });
  app.querySelector('#backup')!.addEventListener('click', () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chess-practice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    dataMsg('Backup downloaded.');
  });
  app.querySelector<HTMLInputElement>('#restore')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const r = restoreBackup(await file.text());
    dataMsg(r.ok ? `Restored: ${r.added} added, ${r.keptExisting} already present and kept.` : r.error ?? 'Could not restore.');
  });
  app.querySelector('#clear')!.addEventListener('click', () => {
    const n = clearAnalysisCache();
    dataMsg(`Cleared ${n} saved analysis result${n === 1 ? '' : 's'}. Progress and saved games were kept.`);
  });
}

// -------------------------------------------------------------- analysis ----
export async function viewAnalysis() {
  state.abort = new AbortController();
  render(
    `<section><h2>Finding your real mistakes…</h2>
    <p class="note">The chess engine runs inside this page. A few minutes is normal for five games; results are saved so a repeat is quick. Every one of your moves is checked at the same depth, and the strongest candidates are checked again deeper.</p>
    <progress id="bar" value="0" max="1"></progress><p id="label" class="note"></p>
    <button class="btn" id="cancel">Cancel</button></section>`,
    'mistakes',
  );
  const bar = app.querySelector<HTMLProgressElement>('#bar')!;
  const label = app.querySelector('#label')!;
  app.querySelector('#cancel')!.addEventListener('click', () => state.abort?.abort());
  try {
    const result = await analyseGames(
      state.games,
      getEngine(),
      DEFAULTS,
      (done, total, text) => {
        bar.max = Math.max(1, total);
        bar.value = done;
        label.textContent = `${text} (${done}/${total} of your moves checked)`;
      },
      state.abort.signal,
      repertoireCheck,
    );
    state.moments = applyOverrides(kv, result.moments);
    state.debug = result.debug;
    state.summary = result.summary;
    saveAnalysis(kv, state.games, result);
    viewMistakes();
  } catch (e) {
    const cancelled = (e as Error).name === 'AbortError';
    state.importError = { msg: cancelled ? 'Analysis cancelled.' : `The analysis stopped: ${(e as Error).message}`, retry: false };
    if (!cancelled) state.engine = null;
    viewImport();
  }
}

// --------------------------------------------------------- my mistakes home ----
export function viewMistakes() {
  if (!state.games.length) return viewImport();
  if (!state.summary && !restoreAnalysis()) {
    render(
      `<section><h2>Understand my mistakes</h2>
      <p>You have ${state.games.length} game${state.games.length === 1 ? '' : 's'} loaded. The engine will check every one of your moves and pick up to ${DEFAULTS.maxPerGame} real mistakes per game.</p>
      <p><button class="btn primary big" id="analyse">Find my mistakes</button> <button class="btn" id="games">Games and saved data</button></p></section>`,
      'mistakes',
    );
    app.querySelector('#analyse')!.addEventListener('click', viewAnalysis);
    app.querySelector('#games')!.addEventListener('click', viewImport);
    return;
  }
  const fixture = state.moments.some((m) => m.isFixture) || state.games.some((g) => g.isFixture);
  const filter = state.phaseFilter;
  const all = buildPaths(state.moments, localStore);
  const chip = (id: Phase | 'all', label: string, n: number) =>
    `<button type="button" class="chipbtn${filter === id ? ' on' : ''}" data-filter="${id}" aria-pressed="${filter === id}">${label} <span class="n">${n}</span></button>`;
  const chips =
    chip('all', 'All phases', state.moments.length) + PHASES.map((p) => chip(p.id, PHASE_LABEL[p.id], all.find((x) => x.phase === p.id)!.total)).join('');
  const leaks = summariseLeaks(state.moments, state.games.length);
  const leakRows = leaks.rows
    .map((r) => `<tr><td>${esc(r.tag)}</td><td>${r.games}</td><td>${r.moments}</td><td>${esc(fmtWindow(r.windowStart, r.windowEnd))}</td><td>${r.byColor.w} White, ${r.byColor.b} Black</td></tr>`)
    .join('');
  const s = state.summary!;
  render(
    `<section class="home">
      <div class="guide">${teacherHtml(state.moments.length ? 'start' : 'empty', 'stern')}<div>
        <h2>Understand my mistakes</h2>
        <p class="note">${s.games} game${s.games === 1 ? '' : 's'}, ${s.myMoves} of your moves checked with ${esc(s.engine)} at depth ${s.depth}, strongest candidates re-checked at depth ${s.recheckDepth}. ${s.eligible} eligible, ${s.picked} picked.</p>
        <p><button class="btn" id="rerun">Re-run analysis</button> <button class="btn" id="csv">Download analysis table (CSV)</button> <button class="btn" id="games">Games and saved data</button></p></div></div>
      <div class="chips" role="group" aria-label="Phase filter">${chips}</div>
      ${renderPaths(all, { fixture, filter })}
      <section class="leaks"><h2>Recurring patterns</h2>
      <p class="note">Sample: ${leaks.sampleGames} game${leaks.sampleGames === 1 ? '' : 's'}, ${esc(fmtWindow(leaks.windowStart, leaks.windowEnd))}. Counts are distinct games, not retries.</p>
      ${leaks.rows.length ? `<table><tr><th>Pattern (with evidence)</th><th>Games</th><th>Positions</th><th>Dates</th><th>Colour</th></tr>${leakRows}</table>` : '<p class="note">No pattern had concrete evidence, so none is listed. Nothing is invented.</p>'}
      ${leaks.untagged ? `<p class="note">${leaks.untagged} position${leaks.untagged === 1 ? '' : 's'} had no concrete tag and ${leaks.untagged === 1 ? 'is' : 'are'} not counted above.</p>` : ''}
      <p class="note">${esc(leaks.note)}</p></section>
    </section>`,
    'mistakes',
  );
  app.querySelector('#rerun')!.addEventListener('click', viewAnalysis);
  app.querySelector('#games')!.addEventListener('click', viewImport);
  app.querySelector('#csv')!.addEventListener('click', () => {
    const blob = new Blob([toCsv(state.debug)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chess-practice-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      state.phaseFilter = b.dataset.filter as Phase | 'all';
      viewMistakes();
    }),
  );
  app.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((b) => b.addEventListener('click', () => nav.round(state.moments[Number(b.dataset.i)].id)));
  app.querySelectorAll<HTMLButtonElement>('button[data-resume]').forEach((b) =>
    b.addEventListener('click', () => b.dataset.resume !== '' && nav.round(state.moments[Number(b.dataset.resume)].id)),
  );
}

export { formatScore };

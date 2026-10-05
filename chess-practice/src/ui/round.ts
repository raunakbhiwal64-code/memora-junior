import { Chess } from 'chess.js';
import { Board, type Arrow } from '../board';
import { logAttempt } from '../attempts';
import { FIXTURE_PUZZLE } from '../fixtures';
import { matchGame } from '../families';
import { LESSONS } from '../curriculum';
import { PHASES, PHASE_LABEL, type Phase } from '../phase';
import { setPhaseOverride } from '../phaseOverride';
import { moveFromUci } from '../pgn';
import { PracticeSession, CONTINUATION_MOVES, leadInSteps, type Outcome } from '../practice';
import { buildPaths, lessonKey, localStore, noteAttempt, notePractised } from '../progress';
import { PuzzleSession, loadPuzzleFile, matchPuzzle, type PuzzleFile, type PuzzleMatch } from '../puzzle';
import { recordOutcome } from '../reviews';
import { noteRoundCompleted } from '../rotation';
import { completeRound } from '../rounds';
import { hintFor, sixPart } from '../sixpart';
import { formatScore } from '../score';
import type { Moment } from '../types';
import { renderComplete } from './complete';
import { BEST_COLOR, PLAYED_COLOR, PUZZLE_URL, app, esc, getEngine, kv, nav, prefersReducedMotion, render, state } from './ctx';
import { teacherHtml, type TeacherEvent } from './teacher';
import { DEFAULTS } from '../moments';

let puzzleFile: PuzzleFile | null | undefined;
async function getPuzzleFile(): Promise<PuzzleFile | null> {
  if (puzzleFile !== undefined) return puzzleFile;
  try {
    puzzleFile = await loadPuzzleFile(PUZZLE_URL);
  } catch {
    puzzleFile = null;
  }
  return puzzleFile;
}

/** Next unpractised position in the same phase, if any. */
function nextInPhase(m: Moment): Moment | undefined {
  const path = buildPaths(state.moments, localStore).find((p) => p.phase === m.phase)!;
  const next = path.lessons.find((l) => l.moment.id !== m.id && (l.state === 'ready' || l.state === 'inProgress'));
  return next?.moment;
}

export function viewRound(momentId: string) {
  const m = state.moments.find((x) => x.id === momentId);
  if (!m) return nav.mistakes();
  const session = new PracticeSession(m, getEngine(), DEFAULTS.depth);
  const steps = leadInSteps(m);
  let busy = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  render(
    `<div class="lesson"><div class="lesson-board"><div class="board-frame"><div id="board"></div></div>
      <div class="board-actions" id="actions"></div></div>
    <section class="lesson-side">
      <p class="crumb">${esc(PHASE_LABEL[m.phase])} · move ${m.moveNumber} vs ${esc(m.opponent)}</p>
      <div id="teacher">${teacherHtml('start', 'stern')}</div>
      ${m.isFixture ? '<div class="fixture">TEST FIXTURE position (not from your games).</div>' : ''}
      <details class="phase-note"><summary>Phase: ${esc(PHASE_LABEL[m.phase])}${m.needsReview ? ' (needs review)' : ''}</summary>
        <p class="note">${esc(m.phaseReason)}</p>
        <label class="note">Wrong phase? <select id="phasesel">${PHASES.map((p) => `<option value="${p.id}"${p.id === m.phase ? ' selected' : ''}>${p.label}</option>`).join('')}</select></label></details>
      <div id="stage"></div>
    </section></div>`,
    'mistakes',
  );
  const board = new Board(app.querySelector('#board')!);
  const stage = app.querySelector<HTMLElement>('#stage')!;
  const actions = app.querySelector<HTMLElement>('#actions')!;
  const say = (e: TeacherEvent, mood: 'stern' | 'proud' = 'stern', line?: string) => (app.querySelector('#teacher')!.innerHTML = teacherHtml(e, mood, line));
  app.querySelector<HTMLSelectElement>('#phasesel')!.addEventListener('change', (e) => {
    const p = (e.target as HTMLSelectElement).value as Phase;
    setPhaseOverride(kv, m.id, p);
    m.phase = p;
    const mm = state.moments.find((x) => x.id === m.id);
    if (mm) mm.phase = p;
    app.querySelector('.crumb')!.textContent = `${PHASE_LABEL[p]} · move ${m.moveNumber} vs ${m.opponent}`;
  });

  // ---- stage 1: lead-in replay of the real game moves ----------------------
  const startLeadIn = () => {
    if (timer) clearInterval(timer);
    if (!steps.length) return attemptStage();
    actions.innerHTML = '';
    let i = -1;
    const manual = prefersReducedMotion();
    board.set({ fen: m.leadIn!.startFen, orientation: m.myColor, interactive: false });
    const advance = () => {
      i++;
      if (i >= steps.length) {
        if (timer) clearInterval(timer);
        return attemptStage();
      }
      board.set({ fen: steps[i].fen, orientation: m.myColor, lastMove: { from: steps[i].from, to: steps[i].to }, interactive: false });
      const el = stage.querySelector('#lead');
      if (el) el.textContent = `Move ${i + 1} of ${steps.length}: ${steps[i].san}`;
    };
    stage.innerHTML = `<p class="task">Here are the last ${steps.length} move${steps.length === 1 ? '' : 's'} from your game, leading into the position. You play ${m.myColor === 'w' ? 'White' : 'Black'}.</p>
      <p id="lead" class="note" aria-live="polite">Starting position of the replay.</p>
      <p>${manual ? '<button class="btn primary" id="step">Next move ▶</button> ' : ''}<button class="btn" id="skip">Skip to the position</button></p>`;
    stage.querySelector('#skip')!.addEventListener('click', () => {
      if (timer) clearInterval(timer);
      attemptStage();
    });
    if (manual) stage.querySelector('#step')!.addEventListener('click', advance);
    else timer = setInterval(advance, 900);
  };

  // ---- stage 2: the graded attempt at the EXACT target position ------------
  const refreshAttempt = () => {
    board.set({ fen: session.chess.fen(), orientation: m.myColor, lastMove: session.lastMove, interactive: !busy && !session.finished && session.outcome !== 'shown' });
  };
  const attemptStage = () => {
    if (timer) clearInterval(timer);
    say('start');
    actions.innerHTML = `<button class="btn big" id="reset">↺ Reset board</button><button class="btn big" id="hint">Hint</button>${steps.length ? '<button class="btn big" id="replay">⟲ Replay lead-in</button>' : ''}`;
    stage.innerHTML = `<p class="task" id="task">Your turn: this is the exact position from your game. You play ${m.myColor === 'w' ? 'White' : 'Black'}. Find a good move.</p>
      <p class="hint" id="hinttext" hidden></p><p id="msg" class="feedback" aria-live="polite"></p>
      <p><button class="btn" id="showme">Show me</button> <button class="btn primary big" id="explain" hidden>Show explanation</button></p>`;
    const msg = stage.querySelector<HTMLElement>('#msg')!;
    session.chess = new Chess(m.fen);
    session.lastMove = m.lastMove;
    refreshAttempt();
    actions.querySelector('#hint')!.addEventListener('click', () => {
      const h = stage.querySelector<HTMLElement>('#hinttext')!;
      h.textContent = hintFor(m);
      h.hidden = false;
    });
    actions.querySelector('#reset')!.addEventListener('click', () => {
      session.reset();
      board.clearSelection();
      refreshAttempt();
    });
    actions.querySelector('#replay')?.addEventListener('click', startLeadIn);
    stage.querySelector('#showme')!.addEventListener('click', () => {
      session.showAnswer();
      explainStage();
    });
    stage.querySelector('#explain')!.addEventListener('click', explainStage);
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
        if (a.isFirst) {
          if (a.grade.ok) {
            say('correct', 'proud');
            stage.querySelector<HTMLButtonElement>('#explain')!.hidden = false;
            stage.querySelector<HTMLButtonElement>('#showme')!.hidden = true;
            msg.innerHTML = `<span class="good">${esc(a.san)}: ${esc(a.grade.word)} (checked against the engine's best move).</span>${a.sameAsGame ? ' This is the move you played in the game.' : ''}${a.engineReply ? ` Opponent replies ${esc(a.engineReply.san)}.` : ''} You can keep playing the line (${CONTINUATION_MOVES} more moves) or press Show explanation.`;
          } else {
            say('retry');
            msg.innerHTML = `<span class="bad">${esc(a.san)}: ${esc(a.grade.word)}.</span>${a.sameAsGame ? ' This is the move from your game.' : ''} Not yet. The board is back at your position: try again, or press Show me.`;
            session.retry();
          }
        } else {
          msg.innerHTML = `<span class="${a.grade.ok ? 'good' : 'bad'}">${esc(a.san)}: ${esc(a.grade.word)}.</span>${a.engineReply ? ` Opponent replies ${esc(a.engineReply.san)}.` : ''}${a.gameOver ? ' ' + esc(a.gameOver) : ''}${session.finished ? ' That completes the line: press Show explanation.' : ''}`;
        }
      } catch (e) {
        msg.innerHTML = `<span class="bad">The engine had a problem: ${esc((e as Error).message)}</span>`;
        state.engine = null;
      }
      busy = false;
      refreshAttempt();
    };
  };

  // ---- stage 3: six-part explanation, only after the attempt ---------------
  const explainStage = () => {
    if (timer) clearInterval(timer);
    const outcome: Exclude<Outcome, 'pending'> = session.outcome === 'pending' || session.outcome === 'miss' ? 'shown' : session.outcome;
    if (outcome === 'shown') session.showAnswer();
    const good = outcome === 'independent' || outcome === 'corrected';
    noteAttempt(localStore, lessonKey(m), good);
    notePractised(localStore, lessonKey(m));
    logAttempt(kv, { ts: Date.now(), kind: 'moment', refId: m.id, outcome, detail: session.attempts.map((a) => a.san).join(' ') });
    recordOutcome(kv, { id: `moment:${m.id}`, kind: 'moment', ref: m.id, label: `Move ${m.moveNumber} vs ${m.opponent} (${PHASE_LABEL[m.phase]})` }, outcome, Date.now(), state.sessionNo);
    say(outcome === 'shown' ? 'shown' : 'correct', outcome === 'shown' ? 'stern' : 'proud');
    const sp = sixPart(m);
    const tried = session.attempts.find((a) => a.isFirst && a.grade.ok) ?? session.attempts[session.attempts.length - 1];
    const playedArrow: Arrow = { from: m.playedUci.slice(0, 2), to: m.playedUci.slice(2, 4), color: PLAYED_COLOR, dashed: true };
    const bestArrow: Arrow = { from: m.bestUci.slice(0, 2), to: m.bestUci.slice(2, 4), color: BEST_COLOR };
    board.set({ fen: m.fen, orientation: m.myColor, lastMove: m.lastMove, interactive: false, arrows: [playedArrow, bestArrow] });
    actions.innerHTML = '';
    const lessons = matchGame(state.games.find((g) => g.id === m.gameId)!)
      .map((x) => LESSONS.find((l) => l.id === x.lessonId)!)
      .filter((l) => l && l.contentStatus === 'built');
    const todayText = tried
      ? `Today you tried <b>${esc(tried.san)}</b>: ${esc(tried.grade.word)}${outcome === 'corrected' ? ' (after a retry)' : ''}.`
      : 'You asked to see the answer first, so today counts as shown, not as your own find.';
    stage.innerHTML = `
      <p class="note">${todayText}</p>
      <ol class="sixpart">
        <li><b>Position.</b> ${esc(sp.position)}</li>
        <li><b>What you played.</b> ${esc(sp.played)}</li>
        <li><b>Why it fails.</b> ${esc(sp.whyFails)}</li>
        <li><b>Better move and the idea.</b> ${esc(sp.better)}</li>
        <li><b>${esc(sp.tag)}</b>${m.tagEvidence ? '' : ''}</li>
        <li><b>Rule.</b> ${sp.rule ? esc(sp.rule) : 'No reusable rule is offered: no concrete pattern was identified.'}</li>
      </ol>
      ${sp.closeCall ? `<p class="note"><b>Plainly:</b> ${esc(sp.closeCall)}</p>` : ''}
      ${sp.context ? `<p class="note">${esc(sp.context)}</p>` : ''}
      ${sp.needsReview ? '<p class="honest"><b>Needs review:</b> part of this could not be explained concretely from the board and the engine line, so it is labelled instead of guessed.</p>' : ''}
      <p class="legend"><span class="swatch played" aria-hidden="true"></span> Dashed red arrow: your move in the game, <b>${esc(m.playedSan)}</b>. <span class="swatch best" aria-hidden="true"></span> Solid green arrow: the engine's pick, <b>${esc(m.bestSan)}</b>.</p>
      <p class="note">Engine estimates (${esc(m.engine.name)}, depth ${m.recheck.depth}, MultiPV ${m.engine.multipv}; not certainty): best ${esc(formatScore(m.before))}, your move ${esc(formatScore(m.after))}, from your side's view.</p>
      <p>Watch the lines on the board:
        <button class="btn" id="vbest">Better line: ${esc(sp.betterLineSan.join(' '))}</button>
        <button class="btn" id="vplayed">After your move: ${esc([m.playedSan, ...sp.refutationSan].join(' '))}</button></p>
      <p><button class="btn" id="vprev" disabled>◀</button> <span id="vpos" class="note"></span> <button class="btn" id="vnext" disabled>▶</button></p>
      ${lessons.length ? `<p class="note">Related lesson${lessons.length === 1 ? '' : 's'}: ${lessons.map((l) => `<button class="btn" data-lesson="${l.id}">${esc(l.title)}</button>`).join(' ')}</p>` : ''}
      <p><button class="btn primary big" id="topuzzle">Continue: matched puzzle</button></p>`;
    let line: string[] = [];
    let lineColor = BEST_COLOR;
    let i = 0;
    const show = () => {
      const c = new Chess(m.fen);
      let last: { from: string; to: string } | undefined;
      for (let k = 0; k < i; k++) {
        const r = moveFromUci(c, line[k]);
        last = { from: r.from, to: r.to };
      }
      const next = line[i];
      const arrows: Arrow[] = next ? [{ from: next.slice(0, 2), to: next.slice(2, 4), color: lineColor, dashed: lineColor === PLAYED_COLOR }] : [];
      board.set({ fen: c.fen(), orientation: m.myColor, lastMove: last, interactive: false, arrows });
      stage.querySelector('#vpos')!.textContent = `step ${i} of ${line.length}`;
      (stage.querySelector('#vprev') as HTMLButtonElement).disabled = i === 0;
      (stage.querySelector('#vnext') as HTMLButtonElement).disabled = i >= line.length;
    };
    stage.querySelector('#vbest')!.addEventListener('click', () => { line = m.bestLine; lineColor = BEST_COLOR; i = 0; show(); });
    stage.querySelector('#vplayed')!.addEventListener('click', () => { line = [m.playedUci, ...m.refutation]; lineColor = PLAYED_COLOR; i = 0; show(); });
    stage.querySelector('#vprev')!.addEventListener('click', () => { i = Math.max(0, i - 1); show(); });
    stage.querySelector('#vnext')!.addEventListener('click', () => { i = Math.min(line.length, i + 1); show(); });
    stage.querySelectorAll<HTMLButtonElement>('button[data-lesson]').forEach((b) => b.addEventListener('click', () => nav.lesson(b.dataset.lesson!)));
    stage.querySelector('#topuzzle')!.addEventListener('click', puzzleStage);
  };

  // ---- stage 4: a puzzle that matches the evidenced mechanism, or an honest skip ----
  const puzzleStage = async () => {
    stage.innerHTML = '<p>Looking for a matching puzzle…</p>';
    const file = await getPuzzleFile();
    let match: PuzzleMatch = matchPuzzle(file, m.tag, m.tagTheme);
    if (!match.pick && m.isFixture && m.tagTheme === 'fork') {
      match = { pick: { puzzle: FIXTURE_PUZZLE, matched: true, label: 'TEST FIXTURE puzzle (hand-made, not from Lichess)' } };
    }
    if (!match.pick) {
      board.set({ fen: m.fen, orientation: m.myColor, interactive: false });
      stage.innerHTML = `<h3>Matched puzzle</h3><p>${esc(match.skipReason ?? 'No matching puzzle.')}</p>
        ${!file && m.tagTheme ? '<p class="note">To build the puzzle file once, stop the app and run <code>npm run make-puzzles</code> (see the README).</p>' : ''}
        <p><button class="btn primary big" id="finish">Finish the round</button></p>`;
      stage.querySelector('#finish')!.addEventListener('click', () => completeStage(null));
      return;
    }
    const pick = pick_(match);
    const p = pick.puzzle;
    const ps = new PuzzleSession(p);
    let wrong = 0;
    let shown = false;
    say('start');
    stage.innerHTML = `<h3>Matched puzzle</h3><p><b>${esc(pick.label)}</b></p>
      ${p.isFixture ? '<div class="fixture">TEST FIXTURE puzzle: hand-made, not from the Lichess database.</div>' : ''}
      <p class="note">Rating ${p.rating}. Themes: ${esc(p.themes.join(', '))}.${p.isFixture ? '' : ` Puzzle <a href="https://lichess.org/training/${esc(p.id)}" target="_blank" rel="noopener">${esc(p.id)}</a> from the Lichess puzzle database (CC0).`}</p>
      <p class="task" id="pturn">${ps.learner === 'w' ? 'White' : 'Black'} to move. The opponent's setup move is highlighted. Find the best continuation.</p>
      <p id="pmsg" class="feedback" aria-live="polite"></p>
      <p><button class="btn" id="solution">Show solution</button> <button class="btn primary big" id="finish" hidden>Finish the round</button></p>`;
    actions.innerHTML = '';
    const pm = stage.querySelector<HTMLElement>('#pmsg')!;
    const prefresh = () => board.set({ fen: ps.chess.fen(), orientation: ps.learner, lastMove: ps.lastMove, interactive: !ps.solved && !shown });
    prefresh();
    const finishPuzzle = () => {
      const outcome: Exclude<Outcome, 'pending'> = shown ? 'shown' : wrong === 0 ? 'independent' : 'corrected';
      logAttempt(kv, { ts: Date.now(), kind: 'puzzle', refId: p.id, outcome, detail: m.tagTheme });
      // a theme miss queues another puzzle of the same theme next session; an independent success schedules a later review
      if (m.tagTheme) recordOutcome(kv, { id: `puzzle:${m.tagTheme}`, kind: 'puzzleTheme', ref: m.tagTheme, label: `Puzzle practice: ${m.tagTheme}` }, outcome, Date.now(), state.sessionNo);
      stage.querySelector<HTMLButtonElement>('#finish')!.hidden = false;
      stage.querySelector<HTMLButtonElement>('#solution')!.hidden = true;
      stage.querySelector('#finish')!.addEventListener('click', () => completeStage(outcome));
    };
    board.onIllegal = () => (pm.innerHTML = '<span class="bad">That move is not legal.</span>');
    board.onMove = (from, to, promotion) => {
      const r = ps.try(from + to + (promotion ?? ''));
      if (r.result === 'illegal') pm.innerHTML = '<span class="bad">That move is not legal.</span>';
      else if (r.result === 'wrong') {
        wrong++;
        say('retry');
        pm.innerHTML = '<span class="bad">Not the move this puzzle wants. Try again.</span>';
      } else if (r.result === 'solved') {
        say('correct', 'proud');
        pm.innerHTML = '<span class="good">Solved!</span>';
        stage.querySelector('#pturn')!.textContent = 'Puzzle complete.';
        finishPuzzle();
      } else pm.innerHTML = '<span class="good">Correct.</span> Keep going.';
      prefresh();
    };
    stage.querySelector('#solution')!.addEventListener('click', () => {
      shown = true;
      pm.textContent = 'Solution: ' + ps.solutionSan().join(' ');
      say('shown');
      prefresh();
      finishPuzzle();
    });
  };
  const pick_ = (mt: PuzzleMatch) => mt.pick!;

  // ---- stage 5: round complete ---------------------------------------------
  const completeStage = (puzzleOutcome: Exclude<Outcome, 'pending'> | null) => {
    const r = completeRound(kv, `moment:${m.id}`, new Date());
    noteRoundCompleted(kv, m.phase);
    const nxt = nextInPhase(m);
    const outcome = session.outcome === 'independent' ? 'You found the move on the first try.' : session.outcome === 'corrected' ? 'You found it after a retry.' : 'You looked at the answer first. Try it again in a later session.';
    renderComplete({
      title: 'Round complete',
      lines: [outcome, puzzleOutcome ? `Puzzle: ${puzzleOutcome === 'independent' ? 'solved first time' : puzzleOutcome === 'corrected' ? 'solved after wrong tries' : 'solution shown'}.` : 'No puzzle was offered for this one.', 'Practised is not mastered: this position may come back for review.'],
      result: r,
      next: [
        ...(nxt ? [{ label: `Next round: move ${nxt.moveNumber} vs ${nxt.opponent} (${PHASE_LABEL[nxt.phase]})`, run: () => nav.round(nxt.id) }] : []),
        { label: 'Back to my mistakes', run: nav.mistakes },
        { label: 'Practice home', run: nav.practice },
      ],
    });
  };

  startLeadIn();
}

import { Chess } from 'chess.js';
import { Board, type Arrow } from '../board';
import { CONTENT, contentFor, engineCheckLines, quizPosition, stepPositions, creditedMovesVerified, type LessonContent, type QuizItem } from '../curriculum/content';
import { LESSONS, REPORT, SEEDS, seedViews, type Lesson } from '../curriculum';
import { responseStats, linkLesson, matchGame } from '../families';
import { RootGrader } from '../grading';
import { getLessonProgress, lessonState, noteQuiz, noteStep, completeLesson, quizSummary, type QuizOutcome } from '../lessonProgress';
import { logAttempt } from '../attempts';
import { quizPosition as qpos } from '../curriculum/content';
import { gradeQuizMove, type QuizResult } from '../quiz';
import { noteRoundCompleted } from '../rotation';
import { completeRound } from '../rounds';
import { recordOutcome } from '../reviews';
import { teacherHtml } from './teacher';
import { renderComplete } from './complete';
import { ALT_COLOR, BEST_COLOR, app, esc, fmtWindow, getEngine, kv, nav, prefersReducedMotion, render, state } from './ctx';
import type { Color } from '../types';
import type { LessonState } from '../progress';

const STATE_TEXT: Record<LessonState, { icon: string; text: string }> = {
  ready: { icon: '●', text: 'Ready' },
  inProgress: { icon: '◐', text: 'In progress' },
  practised: { icon: '✓', text: 'Practised' },
  revisit: { icon: '↻', text: 'Revisit' },
};

const lessonById = (id: string) => LESSONS.find((l) => l.id === id)!;

/** Built lessons are playable; the rest are shown honestly as pending / not grounded. */
const isBuilt = (l: Lesson) => l.contentStatus === 'built' && !!contentFor(l.id);

function lessonStatus(l: Lesson) {
  const c = contentFor(l.id);
  const p = getLessonProgress(kv, l.id);
  return { state: lessonState(p, c?.quiz.length ?? 0), progress: p };
}

/** Verification status of a lesson's boards: every seed and every credited quiz move must be engine-verified. */
function verification(l: Lesson): { label: string; ok: boolean } {
  const views = seedViews().filter((v) => l.seedIds.includes(v.seed.id));
  if (!views.length) return { label: 'no boards yet', ok: false };
  const bad = views.filter((v) => v.status !== 'verified');
  const c = contentFor(l.id);
  const quizBad = c ? c.quiz.filter((q) => !creditedMovesVerified(q).ok) : [];
  if (bad.length || quizBad.length) return { label: 'some boards pending verification', ok: false };
  return { label: `boards engine-verified (${REPORT.engine.name.replace(' WASM', '')}, depth ${REPORT.depth})`, ok: true };
}

/** Course order: foundation first, then responses ranked by how often YOUR opponents played them. */
function orderedLessons(color: Color): { lesson: Lesson; count: number; of: number; windowStart: number; windowEnd: number; hasGames: boolean }[] {
  const { stats } = responseStats(state.games);
  const by = new Map(stats.map((s) => [s.lessonId, s]));
  const rows = LESSONS.filter((l) => l.color === color).map((lesson) => {
    const s = by.get(lesson.id);
    return { lesson, count: s?.count ?? 0, of: s?.of ?? 0, windowStart: s?.windowStart ?? 0, windowEnd: s?.windowEnd ?? 0, hasGames: state.games.length > 0 };
  });
  const foundation = rows.filter((r) => r.lesson.kind === 'foundation' && r.lesson.id !== 'black-standard-pirc');
  const responses = rows.filter((r) => r.lesson.kind === 'response').sort((a, b) => b.count - a.count || a.lesson.order - b.lesson.order);
  const rest = rows.filter((r) => r.lesson.id === 'black-standard-pirc');
  return [...foundation, ...responses, ...rest];
}

/** Soft guide: the first built, not-yet-practised lesson. Never a lock. */
function recommended(color: Color): Lesson | undefined {
  return orderedLessons(color)
    .map((r) => r.lesson)
    .find((l) => isBuilt(l) && !['practised'].includes(lessonStatus(l).state));
}

// ------------------------------------------------------------------ learn ----
export function viewLearn() {
  const total = state.games.length;
  const course = (color: Color, title: string, sub: string) => {
    const rows = orderedLessons(color);
    const rec = recommended(color);
    const nodes = rows
      .map(({ lesson: l, count, of, windowStart, windowEnd, hasGames }, i) => {
        const built = isBuilt(l);
        const st = lessonStatus(l);
        const s = STATE_TEXT[st.state];
        const ver = verification(l);
        const freq =
          l.kind === 'response' || l.id.endsWith('foundation')
            ? !hasGames
              ? '<span class="chip">Import games to see how often this comes up</span>'
              : of > 0 || count > 0
                ? `<span class="chip">Seen in ${count} of ${of} of your ${color === 'w' ? 'London' : 'shell'} games (${esc(fmtWindow(windowStart, windowEnd))})</span>`
                : '<span class="chip">Not seen in your imported games yet</span>'
            : '';
        const prereq = l.prerequisites
          .map((p) => {
            const done = ['practised', 'revisit'].includes(lessonStatus(lessonById(p)).state);
            return `${esc(lessonById(p).title)}${done ? ' ✓' : ''}`;
          })
          .join(', ');
        const body = built
          ? `<button type="button" class="node-btn" data-lesson="${l.id}" aria-label="Lesson ${i + 1}: ${esc(l.title)}, ${s.text}">
              <span class="node-dot" aria-hidden="true">${st.state === 'ready' || st.state === 'inProgress' ? i + 1 : s.icon}</span>
              <span class="node-text"><b>${esc(l.title)}</b><br><span class="note">${esc(l.goal)}</span></span>
              <span class="pill ${st.state}"><span aria-hidden="true">${s.icon}</span> ${s.text}</span>
            </button>`
          : `<div class="node-btn pending" aria-label="${esc(l.title)}, not available yet">
              <span class="node-dot" aria-hidden="true">…</span>
              <span class="node-text"><b>${esc(l.title)}</b><br><span class="note">${esc(l.notGrounded ?? l.honesty ?? 'Pending: no verified material yet.')}</span></span>
              <span class="pill pendingpill">${l.contentStatus === 'not-grounded' ? 'Not grounded' : 'Pending'}</span>
            </div>`;
        return `<li class="node ${built ? st.state : 'pending'}${rec?.id === l.id ? ' recommended' : ''}">${body}
          <div class="meta">${rec?.id === l.id ? '<span class="chip start">Start here</span>' : ''}${freq}
          ${built ? `<span class="chip ${ver.ok ? 'ok' : 'warn'}">${esc(ver.label)}</span>` : ''}
          ${l.honesty && built ? `<span class="chip honest">${esc(l.honesty)}</span>` : ''}
          ${prereq ? `<span class="chip">Builds on: ${prereq}</span>` : ''}</div></li>`;
      })
      .join('');
    const first = rec;
    const started = rows.some((r) => lessonStatus(r.lesson).state !== 'ready');
    return `<section class="course ${color === 'w' ? 'white' : 'black'}" aria-labelledby="c-${color}">
      <header><h2 id="c-${color}">${title}</h2><p class="count">${sub}</p></header>
      <ol class="path">${nodes}</ol>
      <button type="button" class="btn primary big resume" data-resume="${first?.id ?? ''}" ${first ? '' : 'disabled'}>${first ? (started ? 'Continue' : 'Start') + ': ' + esc(first.title) : 'All built lessons practised'}</button>
    </section>`;
  };
  const sample = total
    ? `Ranked by the ${total} game${total === 1 ? '' : 's'} you imported (${esc(fmtWindow(responseStats(state.games).sample.windowStart, responseStats(state.games).sample.windowEnd))}). A small sample, recomputed each time.`
    : 'No games imported yet, so responses are shown in course order. Import games under "Understand my mistakes" to rank them by what your opponents actually play.';
  render(
    `<section class="guide">
      ${teacherHtml('start', 'stern')}
      <div><h2>Learn openings first</h2>
      <p>One idea at a time, with a board for every position. Then your real mistakes link back here. Both colours and every section stay open: this order is a guide, not a lock.</p>
      <p class="note">${esc(sample)}</p>
      <p class="note">Content marked <b>pending</b> or <b>not grounded</b> is not built because no verified material exists for it yet. Nothing is invented.</p></div>
    </section>
    <div class="courses">${course('w', 'White: London', 'London foundation, then responses')}${course('b', 'Black: Pirc shell', 'Historical shell (…d6, …c6, …Qc7), not the standard Pirc')}</div>`,
    'learn',
  );
  app.querySelectorAll<HTMLButtonElement>('button[data-lesson]').forEach((b) => b.addEventListener('click', () => nav.lesson(b.dataset.lesson!)));
  app.querySelectorAll<HTMLButtonElement>('button[data-resume]').forEach((b) => b.addEventListener('click', () => b.dataset.resume && nav.lesson(b.dataset.resume)));
}

// ----------------------------------------------------------------- lesson ----
const arrowFor = (kind: 'idea' | 'alt', from: string, to: string): Arrow =>
  kind === 'idea' ? { from, to, color: BEST_COLOR } : { from, to, color: ALT_COLOR, dashed: true };

function engineBox(seedId: string): string {
  const lines = engineCheckLines(seedId);
  if (!lines.length) return '';
  const seed = SEEDS.find((s) => s.id === seedId)!;
  const claims = REPORT.seeds[seedId]?.status;
  return `<div class="engine-box"><b>Engine check</b> <span class="note">(${esc(REPORT.engine.name.replace(' WASM', ''))}, depth ${REPORT.depth}, your point of view as ${seed.color === 'w' ? 'White' : 'Black'}; positive is good for you)</span><br>${lines.map(esc).join(' · ')}
    <span class="chip ${claims === 'verified' ? 'ok' : 'warn'}">${claims === 'verified' ? 'claims verified' : 'claims not verified'}</span></div>`;
}

export function viewLesson(lessonId: string, opts: { quizOnly?: string; fromPractice?: boolean } = {}) {
  const lesson = lessonById(lessonId);
  const content = contentFor(lessonId);
  if (!lesson || !content) return viewLearn();
  if (opts.quizOnly) return runQuiz(lesson, content, content.quiz.findIndex((q) => q.id === opts.quizOnly), opts);
  viewOverview(lesson, content);
}

function viewOverview(lesson: Lesson, content: LessonContent) {
  const ver = verification(lesson);
  const prereqs = lesson.prerequisites.map((p) => ({ l: lessonById(p), done: ['practised', 'revisit'].includes(lessonStatus(lessonById(p)).state) }));
  const links = linkLesson(lesson.id, state.games, state.moments);
  render(
    `<div class="lesson"><div class="lesson-board"><div class="board-frame"><div id="board"></div></div></div>
    <section class="lesson-side">
      <p class="crumb">${lesson.color === 'w' ? 'White' : 'Black'} · ${lesson.kind === 'foundation' ? 'Foundation' : 'Response'}</p>
      <h2>${esc(lesson.title)}</h2>
      ${lesson.honesty ? `<p class="honest"><b>Honest label:</b> ${esc(lesson.honesty)}</p>` : ''}
      <p><b>Goal.</b> ${esc(content.overview.goal)}</p>
      <p><b>When it applies.</b> ${esc(content.overview.applies)}</p>
      <ul class="facts">${content.overview.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      <p class="note">${prereqs.length ? `Builds on: ${prereqs.map((p) => `${esc(p.l.title)}${p.done ? ' ✓' : ' (recommended first, not required)'}`).join(', ')}. ` : ''}
      Source: ${esc(lesson.source.map((s) => s.note).join('; '))}. ${esc(ver.label)}.</p>
      <p class="note">${links.games.length ? `Your imported games reach this position or setup in ${links.games.length} game${links.games.length === 1 ? '' : 's'}.` : state.games.length ? `None of your ${state.games.length} imported games reach this yet.` : 'No games imported yet.'}</p>
      <p><button class="btn primary big" id="begin">Begin: ${content.steps.length} steps and a short quiz</button> <button class="btn" id="back">Back to the course</button></p>
    </section></div>`,
    'learn',
  );
  const board = new Board(app.querySelector('#board')!);
  board.set({ fen: new Chess().fen(), orientation: lesson.color, interactive: false });
  app.querySelector('#begin')!.addEventListener('click', () => runSteps(lesson, content, 0));
  app.querySelector('#back')!.addEventListener('click', nav.learn);
}

function runSteps(lesson: Lesson, content: LessonContent, index: number) {
  const step = content.steps[index];
  noteStep(kv, lesson.id, index);
  const pos = stepPositions(step);
  let at = pos.fens.length - 1; // show the position the step is about; arrows step back through the moves
  const last = index === content.steps.length - 1;
  render(
    `<div class="lesson"><div class="lesson-board"><div class="board-frame"><div id="board"></div></div>
      <div class="board-actions">
        <button class="btn big" id="prev" aria-label="Back one move">◀ Back</button>
        <button class="btn big" id="next" aria-label="Forward one move">Forward ▶</button>
        <button class="btn big" id="replay">↺ Replay</button>
      </div><p id="movetext" class="note" aria-live="polite"></p></div>
    <section class="lesson-side">
      <p class="crumb">${esc(lesson.title)} · step ${index + 1} of ${content.steps.length}</p>
      <h2>${esc(step.title)}</h2>
      ${step.text.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${step.engineSeed ? engineBox(step.engineSeed) : ''}
      ${(step.links ?? []).map((l) => `<p><button class="btn" data-open="${l.lessonId}">${esc(l.label)}</button></p>`).join('')}
      <p class="nav"><button class="btn" id="stepback" ${index === 0 ? 'disabled' : ''}>Previous step</button>
      <button class="btn primary big" id="stepnext">${last ? 'Start the quiz' : 'Next step'}</button></p>
      <p><button class="btn" id="exit">Back to the course</button></p>
    </section></div>`,
    'learn',
  );
  const boardEl = app.querySelector<HTMLElement>('#board')!;
  const board = new Board(boardEl);
  const show = () => {
    const arrows = at === pos.fens.length - 1 && step.arrows ? step.arrows.map((a) => arrowFor(a.kind, a.from, a.to)) : [];
    board.set({ fen: pos.fens[at], orientation: lesson.color, lastMove: pos.lastMoves[at], interactive: false, arrows });
    const mt = app.querySelector('#movetext')!;
    mt.textContent = pos.sans.length ? (at > 0 ? `Moves in this step: ${pos.sans.slice(0, at).join(' ')}` : 'Start of this step. Press Forward to play the moves.') : '';
    (app.querySelector('#prev') as HTMLButtonElement).disabled = at <= 0;
    (app.querySelector('#next') as HTMLButtonElement).disabled = at >= pos.fens.length - 1;
  };
  show();
  app.querySelector('#prev')!.addEventListener('click', () => { at = Math.max(0, at - 1); show(); });
  app.querySelector('#next')!.addEventListener('click', () => { at = Math.min(pos.fens.length - 1, at + 1); show(); });
  app.querySelector('#replay')!.addEventListener('click', () => {
    at = 0;
    show();
    if (prefersReducedMotion() || pos.fens.length < 2) return; // with reduced motion the learner steps manually
    const t = setInterval(() => {
      if (!boardEl.isConnected || at >= pos.fens.length - 1) return clearInterval(t);
      at++;
      show();
    }, 800);
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-open]').forEach((b) => b.addEventListener('click', () => nav.lesson(b.dataset.open!)));
  app.querySelector('#stepback')!.addEventListener('click', () => (index === 0 ? viewOverview(lesson, content) : runSteps(lesson, content, index - 1)));
  app.querySelector('#stepnext')!.addEventListener('click', () => (last ? runQuiz(lesson, content, 0, {}) : runSteps(lesson, content, index + 1)));
  app.querySelector('#exit')!.addEventListener('click', nav.learn);
}

// ------------------------------------------------------------------- quiz ----
interface QuizRun {
  outcomes: Record<string, QuizOutcome>;
}
const runs = new Map<string, QuizRun>();

function runQuiz(lesson: Lesson, content: LessonContent, qIndex: number, opts: { quizOnly?: string; fromPractice?: boolean }) {
  const item: QuizItem | undefined = content.quiz[qIndex];
  if (!item) return finishLesson(lesson, content, opts);
  const pos = quizPosition(item);
  const run = runs.get(lesson.id) ?? { outcomes: {} };
  if (qIndex === 0 && !opts.quizOnly) run.outcomes = {};
  runs.set(lesson.id, run);
  let failures = 0;
  let shown = false;
  let done = false;
  let busy = false;
  const grader = new RootGrader(getEngine(), 12);
  const total = opts.quizOnly ? 1 : content.quiz.length;
  render(
    `<div class="lesson"><div class="lesson-board"><div class="board-frame"><div id="board"></div></div>
      <div class="board-actions"><button class="btn big" id="reset">↺ Reset board</button><button class="btn big" id="hint">Hint</button></div></div>
    <section class="lesson-side">
      <p class="crumb">${esc(lesson.title)} · quiz ${opts.quizOnly ? '' : `question ${qIndex + 1} of ${content.quiz.length}`}</p>
      <div id="teacher">${teacherHtml('start', 'stern')}</div>
      <p class="task">${esc(item.prompt)}</p>
      <p class="note">You play ${pos.color === 'w' ? 'White' : 'Black'}. Click or drag a piece. The answer stays hidden until you have tried.</p>
      <p class="hint" id="hinttext" hidden></p>
      <p id="msg" class="feedback" aria-live="polite"></p>
      <p><button class="btn" id="showme">Show me the answer</button></p>
      <div id="reveal"></div>
      <p id="navrow"></p>
    </section></div>`,
    'learn',
  );
  const board = new Board(app.querySelector('#board')!);
  const msg = app.querySelector<HTMLElement>('#msg')!;
  const setTeacher = (e: Parameters<typeof teacherHtml>[0], mood: 'stern' | 'proud' = 'stern', line?: string) => {
    app.querySelector('#teacher')!.innerHTML = teacherHtml(e, mood, line);
  };
  const base = () => board.set({ fen: pos.fen, orientation: pos.color, interactive: !done && !busy });
  base();
  app.querySelector('#hint')!.addEventListener('click', () => {
    const h = app.querySelector<HTMLElement>('#hinttext')!;
    h.textContent = item.hint;
    h.hidden = false;
  });
  app.querySelector('#reset')!.addEventListener('click', () => {
    if (!done) {
      msg.textContent = '';
      base();
    }
  });
  const reveal = (arrowsFor: string[]) => {
    const c = new Chess(pos.fen);
    const arrows: Arrow[] = [];
    for (const a of item.accept.filter((x) => arrowsFor.includes(x.move))) {
      const m = c.move(a.move);
      c.undo();
      arrows.push({ from: m.from, to: m.to, color: BEST_COLOR });
    }
    board.set({ fen: pos.fen, orientation: pos.color, interactive: false, arrows });
    const answers = item.accept
      .map((a) => `<li><b>${esc(a.move)}</b>${a.kind === 'alternative' ? ' <span class="chip">also sound</span>' : ''}: ${esc(a.why)}</li>`)
      .join('');
    app.querySelector('#reveal')!.innerHTML = `<h3>The answer and why</h3><ul class="facts">${answers}</ul>${item.explanation.map((t) => `<p>${esc(t)}</p>`).join('')}
      <p class="note">Green arrow${arrowsFor.length > 1 ? 's' : ''}: the credited move${arrowsFor.length > 1 ? 's' : ''}. Credited moves are checked by the engine (${esc(REPORT.engine.name.replace(' WASM', ''))}, depth ${REPORT.depth}).</p>`;
  };
  const finishItem = (outcome: QuizOutcome) => {
    done = true;
    run.outcomes[item.id] = outcome;
    noteQuiz(kv, lesson.id, item.id, outcome, failures + 1);
    logAttempt(kv, { ts: Date.now(), kind: 'quiz', refId: `${lesson.id}:${item.id}`, outcome, detail: lesson.id });
    recordOutcome(kv, { id: `quiz:${lesson.id}:${item.id}`, kind: 'lessonQuiz', ref: `${lesson.id}:${item.id}`, label: `${lesson.title}: ${item.prompt}` }, outcome, Date.now(), state.sessionNo);
    app.querySelector<HTMLButtonElement>('#showme')!.hidden = true;
    const lastQ = opts.quizOnly || qIndex === content.quiz.length - 1;
    app.querySelector('#navrow')!.innerHTML = `<button class="btn primary big" id="nextq">${lastQ ? 'Finish' : 'Next question'}</button>`;
    app.querySelector('#nextq')!.addEventListener('click', () => (opts.quizOnly ? finishLesson(lesson, content, opts) : runQuiz(lesson, content, qIndex + 1, opts)));
  };
  app.querySelector('#showme')!.addEventListener('click', () => {
    if (done) return;
    shown = true;
    msg.innerHTML = '<span class="bad">Answer shown. It counts as shown, not as your own find.</span>';
    setTeacher('shown');
    reveal(item.accept.filter((a) => a.kind === 'answer').map((a) => a.move).concat(item.accept.length ? [] : []));
    finishItem('shown');
  });
  board.onIllegal = () => (msg.innerHTML = '<span class="bad">That move is not legal. Try another.</span>');
  board.onMove = async (from, to, promotion) => {
    if (done || busy) return;
    busy = true;
    board.set({ interactive: false });
    msg.textContent = 'Checking your move…';
    let res: QuizResult;
    try {
      res = await gradeQuizMove(item, from + to + (promotion ?? ''), grader);
    } catch (e) {
      msg.innerHTML = `<span class="bad">The engine had a problem: ${esc((e as Error).message)}</span>`;
      state.engine = null;
      busy = false;
      base();
      return;
    }
    busy = false;
    if (res.credited) {
      msg.innerHTML = `<span class="good">${esc(res.san)}: ${res.verdict === 'answer' ? 'Correct' : 'Also sound, and credited'}.</span>`;
      setTeacher('correct', 'proud');
      reveal(item.accept.map((a) => a.move));
      finishItem(shown ? 'shown' : failures === 0 ? 'independent' : 'corrected');
      return;
    }
    failures++;
    msg.innerHTML = `<span class="${res.verdict === 'sound-other' ? 'note' : 'bad'}">${esc(res.san)}: ${esc(res.message)}</span> <span class="note">Try again, or show the answer.</span>`;
    setTeacher('retry');
    base();
  };
  void total;
}

function finishLesson(lesson: Lesson, content: LessonContent, opts: { quizOnly?: string; fromPractice?: boolean }) {
  if (opts.quizOnly) {
    const r = completeRound(kv, `quizq:${lesson.id}:${opts.quizOnly}`, new Date());
    return renderComplete({
      title: 'Question done',
      lines: ['One review question finished.'],
      result: r,
      next: [{ label: 'Back to Practice', run: nav.practice }],
    });
  }
  completeLesson(kv, lesson.id);
  const prog = getLessonProgress(kv, lesson.id);
  const sum = quizSummary(prog, content.quiz.length);
  const round = completeRound(kv, `lesson:${lesson.id}`, new Date());
  noteRoundCompleted(kv, 'opening');
  const links = linkLesson(lesson.id, state.games, state.moments);
  const st = lessonState(prog, content.quiz.length);
  const gamesHtml = links.games.length
    ? `<ul class="facts">${links.games
        .map((g) => `<li>vs ${esc(g.game.opponent)} (${esc(g.game.myColor === 'w' ? 'White' : 'Black')}, ${esc(g.game.timeClass)}): reached at move ${Math.floor(g.ply / 2) + 1}${g.exact ? ' (this exact board)' : ''}${g.game.isFixture ? ' <b>TEST FIXTURE</b>' : g.game.url ? ` · <a href="${esc(g.game.url)}" target="_blank" rel="noopener">game link</a>` : ''}</li>`)
        .join('')}</ul>${
        links.moments.length
          ? `<p>Mistakes from those games near this position:</p>${links.moments.map((m) => `<p><button class="btn" data-round="${esc(m.id)}">Practise move ${m.moveNumber} vs ${esc(m.opponent)} (${esc(m.tag ?? 'no pattern tag')})</button></p>`).join('')}`
          : state.moments.length
            ? '<p class="note">No analysed mistake from those games is close to this position.</p>'
            : '<p class="note">Run "Find my mistakes" under Understand my mistakes to link real errors from those games.</p>'
      }`
    : state.games.length
      ? `<p class="note">No matching game among your ${state.games.length} imported game${state.games.length === 1 ? '' : 's'} yet. Nothing is invented.</p>`
      : '<p class="note">No games imported yet. Import games to see where this lesson shows up.</p>';
  renderComplete({
    title: `Round complete: ${lesson.title}`,
    lines: [
      `Quiz: ${sum.independent} of ${sum.total} on the first try${sum.corrected ? `, ${sum.corrected} after a retry` : ''}${sum.shown ? `, ${sum.shown} shown` : ''}.`,
      st === 'practised' ? 'Practised. That is not the same as mastered; the questions will come back.' : 'Marked to revisit: more than half were not found independently.',
    ],
    result: round,
    extraHtml: `<h3>Your games</h3>${gamesHtml}`,
    next: [
      ...(recommended(lesson.color) && recommended(lesson.color)!.id !== lesson.id ? [{ label: `Next lesson: ${recommended(lesson.color)!.title}`, run: () => nav.lesson(recommended(lesson.color)!.id) }] : []),
      { label: 'Back to the course', run: nav.learn },
    ],
    wire: (root) =>
      root.querySelectorAll<HTMLButtonElement>('button[data-round]').forEach((b) => b.addEventListener('click', () => nav.round(b.dataset.round!))),
  });
}

export { matchGame, CONTENT, qpos };

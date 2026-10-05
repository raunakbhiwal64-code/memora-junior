import { Board } from '../board';
import { logAttempt } from '../attempts';
import { LESSONS } from '../curriculum';
import { contentFor } from '../curriculum/content';
import { FIXTURE_PUZZLE } from '../fixtures';
import { getLessonProgress, lessonState } from '../lessonProgress';
import { PHASES, PHASE_LABEL, type Phase } from '../phase';
import type { Outcome } from '../practice';
import { buildPaths, localStore } from '../progress';
import { PuzzleSession, loadPuzzleFile, matchPuzzle, type PuzzleFile } from '../puzzle';
import { dueItems, recordOutcome, reviewConfig, setReviewIntervals, type ReviewItem } from '../reviews';
import { advanceRotation, noteRoundCompleted, suggestedPhase } from '../rotation';
import { completeRound, summary } from '../rounds';
import { renderComplete } from './complete';
import { PUZZLE_URL, esc, getEngine, kv, nav, render, state } from './ctx';
import { teacherHtml, type TeacherEvent } from './teacher';
import type { Color } from '../types';

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
void getEngine;

interface Suggestion {
  label: string;
  run: () => void;
}

/** A recommended built lesson that is not yet practised (soft guide, never a lock). */
function openingLesson(): Suggestion | undefined {
  for (const color of ['w', 'b'] as Color[]) {
    const l = LESSONS.filter((x) => x.color === color && x.contentStatus === 'built')
      .sort((a, b) => a.order - b.order)
      .find((x) => !['practised'].includes(lessonState(getLessonProgress(kv, x.id), contentFor(x.id)?.quiz.length ?? 0)));
    if (l) return { label: `Opening lesson round: ${l.title}`, run: () => nav.lesson(l.id) };
  }
  return undefined;
}

function nextMoment(phase: Phase | 'any'): Suggestion | undefined {
  const paths = buildPaths(state.moments, localStore).filter((p) => phase === 'any' || p.phase === phase);
  for (const p of paths) {
    const l = p.lessons.find((x) => x.state === 'ready' || x.state === 'inProgress') ?? p.lessons.find((x) => x.state === 'revisit');
    if (l) return { label: `${PHASE_LABEL[l.moment.phase]} round: move ${l.moment.moveNumber} vs ${l.moment.opponent}`, run: () => nav.round(l.moment.id) };
  }
  return undefined;
}

function suggestFor(phase: Phase): { s?: Suggestion; why?: string } {
  if (phase === 'opening') {
    const s = openingLesson() ?? nextMoment('opening');
    return s ? { s } : { why: 'Every built opening lesson is practised and there is no opening mistake waiting. Revisit a lesson from Learn, or import more games.' };
  }
  const s = nextMoment(phase);
  return s ? { s } : { why: `No ${PHASE_LABEL[phase].toLowerCase()} positions are waiting${state.moments.length ? ' (none eligible, or all practised)' : ': find your mistakes first'}. Nothing is invented to fill the gap.` };
}

const kindLabel: Record<ReviewItem['kind'], string> = { moment: 'Your game position', lessonQuiz: 'Lesson question', puzzleTheme: 'Puzzle theme' };

export function viewPractice() {
  const phase = suggestedPhase(kv);
  const sug = suggestFor(phase);
  const due = dueItems(kv, Date.now(), state.sessionNo);
  const sum = summary(kv);
  const cfg = reviewConfig(kv);
  const dueRows = due
    .map((r) => {
      const why = r.dueSession !== undefined ? 'missed or shown last time' : `scheduled (${r.independentSuccesses} independent success${r.independentSuccesses === 1 ? '' : 'es'} so far)`;
      return `<li><b>${esc(kindLabel[r.kind])}</b>: ${esc(r.label)} <span class="note">· ${esc(why)}</span> <button class="btn" data-due="${esc(r.id)}">Practise</button></li>`;
    })
    .join('');
  const phaseBtns = PHASES.map((p) => `<button class="btn" data-phase="${p.id}">${PHASE_LABEL[p.id]}</button>`).join(' ');
  render(
    `<section class="guide">${teacherHtml(due.length ? 'review' : 'start', 'stern')}<div>
      <h2>Practice</h2>
      <p>Guided rotation: openings, then middle game, then end game. It moves on after you finish a round in the suggested phase, not when you open the app. Choosing another phase costs nothing.</p>
      <p class="note">${sum.totalXp} XP · ${sum.practiceDays} practice day${sum.practiceDays === 1 ? '' : 's'} · ${sum.streak} in a row${sum.practisedToday ? ' · today counted' : ''}. Practised is not mastered.</p></div></section>
    <section>
      <h2>Today: ${PHASE_LABEL[phase]}</h2>
      ${sug.s ? `<p><button class="btn primary big" id="today">${esc(sug.s.label)}</button></p>` : `<p>${esc(sug.why ?? '')}</p>`}
      <p>Or choose: ${phaseBtns} <button class="btn" id="mixed">Mixed</button> <button class="btn" id="skip">Skip to the next phase</button></p>
      <p id="choicemsg" class="note" aria-live="polite"></p>
    </section>
    <section>
      <h2>Due for review</h2>
      ${due.length ? `<ul class="facts">${dueRows}</ul>` : '<p class="note">Nothing is due. After a miss, a position comes back next session; after an independent success it returns after a few days.</p>'}
      <p class="note">Schedule (days after each independent success, editable): <input type="text" id="intervals" value="${esc(cfg.intervalsDays.join(','))}" size="8" aria-label="Review intervals in days"> <button class="btn" id="saveint">Save</button> <span id="intmsg" class="note"></span></p>
    </section>`,
    'practice',
  );
  const msg = (t: string) => (app_('#choicemsg').textContent = t);
  app_('#today')?.addEventListener('click', () => sug.s?.run());
  document.querySelectorAll<HTMLButtonElement>('button[data-phase]').forEach((b) =>
    b.addEventListener('click', () => {
      const r = suggestFor(b.dataset.phase as Phase);
      if (r.s) r.s.run();
      else msg(r.why ?? 'Nothing to practise there yet.');
    }),
  );
  app_('#mixed').addEventListener('click', () => {
    const s = nextMoment('any') ?? openingLesson();
    if (s) s.run();
    else msg('Nothing to practise yet: import games and find your mistakes, or open a lesson from Learn.');
  });
  app_('#skip').addEventListener('click', () => {
    advanceRotation(kv);
    viewPractice();
  });
  app_('#saveint').addEventListener('click', () => {
    const r = setReviewIntervals(kv, (app_('#intervals') as HTMLInputElement).value);
    app_('#intmsg').textContent = r.ok ? 'Saved.' : r.error ?? '';
  });
  document.querySelectorAll<HTMLButtonElement>('button[data-due]').forEach((b) =>
    b.addEventListener('click', () => {
      const item = due.find((d) => d.id === b.dataset.due)!;
      if (item.kind === 'moment') {
        if (state.moments.some((m) => m.id === item.ref)) nav.round(item.ref);
        else msg('That position needs your analysis. Open Understand my mistakes to load it.');
      } else if (item.kind === 'lessonQuiz') {
        const [lessonId, quizId] = item.ref.split(':');
        nav.lesson(lessonId, { quizOnly: quizId, fromPractice: true });
      } else viewPuzzleReview(item.ref);
    }),
  );
}

const app_ = (sel: string) => document.querySelector<HTMLElement>(sel)!;

/** A puzzle-only review round for a theme that was missed. */
export async function viewPuzzleReview(theme: string) {
  render('<section><p>Looking for a puzzle…</p></section>', 'practice');
  const file = await getPuzzleFile();
  let match = matchPuzzle(file, undefined, theme);
  if (!match.pick && theme === 'fork' && state.games.some((g) => g.isFixture)) {
    match = { pick: { puzzle: FIXTURE_PUZZLE, matched: true, label: 'TEST FIXTURE puzzle (hand-made, not from Lichess)' } };
  }
  if (!match.pick) {
    render(`<section><h2>Puzzle review: ${esc(theme)}</h2><p>${esc(match.skipReason ?? 'No puzzle.')}</p><p><button class="btn" id="back">Back to Practice</button></p></section>`, 'practice');
    app_('#back').addEventListener('click', nav.practice);
    return;
  }
  const p = match.pick.puzzle;
  const ps = new PuzzleSession(p);
  let wrong = 0;
  let shown = false;
  render(
    `<div class="lesson"><div class="lesson-board"><div class="board-frame"><div id="board"></div></div></div>
    <section class="lesson-side"><p class="crumb">Puzzle review · ${esc(theme)}</p><div id="teacher">${teacherHtml('review', 'stern')}</div>
      <p><b>${esc(match.pick.label)}</b></p>
      ${p.isFixture ? '<div class="fixture">TEST FIXTURE puzzle: hand-made, not from the Lichess database.</div>' : `<p class="note">Rating ${p.rating}. Puzzle <a href="https://lichess.org/training/${esc(p.id)}" target="_blank" rel="noopener">${esc(p.id)}</a> from the Lichess puzzle database (CC0).</p>`}
      <p class="task" id="pturn">${ps.learner === 'w' ? 'White' : 'Black'} to move. The opponent's setup move is highlighted.</p>
      <p id="pmsg" class="feedback" aria-live="polite"></p>
      <p><button class="btn" id="solution">Show solution</button> <button class="btn primary big" id="finish" hidden>Finish</button></p></section></div>`,
    'practice',
  );
  const board = new Board(app_('#board'));
  const say = (e: TeacherEvent, mood: 'stern' | 'proud' = 'stern') => (app_('#teacher').innerHTML = teacherHtml(e, mood));
  const pm = app_('#pmsg');
  const refresh = () => board.set({ fen: ps.chess.fen(), orientation: ps.learner, lastMove: ps.lastMove, interactive: !ps.solved && !shown });
  refresh();
  const done = () => {
    const outcome: Exclude<Outcome, 'pending'> = shown ? 'shown' : wrong === 0 ? 'independent' : 'corrected';
    logAttempt(kv, { ts: Date.now(), kind: 'puzzle', refId: p.id, outcome, detail: theme });
    recordOutcome(kv, { id: `puzzle:${theme}`, kind: 'puzzleTheme', ref: theme, label: `Puzzle practice: ${theme}` }, outcome, Date.now(), state.sessionNo);
    (app_('#finish') as HTMLButtonElement).hidden = false;
    (app_('#solution') as HTMLButtonElement).hidden = true;
    app_('#finish').addEventListener('click', () => {
      const r = completeRound(kv, `puzzletheme:${theme}`, new Date());
      noteRoundCompleted(kv, 'middle');
      renderComplete({ title: 'Puzzle review complete', lines: [`Puzzle: ${outcome === 'independent' ? 'solved first time' : outcome === 'corrected' ? 'solved after wrong tries' : 'solution shown'}.`], result: r, next: [{ label: 'Back to Practice', run: nav.practice }] });
    });
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
      done();
    } else pm.innerHTML = '<span class="good">Correct.</span> Keep going.';
    refresh();
  };
  app_('#solution').addEventListener('click', () => {
    shown = true;
    pm.textContent = 'Solution: ' + ps.solutionSan().join(' ');
    say('shown');
    refresh();
    done();
  });
}

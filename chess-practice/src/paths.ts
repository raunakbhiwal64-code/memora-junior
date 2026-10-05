import { PHASE_RULE } from './phase';
import type { LessonState, PhasePath } from './progress';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STATE: Record<LessonState, { icon: string; text: string }> = {
  ready: { icon: '●', text: 'Ready' },
  inProgress: { icon: '◐', text: 'In progress' },
  practised: { icon: '✓', text: 'Practised' },
  revisit: { icon: '↻', text: 'Revisit' },
};

const EMPTY: Record<string, string> = {
  opening: 'No move in the first 10 moves of these games lost a meaningful amount of advantage.',
  middle: 'No middle-game move in these games lost a meaningful amount of advantage.',
  end: 'No end-game move in these games lost a meaningful amount of advantage.',
};

/** HTML for the three learning paths. Pure: takes the already-built paths. */
export function renderPaths(paths: PhasePath[], opts: { fixture: boolean; threshold: string }): string {
  const cards = paths
    .map((p) => {
      const nodes = p.lessons
        .map((l, i) => {
          const st = STATE[l.state];
          return `<li class="node ${l.state}">
            <button type="button" class="node-btn" data-i="${l.index}" aria-label="Lesson ${i + 1}: move ${l.moment.moveNumber} against ${esc(l.moment.opponent)}, ${st.text}">
              <span class="node-dot" aria-hidden="true">${l.state === 'ready' || l.state === 'inProgress' ? i + 1 : st.icon}</span>
              <span class="node-text"><b>Move ${l.moment.moveNumber}</b> · ${l.moment.myColor === 'w' ? 'White' : 'Black'}<br><span class="note">vs ${esc(l.moment.opponent)}</span></span>
              <span class="pill ${l.state}"><span aria-hidden="true">${st.icon}</span> ${st.text}</span>
            </button></li>`;
        })
        .join('');
      const body = p.total
        ? `<ol class="path">${nodes}</ol>`
        : `<p class="empty">${EMPTY[p.phase]} Nothing is invented to fill this path.</p>`;
      const pct = p.total ? Math.round((p.practised / p.total) * 100) : 0;
      return `<section class="phase ${p.phase}" aria-labelledby="h-${p.phase}">
        <header><h2 id="h-${p.phase}">${p.label}</h2>
          <p class="count">${p.total ? `${p.practised} of ${p.total} position${p.total === 1 ? '' : 's'} practised` : 'No positions'}</p>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.practised}" aria-label="${p.label} progress"><span style="width:${pct}%"></span></div>
        </header>
        ${body}
        <button type="button" class="btn primary big resume" data-resume="${p.resume ? p.resume.index : ''}" ${p.resume ? '' : 'disabled'}>${p.resume ? p.resume.label : 'Nothing to practise'}</button>
      </section>`;
    })
    .join('');
  return `<div class="paths-intro">
      <h2>Your learning paths</h2>
      ${opts.fixture ? '<div class="fixture">TEST FIXTURE: these positions come from generated test games, not yours.</div>' : ''}
      <p class="note">Every position is a real move from your games that the engine estimates lost at least ${esc(opts.threshold)} of advantage. Open any path in any order. Your original move and the answer stay hidden until you try. "Practised" means you tried it and read the explanation, not that you have mastered it. "Revisit" means you finished it without finding a good move yet.</p>
      <p class="note">Positions where you were already clearly worse (more than 1.5 pawns behind) are skipped: those moves were damage control, and the real lesson is the earlier move that got you there. The first such move in each game is taught first.</p>
      <p class="note">${esc(PHASE_RULE)}</p>
    </div>
    <div class="paths">${cards}</div>`;
}

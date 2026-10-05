import { DEFAULTS } from './moments';
import { PHASE_LABEL, PHASE_RULE, type Phase } from './phase';
import type { LessonState, PhasePath } from './progress';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STATE: Record<LessonState, { icon: string; text: string }> = {
  ready: { icon: '●', text: 'Ready' },
  inProgress: { icon: '◐', text: 'In progress' },
  practised: { icon: '✓', text: 'Practised' },
  revisit: { icon: '↻', text: 'Revisit' },
};

const emptyText = (phase: Phase) =>
  `No ${PHASE_LABEL[phase].toLowerCase()} move in these games was an eligible mistake (it needs to lose at least ${DEFAULTS.thresholds[phase] / 100} pawns by engine estimate, among the other rules above).`;

/** HTML for the learning paths of the learner's own mistakes. The original move and the answer are never shown here. */
export function renderPaths(paths: PhasePath[], opts: { fixture: boolean; filter: Phase | 'all' }): string {
  const shown = paths.filter((p) => opts.filter === 'all' || p.phase === opts.filter);
  const cards = shown
    .map((p) => {
      const nodes = p.lessons
        .map((l, i) => {
          const st = STATE[l.state];
          return `<li class="node ${l.state}">
            <button type="button" class="node-btn" data-i="${l.index}" aria-label="Position ${i + 1}: move ${l.moment.moveNumber} against ${esc(l.moment.opponent)}, ${st.text}">
              <span class="node-dot" aria-hidden="true">${l.state === 'ready' || l.state === 'inProgress' ? i + 1 : st.icon}</span>
              <span class="node-text"><b>Move ${l.moment.moveNumber}</b> · ${l.moment.myColor === 'w' ? 'White' : 'Black'}<br><span class="note">vs ${esc(l.moment.opponent)}</span></span>
              <span class="pill ${l.state}"><span aria-hidden="true">${st.icon}</span> ${st.text}</span>
              ${l.moment.needsReview ? '<span class="pill pendingpill">Phase: needs review</span>' : ''}
            </button></li>`;
        })
        .join('');
      const body = p.total ? `<ol class="path">${nodes}</ol>` : `<p class="empty">${esc(emptyText(p.phase))} Nothing is invented to fill this path.</p>`;
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
  const d = DEFAULTS;
  return `<div class="paths-intro">
      ${opts.fixture ? '<div class="fixture">TEST FIXTURE: these positions come from generated test games, not yours.</div>' : ''}
      <p class="note">Each position is one of your own moves that the engine estimates was a real mistake. Original move, evaluation and answer stay hidden until you try. "Practised" means you tried it and read the explanation, not that you have mastered it.</p>
      <p class="note"><b>Default rules (tunable):</b> engine depth ${d.depth}, re-checked at ${d.recheckDepth}; a mistake must lose at least ${d.thresholds.opening / 100} pawns in the opening, ${d.thresholds.middle / 100} in the middle game, ${d.thresholds.end / 100} in the end game (or a repertoire deviation costing ${d.repertoireDeviationCp / 100}+ in the opening, or a forced mate missed or allowed). Moves made when you were already worse than ${d.alreadyLostCp / 100} are skipped, and a move from a clearly winning position is skipped if it still wins. At most ${d.maxPerGame} positions per game; the biggest mistake and the earliest cause are included first.</p>
      <p class="note">${esc(PHASE_RULE)}</p>
    </div>
    <div class="paths">${cards}</div>`;
}

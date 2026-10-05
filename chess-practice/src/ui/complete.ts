import type { RoundResult } from '../rounds';
import { teacherHtml } from './teacher';
import { app, esc, render } from './ctx';

export interface CompleteOpts {
  title: string;
  lines: string[];
  result: RoundResult;
  extraHtml?: string;
  next: { label: string; run: () => void }[];
  wire?: (root: HTMLElement) => void;
}

/** A small celebration: a handful of shapes that rise once. Hidden entirely when the learner prefers reduced motion. */
const confetti = () =>
  `<div class="celebrate" aria-hidden="true">${['#ffd43b', '#4dabf7', '#69db7c', '#f783ac', '#ffa94d', '#9775fa', '#63e6be', '#ffe066']
    .map((c, i) => `<span style="--x:${8 + i * 12}%;--d:${i * 70}ms;background:${c}"></span>`)
    .join('')}</div>`;

/** "Round complete": honest XP (once per round), the practice day and a gentle streak. No lives, no penalties. */
export function renderComplete(o: CompleteOpts) {
  const r = o.result;
  const xp = r.alreadyCounted
    ? 'XP for this round was already counted. Repeating a round does not add XP.'
    : `+${r.xpGained} XP (total ${r.totalXp}).`;
  const day = r.newPracticeDay ? 'Counted as a practice day today.' : 'Today already counts as a practice day.';
  const streak = r.streak === 1 ? '1 practice day in a row.' : `${r.streak} practice days in a row. A gap just restarts the count; nothing is lost.`;
  render(
    `<section class="complete">${confetti()}
      ${teacherHtml('finish', 'proud')}
      <h2>${esc(o.title)}</h2>
      ${o.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
      <p class="xp"><b>${esc(xp)}</b> ${esc(day)} ${esc(streak)}</p>
      ${o.extraHtml ?? ''}
      <p class="nextrow">${o.next.map((n, i) => `<button class="btn ${i === 0 ? 'primary big' : ''}" data-next="${i}">${esc(n.label)}</button>`).join(' ')}</p>
    </section>`,
    null,
  );
  app.querySelectorAll<HTMLButtonElement>('button[data-next]').forEach((b) => b.addEventListener('click', () => o.next[Number(b.dataset.next)].run()));
  o.wire?.(app);
}

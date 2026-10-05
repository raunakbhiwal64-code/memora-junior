/**
 * An original teacher illustration (inline SVG, drawn for this project): dark cardigan, folded arms,
 * furrowed brow, quietly proud. The persona only wraps the teaching; it never states chess facts of its own.
 */
export type Mood = 'stern' | 'proud';

export function teacherSvg(mood: Mood = 'stern'): string {
  const brow = mood === 'stern'
    ? '<path d="M38 41 L50 46" /><path d="M72 41 L60 46" />'
    : '<path d="M38 43 L50 44" /><path d="M72 43 L60 44" />';
  const mouth = mood === 'stern'
    ? '<path d="M50 66 Q55 63 60 66" fill="none"/>'
    : '<path d="M49 65 Q55 69 61 64" fill="none"/>';
  return `<svg class="teacher-svg" viewBox="0 0 110 130" role="img" aria-label="${mood === 'proud' ? 'The teacher, quietly proud' : 'The teacher, stern'}" focusable="false">
    <ellipse cx="55" cy="122" rx="38" ry="6" fill="#0002"/>
    <!-- cardigan body -->
    <path d="M18 122 C14 92 26 80 55 78 C84 80 96 92 92 122 Z" fill="#2b2f3a"/>
    <path d="M55 78 L55 122" stroke="#444a5a" stroke-width="2"/>
    <circle cx="55" cy="96" r="2.4" fill="#8a90a0"/><circle cx="55" cy="108" r="2.4" fill="#8a90a0"/>
    <!-- shirt collar -->
    <path d="M44 78 L55 92 L66 78 Z" fill="#e9e4d6"/>
    <!-- folded arms -->
    <rect x="22" y="92" width="66" height="15" rx="7.5" fill="#363b4a"/>
    <rect x="30" y="99" width="50" height="12" rx="6" fill="#2b2f3a"/>
    <circle cx="30" cy="104" r="6" fill="#d9b48f"/><circle cx="80" cy="104" r="6" fill="#d9b48f"/>
    <!-- neck + head -->
    <rect x="48" y="70" width="14" height="10" rx="4" fill="#d9b48f"/>
    <circle cx="55" cy="52" r="24" fill="#e3c19c"/>
    <!-- hair -->
    <path d="M31 50 C30 28 80 28 79 50 C74 40 36 40 31 50 Z" fill="#3b3128"/>
    <!-- glasses -->
    <g stroke="#2b2f3a" stroke-width="2" fill="none"><circle cx="45" cy="52" r="7"/><circle cx="65" cy="52" r="7"/><path d="M52 52 L58 52"/></g>
    <circle cx="45" cy="53" r="2.2" fill="#2b2f3a"/><circle cx="65" cy="53" r="2.2" fill="#2b2f3a"/>
    <!-- brows + mouth -->
    <g stroke="#3b3128" stroke-width="3" stroke-linecap="round">${brow}</g>
    <g stroke="#7a4b3a" stroke-width="2.4" stroke-linecap="round">${mouth}</g>
  </svg>`;
}

export type TeacherEvent = 'start' | 'retry' | 'correct' | 'finish' | 'hint' | 'shown' | 'review' | 'empty';

/** Short, dry lines. No mockery, no guilt. */
const LINES: Record<TeacherEvent, string[]> = {
  start: ['Slow down. Find the threat.', 'Look before you leap. What did their last move do?', 'Take your time. The board will wait.'],
  retry: ['Not yet. What changed after that move?', 'Close the loop: what can they do in reply?', 'Again. Check their checks and captures first.'],
  correct: ['Good. You saw it.', 'Right. Note why it works.', 'Correct. Now keep the habit.'],
  finish: ['Better. Keep that habit.', 'Done. Practised is not mastered; come back to it.', 'Fine work. The same patterns will return.'],
  hint: ['A nudge, not an answer.'],
  shown: ['Seeing it once is a start. Try it again later.', 'Now you know. Next time, find it yourself.'],
  review: ['Back again. Good: that is how it sticks.'],
  empty: ['Nothing here yet. Honest beats busy.'],
};

let tick = 0;
export const teacherLine = (e: TeacherEvent): string => {
  const l = LINES[e];
  return l[tick++ % l.length];
};

export function teacherHtml(event: TeacherEvent, mood: Mood = 'stern', line?: string): string {
  const say = line ?? teacherLine(event);
  return `<div class="teacher" data-event="${event}">${teacherSvg(mood)}<p class="bubble" role="status">${say.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</p></div>`;
}

import { createBrowserEngine, type Engine } from '../engine';
import { loadSavedGames } from '../games';
import { localKV } from '../kv';
import { summary } from '../rounds';
import type { DebugRow } from '../debug';
import type { AnalysisSummary } from '../moments';
import type { Phase } from '../phase';
import type { GameInfo, Moment } from '../types';

export const app = document.getElementById('app')!;
export const kv = localKV;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const USER_KEY = 'chess-practice:username';
export const PUZZLE_URL = new URL('puzzles.json', document.baseURI).href;
export const PLAYED_COLOR = '#d9480f';
export const BEST_COLOR = '#2b8a3e';
export const ALT_COLOR = '#1c7ed6';

export interface AppState {
  username: string;
  games: GameInfo[];
  moments: Moment[];
  debug: DebugRow[];
  summary?: AnalysisSummary;
  sessionNo: number;
  importError: { msg: string; retry: boolean } | null;
  importStatus: string;
  pgnError: string;
  phaseFilter: Phase | 'all';
  engine: Engine | null;
  abort: AbortController | null;
}

export const state: AppState = {
  username: (() => {
    try {
      return localStorage.getItem(USER_KEY) || 'Rbhiwal';
    } catch {
      return 'Rbhiwal';
    }
  })(),
  games: loadSavedGames()?.games ?? [],
  moments: [],
  debug: [],
  sessionNo: 1,
  importError: null,
  importStatus: '',
  pgnError: '',
  phaseFilter: 'all',
  engine: null,
  abort: null,
};

export function getEngine(): Engine {
  if (!state.engine) state.engine = createBrowserEngine();
  return state.engine;
}

export type Tab = 'learn' | 'mistakes' | 'practice';

/** Views register themselves here so modules do not import each other in a circle. */
export const nav: {
  learn: () => void;
  lesson: (lessonId: string, opts?: { quizOnly?: string; fromPractice?: boolean }) => void;
  mistakes: () => void;
  importView: () => void;
  analysis: () => void;
  round: (momentId: string, opts?: { phaseOnly?: boolean }) => void;
  practice: () => void;
} = {} as never;

export const TAB_LABEL: Record<Tab, string> = { learn: 'Learn openings', mistakes: 'Understand my mistakes', practice: 'Practice' };

export function statsLine(): string {
  const s = summary(kv);
  const days = s.streak === 1 ? '1 practice day in a row' : `${s.streak} practice days in a row`;
  return `<span class="stat" title="Experience points: 10 per completed round, once per round">${s.totalXp} XP</span><span class="stat" title="Counted by your local calendar date; a gap just restarts it">${days}</span>`;
}

/** Page frame: title, the three-step path as tabs, and the learner's honest counters. */
export function shell(inner: string, active: Tab | null = null): string {
  const tabs = (Object.keys(TAB_LABEL) as Tab[])
    .map((t, i) => `<button type="button" class="tab${active === t ? ' active' : ''}" data-tab="${t}" ${active === t ? 'aria-current="page"' : ''}><span class="tabno">${i + 1}</span> ${TAB_LABEL[t]}</button>`)
    .join('');
  return `<header class="topbar"><div class="brand"><h1>Chess Practice</h1><span class="note">for adult learners</span></div>
    <nav class="tabs" aria-label="Main sections">${tabs}</nav><div class="stats">${statsLine()}</div></header>
    <p class="note intro">Everything runs in this browser tab; nothing is uploaded. Engine results are estimates, not certainty.</p>${inner}`;
}

/** Wire the tab buttons after a render. */
export function wireTabs() {
  app.querySelectorAll<HTMLButtonElement>('button[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      const t = b.dataset.tab as Tab;
      if (t === 'learn') nav.learn();
      else if (t === 'mistakes') nav.mistakes();
      else nav.practice();
    }),
  );
}

export function render(inner: string, active: Tab | null = null) {
  app.innerHTML = shell(inner, active);
  wireTabs();
  window.scrollTo(0, 0);
}

export const fmtDate = (unixSeconds: number) => (unixSeconds ? new Date(unixSeconds * 1000).toLocaleDateString() : '–');
export const fmtWindow = (a: number, b: number) => (a && b ? (a === b ? fmtDate(a) : `${fmtDate(a)} to ${fmtDate(b)}`) : 'dates unknown');

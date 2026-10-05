import { cacheGet, cacheSet } from './cache';
import { PHASES, type Phase } from './phase';
import type { Moment } from './types';

/** ready = not tried; inProgress = tried, explanation not read yet; practised = tried and a good move found; revisit = tried but no good move found. "Practised" is not "mastered". */
export type LessonState = 'ready' | 'inProgress' | 'practised' | 'revisit';

export interface LessonRecord {
  attempted: boolean;
  practised: boolean;
  foundGood: boolean;
}

export interface RecordStore {
  get(key: string): LessonRecord | undefined;
  set(key: string, rec: LessonRecord): void;
}

/** Progress lives in this browser only (localStorage). */
export const localStore: RecordStore = {
  get: (key) => cacheGet<LessonRecord>('lesson:' + key),
  set: (key, rec) => cacheSet('lesson:' + key, rec),
};

export const lessonKey = (m: Moment) => `${m.gameId}:${m.ply}:${m.playedUci}`;

export function stateOf(r?: LessonRecord): LessonState {
  if (!r || !r.attempted) return 'ready';
  if (!r.practised) return 'inProgress';
  return r.foundGood ? 'practised' : 'revisit';
}

export function noteAttempt(store: RecordStore, key: string, good: boolean) {
  const r = store.get(key) ?? { attempted: false, practised: false, foundGood: false };
  store.set(key, { ...r, attempted: true, foundGood: r.foundGood || good });
}

/** Called when the explanation is revealed after at least one attempt. */
export function notePractised(store: RecordStore, key: string) {
  const r = store.get(key);
  if (!r || !r.attempted) return;
  store.set(key, { ...r, practised: true });
}

export interface PathLesson {
  /** Index into the moments array. */
  index: number;
  moment: Moment;
  state: LessonState;
}

export interface PhasePath {
  phase: Phase;
  label: string;
  lessons: PathLesson[];
  /** Lessons already practised (including ones marked revisit). */
  practised: number;
  total: number;
  /** Lesson the resume button opens, and the button's wording. */
  resume?: { index: number; label: string };
}

export function buildPaths(moments: Moment[], store: RecordStore = localStore): PhasePath[] {
  return PHASES.map(({ id, label }) => {
    const lessons: PathLesson[] = [];
    moments.forEach((moment, index) => {
      if (moment.phase === id) lessons.push({ index, moment, state: stateOf(store.get(lessonKey(moment))) });
    });
    const practised = lessons.filter((l) => l.state === 'practised' || l.state === 'revisit').length;
    const first = (s: LessonState) => lessons.find((l) => l.state === s);
    let resume: PhasePath['resume'];
    if (first('inProgress')) resume = { index: first('inProgress')!.index, label: 'Resume' };
    else if (first('ready')) resume = { index: first('ready')!.index, label: practised > 0 ? 'Continue' : 'Start' };
    else if (first('revisit')) resume = { index: first('revisit')!.index, label: 'Revisit' };
    else if (lessons.length) resume = { index: lessons[0].index, label: 'Practise again' };
    return { phase: id, label, lessons, practised, total: lessons.length, resume };
  });
}

import type { Moment } from './types';

export type ResultKind = 'win' | 'loss' | 'draw' | 'unknown';

/** Chess.com result codes for MY side. */
export function resultKind(result: string): ResultKind {
  if (result === 'win') return 'win';
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(result)) return 'draw';
  if (['checkmated', 'resigned', 'timeout', 'abandoned', 'lose'].includes(result)) return 'loss';
  return 'unknown';
}

export interface LeakRow {
  tag: string;
  /** Distinct games with this tag (retries are not counted). */
  games: number;
  moments: number;
  windowStart: number;
  windowEnd: number;
  byColor: { w: number; b: number };
  byResult: Record<ResultKind, number>;
  byTimeClass: Record<string, number>;
  momentIds: string[];
}

export interface LeakSummary {
  rows: LeakRow[];
  sampleGames: number;
  windowStart: number;
  windowEnd: number;
  untagged: number;
  note: string;
}

/** Recurring patterns from the imported sample. Always shows the sample size and time window; no mastery scores. */
export function summariseLeaks(moments: Moment[], sampleGames: number): LeakSummary {
  const by = new Map<string, Moment[]>();
  let untagged = 0;
  for (const m of moments) {
    if (!m.tag) {
      untagged++;
      continue;
    }
    by.set(m.tag, [...(by.get(m.tag) ?? []), m]);
  }
  const dates = moments.map((m) => m.gameDate).filter((d) => d > 0);
  const rows: LeakRow[] = [...by.entries()].map(([tag, ms]) => {
    const ds = ms.map((m) => m.gameDate).filter((d) => d > 0);
    const row: LeakRow = {
      tag, games: new Set(ms.map((m) => m.gameId)).size, moments: ms.length,
      windowStart: ds.length ? Math.min(...ds) : 0, windowEnd: ds.length ? Math.max(...ds) : 0,
      byColor: { w: 0, b: 0 }, byResult: { win: 0, loss: 0, draw: 0, unknown: 0 }, byTimeClass: {}, momentIds: ms.map((m) => m.id),
    };
    const seenGames = new Set<string>();
    for (const m of ms) {
      if (seenGames.has(m.gameId)) continue;
      seenGames.add(m.gameId);
      row.byColor[m.myColor]++;
      row.byResult[resultKind(m.gameResult)]++;
      row.byTimeClass[m.timeClass] = (row.byTimeClass[m.timeClass] ?? 0) + 1;
    }
    return row;
  });
  rows.sort((a, b) => b.games - a.games || b.moments - a.moments || a.tag.localeCompare(b.tag));
  return {
    rows,
    sampleGames,
    windowStart: dates.length ? Math.min(...dates) : 0,
    windowEnd: dates.length ? Math.max(...dates) : 0,
    untagged,
    note: 'Counts come only from the games you imported, so a pattern seen twice in five games is a hint, not a statistic. A game you won can still contain a mistake: a win does not show you convert advantages well.',
  };
}

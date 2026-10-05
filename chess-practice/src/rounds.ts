import type { KV } from './kv';

export const XP_PER_ROUND = 10;

/** YYYY-MM-DD in the learner's local calendar. */
export function localDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export interface RoundResult {
  /** XP added now: 10 the first time this round is completed, 0 afterwards (retries never farm XP). */
  xpGained: number;
  alreadyCounted: boolean;
  /** True when this completion is the first of the local calendar day. */
  newPracticeDay: boolean;
  totalXp: number;
  streak: number;
}

const prev = (d: string): string => {
  const [y, m, day] = d.split('-').map(Number);
  return localDate(new Date(y, m - 1, day - 1));
};

/** Consecutive practice days ending today, or ending yesterday if today has no round yet. No penalty for a gap: it just restarts. */
export function streakOf(days: string[], now: Date): number {
  const set = new Set(days);
  const today = localDate(now);
  let d = set.has(today) ? today : prev(today);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = prev(d);
  }
  return n;
}

export function completeRound(kv: KV, roundId: string, now: Date = new Date()): RoundResult {
  const awarded = kv.get<Record<string, number>>('xp:rounds') ?? {};
  const days = kv.get<string[]>('xp:days') ?? [];
  const today = localDate(now);
  const alreadyCounted = roundId in awarded;
  let total = kv.get<number>('xp:total') ?? 0;
  if (!alreadyCounted) {
    awarded[roundId] = now.getTime();
    total += XP_PER_ROUND;
    kv.set('xp:rounds', awarded);
    kv.set('xp:total', total);
  }
  const newPracticeDay = !days.includes(today);
  if (newPracticeDay) {
    days.push(today);
    kv.set('xp:days', days);
  }
  return { xpGained: alreadyCounted ? 0 : XP_PER_ROUND, alreadyCounted, newPracticeDay, totalXp: total, streak: streakOf(days, now) };
}

export function summary(kv: KV, now: Date = new Date()) {
  const days = kv.get<string[]>('xp:days') ?? [];
  return { totalXp: kv.get<number>('xp:total') ?? 0, practiceDays: days.length, streak: streakOf(days, now), practisedToday: days.includes(localDate(now)) };
}

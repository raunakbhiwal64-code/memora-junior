import type { KV } from './kv';
import type { Outcome } from './practice';

export interface ReviewConfig {
  /** Days until the next review after each independent success. Editable. */
  intervalsDays: number[];
}
export const DEFAULT_REVIEW_CONFIG: ReviewConfig = { intervalsDays: [1, 3, 7] };

export interface ReviewItem {
  id: string;
  kind: 'moment' | 'puzzleTheme' | 'lessonQuiz';
  /** What to open: a moment id, a puzzle theme, or "lessonId:quizId". */
  ref: string;
  label: string;
  independentSuccesses: number;
  lastOutcome: Exclude<Outcome, 'pending'>;
  /** Due when this session number is reached (after a miss, give-up or corrected answer). */
  dueSession?: number;
  /** Due at this time (after an independent success). */
  dueAt?: number;
  history: { ts: number; outcome: string }[];
}

const KEY = 'reviews:items';
const CFG = 'reviews:config';

export const reviewConfig = (kv: KV): ReviewConfig => {
  const c = kv.get<ReviewConfig>(CFG);
  return c && Array.isArray(c.intervalsDays) && c.intervalsDays.length ? c : DEFAULT_REVIEW_CONFIG;
};

export function setReviewIntervals(kv: KV, text: string): { ok: boolean; error?: string } {
  const nums = text.split(/[ ,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isFinite(n) || n < 1 || n > 365 || !Number.isInteger(n))) {
    return { ok: false, error: 'Use whole numbers of days between 1 and 365, for example 1,3,7.' };
  }
  kv.set(CFG, { intervalsDays: nums });
  return { ok: true };
}

export const allReviews = (kv: KV): Record<string, ReviewItem> => kv.get<Record<string, ReviewItem>>(KEY) ?? {};

/**
 * Miss or give-up: due next session, success count reset. Corrected (right after a retry): due next session,
 * count unchanged. Independent success: due after 1, 3, 7 days (editable); the last interval repeats.
 * Nothing here says "mastered".
 */
export function recordOutcome(
  kv: KV,
  item: Pick<ReviewItem, 'id' | 'kind' | 'ref' | 'label'>,
  outcome: Exclude<Outcome, 'pending'>,
  now: number,
  sessionNo: number,
): ReviewItem {
  const items = allReviews(kv);
  const cur: ReviewItem = items[item.id] ?? { ...item, independentSuccesses: 0, lastOutcome: outcome, history: [] };
  cur.label = item.label;
  cur.lastOutcome = outcome;
  cur.history = [...cur.history, { ts: now, outcome }].slice(-20);
  if (outcome === 'independent') {
    cur.independentSuccesses += 1;
    const iv = reviewConfig(kv).intervalsDays;
    const days = iv[Math.min(cur.independentSuccesses - 1, iv.length - 1)];
    cur.dueAt = now + days * 86_400_000;
    cur.dueSession = undefined;
  } else {
    if (outcome !== 'corrected') cur.independentSuccesses = 0;
    cur.dueSession = sessionNo + 1;
    cur.dueAt = undefined;
  }
  items[item.id] = cur;
  kv.set(KEY, items);
  return cur;
}

export function dueItems(kv: KV, now: number, sessionNo: number): ReviewItem[] {
  return Object.values(allReviews(kv))
    .filter((r) => (r.dueSession !== undefined && sessionNo >= r.dueSession) || (r.dueAt !== undefined && now >= r.dueAt))
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
}

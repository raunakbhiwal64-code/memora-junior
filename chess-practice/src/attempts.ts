import type { KV } from './kv';
import type { Outcome } from './practice';

export type AttemptKind = 'moment' | 'quiz' | 'puzzle';

export interface AttemptLog {
  ts: number;
  kind: AttemptKind;
  refId: string;
  outcome: Exclude<Outcome, 'pending'>;
  /** Free text, e.g. the move tried. */
  detail?: string;
}

const KEY = 'attempts:log';
const MAX = 2000;

export function logAttempt(kv: KV, a: AttemptLog): void {
  const list = kv.get<AttemptLog[]>(KEY) ?? [];
  list.push(a);
  kv.set(KEY, list.slice(-MAX));
}

export const attemptLog = (kv: KV): AttemptLog[] => kv.get<AttemptLog[]>(KEY) ?? [];

/** Unique items tried versus total tries (retries are not new errors). */
export function attemptCounts(kv: KV, kind: AttemptKind) {
  const rows = attemptLog(kv).filter((a) => a.kind === kind);
  const unique = new Set(rows.map((r) => r.refId));
  return { uniqueItems: unique.size, tries: rows.length, independent: rows.filter((r) => r.outcome === 'independent').length };
}

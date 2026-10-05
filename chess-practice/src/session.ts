import type { KV } from './kv';

/** Counts app sessions (one per page load). Reviews missed in a session are due in the next one. */
export function startSession(kv: KV): number {
  const n = (kv.get<number>('session:no') ?? 0) + 1;
  kv.set('session:no', n);
  return n;
}

export const currentSession = (kv: KV): number => kv.get<number>('session:no') ?? 1;

import { cacheGet, cacheSet } from './cache';

/** Tiny key-value interface so learning-state modules can be tested without a browser. */
export interface KV {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
}

export const localKV: KV = { get: cacheGet, set: cacheSet };

export function memoryKV(): KV & { dump(): Record<string, unknown> } {
  const m = new Map<string, unknown>();
  return {
    get: <T>(k: string) => (m.has(k) ? (structuredClone(m.get(k)) as T) : undefined),
    set: (k, v) => void m.set(k, structuredClone(v)),
    dump: () => Object.fromEntries(m),
  };
}

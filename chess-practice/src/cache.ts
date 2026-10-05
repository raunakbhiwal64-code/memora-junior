/** Tiny localStorage cache. Every call is safe if storage is blocked or full. */
import { clearAnalysisCache } from './storage';

const PREFIX = 'chess-practice:v1:';

export function cacheGet<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function cacheSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full: caching is optional */
  }
}

/** Removes only the re-computable analysis cache (see storage.ts). Progress and saved games are kept. */
export function cacheClear(): void {
  clearAnalysisCache();
}

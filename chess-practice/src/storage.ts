/**
 * Versioned, non-destructive local storage helpers.
 * Everything this app keeps in the browser lives under the "chess-practice:" prefix.
 * Nothing here deletes learner history: restoring a backup only adds missing entries,
 * and "clear" only removes the re-computable analysis cache.
 */
export const APP_PREFIX = 'chess-practice:';
export const SCHEMA_VERSION = 1;
const SCHEMA_KEY = APP_PREFIX + 'schema';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const defaultStore = (): Store | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export interface SchemaInfo {
  version: number;
  /** Stored data is from a newer app version: do not touch it. */
  newer: boolean;
}

/** Records the schema version on first use. Never rewrites or removes data. */
export function ensureSchema(store: Store | undefined = defaultStore()): SchemaInfo {
  if (!store) return { version: SCHEMA_VERSION, newer: false };
  try {
    const raw = store.getItem(SCHEMA_KEY);
    const v = raw === null ? 0 : Number(raw);
    if (Number.isNaN(v)) return { version: SCHEMA_VERSION, newer: false };
    if (v > SCHEMA_VERSION) return { version: v, newer: true };
    if (v < SCHEMA_VERSION) store.setItem(SCHEMA_KEY, String(SCHEMA_VERSION)); // v0 -> v1 changes nothing else
    return { version: SCHEMA_VERSION, newer: false };
  } catch {
    return { version: SCHEMA_VERSION, newer: false };
  }
}

function appKeys(store: Store): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith(APP_PREFIX)) keys.push(k);
  }
  return keys.sort();
}

export interface Backup {
  app: 'chess-practice';
  schema: number;
  exportedAt: string;
  entries: Record<string, string>;
}

/** A JSON backup of every app entry (progress, saved games, analysis cache). */
export function exportBackup(store: Store | undefined = defaultStore(), now = new Date()): string {
  const entries: Record<string, string> = {};
  if (store) for (const k of appKeys(store)) entries[k] = store.getItem(k) ?? '';
  const b: Backup = { app: 'chess-practice', schema: SCHEMA_VERSION, exportedAt: now.toISOString(), entries };
  return JSON.stringify(b, null, 1);
}

export interface RestoreResult {
  ok: boolean;
  added: number;
  /** Entries that already exist are kept as they are. */
  keptExisting: number;
  error?: string;
}

/** Adds entries from a backup that are not already present. Never overwrites or deletes. */
export function restoreBackup(json: string, store: Store | undefined = defaultStore()): RestoreResult {
  if (!store) return { ok: false, added: 0, keptExisting: 0, error: 'Browser storage is not available.' };
  let b: Backup;
  try {
    b = JSON.parse(json) as Backup;
  } catch {
    return { ok: false, added: 0, keptExisting: 0, error: 'That file is not a valid backup (not JSON).' };
  }
  if (!b || b.app !== 'chess-practice' || typeof b.entries !== 'object' || b.entries === null) {
    return { ok: false, added: 0, keptExisting: 0, error: 'That file is not a Chess Practice backup.' };
  }
  if (typeof b.schema === 'number' && b.schema > SCHEMA_VERSION) {
    return { ok: false, added: 0, keptExisting: 0, error: 'That backup is from a newer version of the app.' };
  }
  let added = 0;
  let kept = 0;
  for (const [k, v] of Object.entries(b.entries)) {
    if (!k.startsWith(APP_PREFIX) || k === SCHEMA_KEY || typeof v !== 'string') continue;
    try {
      if (store.getItem(k) !== null) kept++;
      else {
        store.setItem(k, v);
        added++;
      }
    } catch {
      return { ok: false, added, keptExisting: kept, error: 'Browser storage is full.' };
    }
  }
  return { ok: true, added, keptExisting: kept };
}

/** Removes only the re-computable engine analysis cache. Progress and saved games stay. */
export function clearAnalysisCache(store: Store | undefined = defaultStore()): number {
  if (!store) return 0;
  let n = 0;
  for (const k of appKeys(store)) {
    if (k.startsWith(APP_PREFIX + 'v1:scan')) {
      store.removeItem(k);
      n++;
    }
  }
  return n;
}

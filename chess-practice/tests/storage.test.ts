import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAnalysisCache, ensureSchema, exportBackup, restoreBackup, SCHEMA_VERSION } from '../src/storage';

class Mem {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
}
let store: Mem;
beforeEach(() => {
  store = new Mem();
  store.setItem('chess-practice:v1:lesson:g:10:e2e4', '{"attempted":true,"practised":true,"foundGood":true}');
  store.setItem('chess-practice:v1:games:last', '{"username":"x","savedAt":"2026-10-05","games":[]}');
  store.setItem('chess-practice:v1:scan2:g1:w:12', '[]');
  store.setItem('other-app:keep', 'x');
});

describe('schema', () => {
  it('records the version without touching data, and refuses to touch newer data', () => {
    expect(ensureSchema(store)).toEqual({ version: SCHEMA_VERSION, newer: false });
    expect(store.getItem('chess-practice:schema')).toBe(String(SCHEMA_VERSION));
    expect(store.length).toBe(5);
    store.setItem('chess-practice:schema', '99');
    expect(ensureSchema(store)).toEqual({ version: 99, newer: true });
    expect(store.getItem('chess-practice:schema')).toBe('99');
  });
});

describe('backup and restore', () => {
  it('exports only this app and round-trips into an empty browser', () => {
    const json = exportBackup(store, new Date('2026-10-05T10:00:00Z'));
    const b = JSON.parse(json);
    expect(b.app).toBe('chess-practice');
    expect(Object.keys(b.entries).every((k) => k.startsWith('chess-practice:'))).toBe(true);
    expect(b.entries['other-app:keep']).toBeUndefined();
    const fresh = new Mem();
    expect(restoreBackup(json, fresh)).toEqual({ ok: true, added: 3, keptExisting: 0 });
    expect(fresh.getItem('chess-practice:v1:lesson:g:10:e2e4')).toContain('practised');
  });
  it('never overwrites or deletes: existing entries are kept', () => {
    const json = exportBackup(store);
    store.setItem('chess-practice:v1:lesson:g:10:e2e4', '{"attempted":true,"practised":false,"foundGood":false}');
    const r = restoreBackup(json, store);
    expect(r).toMatchObject({ ok: true, added: 0, keptExisting: 3 });
    expect(store.getItem('chess-practice:v1:lesson:g:10:e2e4')).toContain('"practised":false');
  });
  it('rejects non-backups and newer backups with a clear message', () => {
    expect(restoreBackup('not json', store).error).toMatch(/not JSON/);
    expect(restoreBackup('{"app":"other"}', store).error).toMatch(/not a Chess Practice backup/);
    expect(restoreBackup(JSON.stringify({ app: 'chess-practice', schema: 9, entries: {} }), store).error).toMatch(/newer/);
    expect(restoreBackup(JSON.stringify({ app: 'chess-practice', schema: 1, entries: { 'evil:key': 'x' } }), store)).toMatchObject({ ok: true, added: 0 });
    expect(store.getItem('evil:key')).toBeNull();
  });
});

describe('clearing', () => {
  it('removes only the analysis cache; progress, saved games and other apps stay', () => {
    expect(clearAnalysisCache(store)).toBe(1);
    expect(store.getItem('chess-practice:v1:scan2:g1:w:12')).toBeNull();
    expect(store.getItem('chess-practice:v1:lesson:g:10:e2e4')).not.toBeNull();
    expect(store.getItem('chess-practice:v1:games:last')).not.toBeNull();
    expect(store.getItem('other-app:keep')).toBe('x');
  });
});

describe('saved games (offline)', () => {
  it('saves real games, never fixtures, and loads them back', async () => {
    vi.stubGlobal('localStorage', store);
    const { saveGames, loadSavedGames } = await import('../src/games');
    const game = { id: 'g1', url: 'u', pgn: '1. e4 e5 *', white: 'a', black: 'b', myColor: 'w' as const, opponent: 'b', endTime: 1, timeClass: 'rapid', result: 'win' };
    saveGames('Rbhiwal', [{ ...game, isFixture: true }]);
    expect(store.getItem('chess-practice:v1:games:last')).toContain('"games":[]'); // earlier value untouched: fixtures are not saved
    saveGames('Rbhiwal', [game], new Date('2026-10-05T12:00:00Z'));
    const loaded = loadSavedGames()!;
    expect(loaded.username).toBe('Rbhiwal');
    expect(loaded.games).toHaveLength(1);
    expect(loaded.savedAt).toBe('2026-10-05T12:00:00.000Z');
    store.setItem('chess-practice:v1:games:last', '{"games":[{"bad":1}]}');
    expect(loadSavedGames()).toBeUndefined(); // corrupt data is ignored, not trusted
    vi.unstubAllGlobals();
  });
});

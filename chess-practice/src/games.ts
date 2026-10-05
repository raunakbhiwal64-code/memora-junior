import { cacheGet, cacheSet } from './cache';
import type { GameInfo } from './types';

/** The last imported games, kept in this browser so the app works offline afterwards. */
export interface SavedGames {
  username: string;
  savedAt: string;
  games: GameInfo[];
}

const KEY = 'games:last';

const isGame = (g: unknown): g is GameInfo => {
  const x = g as GameInfo;
  return !!x && typeof x.id === 'string' && typeof x.pgn === 'string' && (x.myColor === 'w' || x.myColor === 'b');
};

export function saveGames(username: string, games: GameInfo[], now = new Date()): void {
  // fixtures are test data: never saved as if they were the learner's games
  const real = games.filter((g) => !g.isFixture);
  if (!real.length) return;
  const rec: SavedGames = { username, savedAt: now.toISOString(), games: real };
  cacheSet(KEY, rec);
}

export function loadSavedGames(): SavedGames | undefined {
  const rec = cacheGet<SavedGames>(KEY);
  if (!rec || !Array.isArray(rec.games)) return undefined;
  const games = rec.games.filter(isGame);
  return games.length ? { username: String(rec.username ?? ''), savedAt: String(rec.savedAt ?? ''), games } : undefined;
}

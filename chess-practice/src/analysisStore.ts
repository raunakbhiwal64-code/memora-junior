import type { KV } from './kv';
import type { AnalysisResult } from './moments';
import type { GameInfo } from './types';

const KEY = 'analysis:last';

interface Saved {
  gameIds: string[];
  savedAt: string;
  result: AnalysisResult;
}

const idsOf = (games: GameInfo[]) => games.map((g) => g.id).sort();

/** Keep the last analysis so Practice and due reviews work after a restart, offline. */
export function saveAnalysis(kv: KV, games: GameInfo[], result: AnalysisResult, now = new Date()): void {
  if (games.some((g) => g.isFixture)) return; // test data is never saved as the learner's analysis
  kv.set(KEY, { gameIds: idsOf(games), savedAt: now.toISOString(), result } satisfies Saved);
}

/** Only returns the saved analysis if it was made for exactly these games. */
export function loadAnalysis(kv: KV, games: GameInfo[]): { result: AnalysisResult; savedAt: string } | undefined {
  const s = kv.get<Saved>(KEY);
  if (!s || !Array.isArray(s.gameIds) || !s.result || !Array.isArray(s.result.moments)) return undefined;
  const now = idsOf(games);
  if (s.gameIds.length !== now.length || s.gameIds.some((id, i) => id !== now[i])) return undefined;
  return { result: s.result, savedAt: s.savedAt };
}

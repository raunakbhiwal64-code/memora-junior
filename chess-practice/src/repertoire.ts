import { Chess } from 'chess.js';
import { CONTENT, creditedMovesVerified, quizPosition } from './curriculum/content';
import { posKey } from './families';
import type { Color } from './types';

type Entry = { color: Color; accepted: Set<string> };
let table: Map<string, Entry> | null = null;

const bare = (san: string) => san.replace(/[+#?!]/g, '');

/** Positions where the lessons credit specific moves. Only engine-verified quizzes count. */
function build(): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const c of Object.values(CONTENT)) {
    for (const q of c.quiz) {
      if (!creditedMovesVerified(q).ok) continue;
      const pos = quizPosition(q);
      const key = posKey(pos.fen);
      const cur = m.get(key) ?? { color: pos.color, accepted: new Set<string>() };
      q.accept.forEach((a) => cur.accepted.add(bare(a.move)));
      m.set(key, cur);
    }
  }
  return m;
}

/**
 * Is a move at this exact position in the verified repertoire? 'unknown' when no lesson covers the position
 * (not a verdict). A move outside the credited set is a 'deviation', which only matters if it also costs
 * something against the engine: sound deviations are not errors.
 */
export function repertoireCheck(fen: string, san: string, color: Color): 'in-repertoire' | 'deviation' | 'unknown' {
  table ??= build();
  const e = table.get(posKey(fen));
  if (!e || e.color !== color) return 'unknown';
  return e.accepted.has(bare(san)) ? 'in-repertoire' : 'deviation';
}

export const _resetRepertoireForTests = () => {
  table = null;
};
export { Chess };

/**
 * One row per analysed own move, for review. This is only the FORMAT (columns + CSV).
 * It is never shown on an unanswered learner quiz. Later stages fill the columns in.
 */
export interface DebugRow {
  gameId: string;
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  phase: string;
  phaseReason: string;
  bestMove: string;
  alternatives: string;
  /** Centipawns in my colour's point of view; mate is kept as text, never as centipawns. */
  evalBefore: string;
  bestRoot: string;
  playedRoot: string;
  lossCp: number | '';
  mate: string;
  secondBestGapCp: number | '';
  tag: string;
  tagEvidence: string;
  repertoireState: string;
  decision: 'kept' | 'dropped' | '';
  reason: string;
  engine: string;
  depth: number | '';
  recheck: string;
}

export const DEBUG_COLUMNS: (keyof DebugRow)[] = [
  'gameId', 'ply', 'moveNumber', 'color', 'san', 'uci', 'phase', 'phaseReason', 'bestMove', 'alternatives',
  'evalBefore', 'bestRoot', 'playedRoot', 'lossCp', 'mate', 'secondBestGapCp', 'tag', 'tagEvidence',
  'repertoireState', 'decision', 'reason', 'engine', 'depth', 'recheck',
];

const cell = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC 4180 CSV (header + one line per row). */
export function toCsv(rows: Partial<DebugRow>[]): string {
  const lines = [DEBUG_COLUMNS.join(',')];
  for (const r of rows) lines.push(DEBUG_COLUMNS.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

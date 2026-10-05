import { describe, expect, it } from 'vitest';
import { DEBUG_COLUMNS, toCsv } from '../src/debug';

describe('debug table format', () => {
  it('has the columns the brief asks for', () => {
    for (const c of ['phase', 'phaseReason', 'bestRoot', 'playedRoot', 'lossCp', 'mate', 'secondBestGapCp', 'tag', 'tagEvidence', 'repertoireState', 'decision', 'reason', 'engine', 'depth', 'recheck'])
      expect(DEBUG_COLUMNS).toContain(c);
  });
  it('writes valid CSV: header, quoting, mate kept as text', () => {
    const csv = toCsv([{ gameId: 'g1', ply: 5, san: 'Nf6', reason: 'dropped: pre-move eval, "already lost"', mate: 'mated in 1', lossCp: '' }]);
    const [head, row] = csv.trim().split('\r\n');
    expect(head.split(',')).toEqual(DEBUG_COLUMNS);
    expect(row).toContain('"dropped: pre-move eval, ""already lost"""');
    expect(row).toContain('mated in 1');
  });
});

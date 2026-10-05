import { describe, expect, it } from 'vitest';
import { phaseOf } from '../src/phase';

describe('phaseOf', () => {
  it('first 10 moves are the opening, whatever is on the board', () => {
    expect(phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('opening');
    expect(phaseOf('4k3/8/8/8/8/8/8/R3K3 w - - 0 10')).toBe('opening');
  });
  it('full board after move 10 is the middle game', () => {
    expect(phaseOf('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 11')).toBe('middle');
  });
  it('few pieces left is the end game (pawns and kings do not count)', () => {
    expect(phaseOf('4k3/pppp4/8/8/8/8/PPPP4/R3K2R w - - 0 30')).toBe('end'); // 20 points
    expect(phaseOf('2k1r3/1pp2p2/3b3R/2p1nN2/4P3/P4PP1/2P5/1K1R4 w - - 1 23')).toBe('end'); // fixture position, 24 points
    expect(phaseOf('2kr1r2/ppp2ppp/8/8/8/8/PPP2PPP/2KR1R1Q w - - 0 30')).toBe('middle'); // 25 points
  });
});

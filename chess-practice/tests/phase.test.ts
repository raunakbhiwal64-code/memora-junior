import { describe, expect, it } from 'vitest';
import { classifyPhase, phaseOf } from '../src/phase';

describe('phase rules (tunable defaults from the brief)', () => {
  it('opening is the first 12 moves while pieces are on', () => {
    expect(classifyPhase('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').phase).toBe('opening');
    expect(classifyPhase('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 12').phase).toBe('opening');
    expect(classifyPhase('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 13').phase).toBe('middle');
  });
  it('end game: no queens and knights/bishops/rooks of both sides total 13 or fewer (N/B = 3, R = 5)', () => {
    expect(classifyPhase('4k3/pppp4/8/8/8/8/PPPP4/R3K2R w - - 0 30')).toMatchObject({ phase: 'end' }); // 10 points
    expect(classifyPhase('r3k3/8/8/8/8/8/8/R3K2R w - - 0 30').phase).toBe('middle'); // 15 points: too much
    // the old fixture position: 24 points of R/N/B, so it is NOT an endgame under this rule
    expect(classifyPhase('2k1r3/1pp2p2/3b3R/2p1nN2/4P3/P4PP1/2P5/1K1R4 w - - 1 23').phase).toBe('middle');
  });
  it('13 points exactly is an end game; 14 is not', () => {
    expect(phaseOf('4k3/8/8/8/8/8/8/RR2K1N1 w - - 0 40')).toBe('end'); // R+R+N = 13
    expect(phaseOf('4kr2/8/8/8/8/8/8/RR2K1N1 w - - 0 40')).toBe('middle'); // 18
  });
  it('queen endings are marked for review, with a reason', () => {
    const r = classifyPhase('4k3/pp3ppp/8/8/8/8/PPP2PPP/3QK3 w - - 0 40');
    expect(r.phase).toBe('end');
    expect(r.needsReview).toBe(true);
    expect(r.reason).toMatch(/queen ending/);
  });
  it('every classification carries its reason', () => {
    for (const fen of ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '4k3/8/8/8/8/8/8/R3K3 w - - 0 50']) expect(classifyPhase(fen).reason.length).toBeGreaterThan(5);
  });
});

import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { playLine } from '../src/facts';
import { RULES } from '../src/sixpart';
import { TAGS, tagMoment, type TagInput } from '../src/tags';

/** Hand-built positions and lines (not engine output); each line is checked to be legal. */
const base = (over: Partial<TagInput>): TagInput => ({
  fen: '', color: 'w', moveNumber: 5, phase: 'middle', playedUci: '', playedSan: '', bestUci: '', bestSan: '', bestLine: [], refutation: [], kind: 'cp', loss: 300,
  before: { cp: 20 }, after: { cp: -280 }, ...over,
});
const legal = (fen: string, line: string[]) => expect(playLine(fen, line).moves).toHaveLength(line.length);

describe('pattern tags need concrete evidence', () => {
  it('forcing move without capture-check: a capture that leaves the piece unprotected', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    legal(fen, ['f3e5', 'c6e5']);
    const t = tagMoment(base({ fen, playedUci: 'f3e5', playedSan: 'Nxe5', bestUci: 'f1b5', bestSan: 'Bb5', bestLine: ['f1b5'], refutation: ['c6e5'] }));
    expect(t?.tag).toBe('forcing move without capture-check');
    expect(t?.evidence).toMatch(/unprotected/);
    expect(t?.theme).toBe('hangingPiece');
  });
  it('missed check/capture/threat scan: their last move attacked my piece and I ignored it', () => {
    const fen = 'r1bqkbnr/pppp1pp1/2n4p/4p1N1/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
    legal(fen, ['b1c3', 'h6g5']);
    const t = tagMoment(base({ fen, playedUci: 'b1c3', playedSan: 'Nc3', bestUci: 'g5f3', bestSan: 'Nf3', bestLine: ['g5f3'], refutation: ['h6g5'], moveNumber: 4, lastOpponent: { uci: 'h7h6', san: 'h6' } }));
    expect(t?.tag).toBe('missed check/capture/threat scan');
    expect(t?.evidence).toMatch(/h6 attacked your knight on g5/);
  });
  it('hung piece: a quiet move leaves a pawn/piece unprotected (no last-move threat)', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    legal(fen, ['g8f6', 'f3e5']);
    const t = tagMoment(base({ fen, color: 'b', playedUci: 'g8f6', playedSan: 'Nf6', bestUci: 'b8c6', bestSan: 'Nc6', bestLine: ['b8c6'], refutation: ['f3e5'], moveNumber: 2 }));
    expect(t?.tag).toBe('hung piece');
    expect(t?.evidence).toMatch(/pawn on e5/);
  });
  it('knight fork: the fork has follow-through in the engine line', () => {
    const fen = '4k3/8/8/4n3/8/8/P2R4/4K3 w - - 0 1';
    legal(fen, ['a2a3', 'e5f3', 'e1f1', 'f3d2']);
    const t = tagMoment(base({ fen, playedUci: 'a2a3', playedSan: 'a3', bestUci: 'd2d1', bestSan: 'Rd1', bestLine: ['d2d1'], refutation: ['e5f3', 'e1f1', 'f3d2'], moveNumber: 1, phase: 'end' }));
    expect(t?.tag).toBe('knight fork');
    expect(t?.theme).toBe('fork');
    expect(t?.evidence).toMatch(/forks/);
  });
  it('allowed mate threat, with the mate theme taken from the length', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 4 4';
    legal(fen, ['g8f6'.replace('g8f6', 'a7a6'), 'h5f7']);
    const t = tagMoment(base({ fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', color: 'b', playedUci: 'g8f6', playedSan: 'Nf6', bestUci: 'g7g6', bestSan: 'g6', bestLine: ['g7g6'], refutation: ['h5f7'], kind: 'allowedMate', before: { cp: 28 }, after: { mate: -1 }, moveNumber: 3 }));
    expect(t?.tag).toBe('allowed mate threat');
    expect(t?.theme).toBe('mateIn1');
    expect(t?.evidence).toMatch(/forced mate in 1/);
  });
  it('returns nothing when there is no concrete evidence (no manufactured tag)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(tagMoment(base({ fen, playedUci: 'a2a3', playedSan: 'a3', bestUci: 'e2e4', bestSan: 'e4', bestLine: ['e2e4'], refutation: ['a7a6'], moveNumber: 1, phase: 'opening', loss: 120 }))).toBeNull();
  });
  it('every tag has a one-line habit, and a habit is only shown with a tag', () => {
    for (const tag of TAGS) expect(RULES[tag], tag).toBeTruthy();
    expect(Object.keys(RULES).sort()).toEqual([...TAGS].sort());
  });
  it('the crafted positions are legal', () => {
    for (const f of ['r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', '4k3/8/8/4n3/8/8/P2R4/4K3 w - - 0 1']) expect(() => new Chess(f)).not.toThrow();
  });
});

import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { FIXTURE_PUZZLE } from '../src/fixtures';
import { PuzzleSession, matchPuzzle, type PuzzleFile } from '../src/puzzle';
import type { Puzzle } from '../src/types';

describe('Lichess setup-move convention', () => {
  it('applies Moves[0] first, so the learner starts at Moves[1]', () => {
    const raw = new Chess(FIXTURE_PUZZLE.fen);
    expect(raw.turn()).toBe('b'); // the stored FEN is BEFORE the setup move
    expect(() => raw.move({ from: 'd5', to: 'c7' })).toThrow();
    const s = new PuzzleSession(FIXTURE_PUZZLE);
    expect(s.learner).toBe('w');
    expect(s.lastMove).toEqual({ from: 'h7', to: 'h6' });
    expect(s.chess.get('h6' as never)?.type).toBe('p');
  });
  it('plays the solution interactively and rejects illegal and wrong moves', () => {
    const s = new PuzzleSession(FIXTURE_PUZZLE);
    expect(s.try('a1a2').result).toBe('illegal');
    expect(s.try('d5b6').result).toBe('wrong');
    expect(s.try('d5c7')).toEqual({ result: 'correct', reply: 'e8d7' });
    expect(s.try('c7a8').result).toBe('solved');
    expect(s.solutionSan()).toEqual(['Nc7+', 'Kd7', 'Nxa8']);
  });
  it('accepts any checkmating move, as Lichess does', () => {
    const s = new PuzzleSession({ id: 'FIXTURE-MATE', fen: '6k1/3p1ppp/8/8/8/8/5PPP/R5K1 b - - 0 1', moves: ['d7d6', 'g2g3', 'g8f8', 'a1a8'], rating: 800, themes: ['mateIn1'], isFixture: true });
    expect(s.try('a1a8').result).toBe('solved');
  });
});

describe('matching a puzzle to an evidenced mechanism', () => {
  const mk = (id: string, rating: number, themes: string[], over: Partial<Puzzle> = {}): Puzzle => ({ id, fen: FIXTURE_PUZZLE.fen, moves: FIXTURE_PUZZLE.moves, rating, themes, ...over });
  const file = (puzzles: Puzzle[]): PuzzleFile => ({ meta: { source: 'test', license: 'test', generated: 'test' }, puzzles });
  it('uses the 1000-1300 band, names the matched mechanism, and keeps the puzzle id', () => {
    const r = matchPuzzle(file([mk('A', 1100, ['fork']), mk('B', 1000, ['pin'])]), 'knight fork', 'fork', () => 0);
    expect(r.pick?.puzzle.id).toBe('A');
    expect(r.pick?.label).toMatch(/Matches your mistake: knight fork/);
    expect(r.pick?.widened).toBeUndefined();
  });
  it('widens the band only when needed and says so', () => {
    const r = matchPuzzle(file([mk('C', 850, ['fork'])]), 'knight fork', 'fork', () => 0);
    expect(r.pick?.widened).toBe(true);
    expect(r.pick?.label).toMatch(/no puzzle in 1000-1300/);
  });
  it('a knight-fork tag needs a knight move as the solver\'s first move', () => {
    // moves[1] = d5c7 is a knight move: fine. A bishop move must not match.
    const bishopFirst = mk('D', 1100, ['fork'], { fen: 'r3k3/7p/8/8/8/8/8/B3K3 b - - 0 1', moves: ['h7h6', 'a1c3', 'e8d7', 'c3a5'] });
    expect(matchPuzzle(file([bishopFirst]), 'knight fork', 'fork', () => 0).pick).toBeNull();
    expect(matchPuzzle(file([mk('E', 1100, ['fork'])]), 'knight fork', 'fork', () => 0).pick?.puzzle.id).toBe('E');
  });
  it('never offers an unrelated filler: no theme means no puzzle, with the reason', () => {
    const r = matchPuzzle(file([mk('F', 1100, ['fork'])]), undefined, undefined, () => 0);
    expect(r.pick).toBeNull();
    expect(r.skipReason).toMatch(/no concrete tactical mechanism/i);
    expect(matchPuzzle(file([mk('G', 1100, ['pin'])]), 'hung piece', 'hangingPiece', () => 0).skipReason).toMatch(/no hanging piece puzzle/);
    expect(matchPuzzle(null, 'hung piece', 'hangingPiece').skipReason).toMatch(/not been built/);
  });
});

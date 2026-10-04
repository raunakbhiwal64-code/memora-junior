import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { FIXTURE_PUZZLE } from '../src/fixtures';
import { PuzzleSession, pickPuzzle, type PuzzleFile } from '../src/puzzle';

describe('Lichess setup-move convention', () => {
  it('applies Moves[0] first, so the learner starts at Moves[1]', () => {
    const raw = new Chess(FIXTURE_PUZZLE.fen);
    expect(raw.turn()).toBe('b'); // the stored FEN is BEFORE the setup move
    expect(() => raw.move({ from: 'd5', to: 'c7' })).toThrow(); // learner move is not legal there
    const s = new PuzzleSession(FIXTURE_PUZZLE);
    expect(s.learner).toBe('w');
    expect(s.lastMove).toEqual({ from: 'h7', to: 'h6' });
    expect(s.chess.get('h6')?.type).toBe('p');
  });
  it('plays the solution interactively', () => {
    const s = new PuzzleSession(FIXTURE_PUZZLE);
    expect(s.try('a1a2').result).toBe('illegal');
    expect(s.try('d5b6').result).toBe('wrong'); // legal but not the solution
    const r1 = s.try('d5c7');
    expect(r1).toEqual({ result: 'correct', reply: 'e8d7' });
    expect(s.try('c7a8').result).toBe('solved');
    expect(s.solved).toBe(true);
    expect(s.solutionSan()).toEqual(['Nc7+', 'Kd7', 'Nxa8']);
  });
  it('accepts any checkmating move, as Lichess does', () => {
    const s = new PuzzleSession({
      id: 'FIXTURE-MATE',
      fen: '6k1/3p1ppp/8/8/8/8/5PPP/R5K1 b - - 0 1',
      moves: ['d7d6', 'g2g3', 'g8f8', 'a1a8'], // listed solution is a decoy; Ra8# also mates
      rating: 800,
      themes: ['mateIn1'],
      isFixture: true,
    });
    expect(s.learner).toBe('w');
    expect(s.try('a1a8').result).toBe('solved');
  });
});

describe('pickPuzzle', () => {
  const file: PuzzleFile = {
    meta: { source: 'test', license: 'test', generated: 'test' },
    puzzles: [
      { id: 'A', fen: FIXTURE_PUZZLE.fen, moves: FIXTURE_PUZZLE.moves, rating: 900, themes: ['fork'] },
      { id: 'B', fen: FIXTURE_PUZZLE.fen, moves: FIXTURE_PUZZLE.moves, rating: 1000, themes: ['pin'] },
      { id: 'C', fen: FIXTURE_PUZZLE.fen, moves: FIXTURE_PUZZLE.moves, rating: 2400, themes: ['fork'] },
    ],
  };
  it('matches a theme inside the beginner band', () => {
    const p = pickPuzzle(file, 'fork', () => 0)!;
    expect(p.puzzle.id).toBe('A');
    expect(p.matched).toBe(true);
  });
  it('falls back to "general tactics" when the theme is unknown or unavailable', () => {
    const p = pickPuzzle(file, 'mate', () => 0)!;
    expect(p.matched).toBe(false);
    expect(p.label).toMatch(/General tactics/);
    expect(pickPuzzle(file, undefined, () => 0)!.matched).toBe(false);
  });
  it('returns null when nothing is in the band', () => {
    expect(pickPuzzle({ ...file, puzzles: [file.puzzles[2]] }, 'fork')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { FIXTURE_GAME_BLACK, FIXTURE_GAME_WHITE } from '../src/fixtures';
import { PgnError, colorOf, legalPrefix, lineToSan, parseGame } from '../src/pgn';

describe('PGN parsing', () => {
  it('parses a fixture and finds colours', () => {
    const g = parseGame(FIXTURE_GAME_BLACK.pgn);
    expect(g.moves).toHaveLength(7);
    expect(colorOf(g.headers, 'fixtureme')).toBe('b');
    expect(colorOf(parseGame(FIXTURE_GAME_WHITE.pgn).headers, 'FixtureMe')).toBe('w');
    expect(colorOf(g.headers, 'nobody')).toBeUndefined();
  });
  it('parses Chess.com style clock comments', () => {
    const g = parseGame('[White "a"]\n[Black "b"]\n\n1. e4 {[%clk 0:03:00]} 1... e5 {[%clk 0:02:59]} 2. Nf3 {[%clk 0:02:58]} *');
    expect(g.moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3']);
  });
  it('reports readable errors', () => {
    expect(() => parseGame('')).toThrow(PgnError);
    expect(() => parseGame('1. e4 e5 2. Ke5')).toThrow(/could not be read/);
    expect(() => parseGame('this is not chess')).toThrow(PgnError);
    expect(() => parseGame('[White "a"]\n[Black "b"]\n\n*')).toThrow(/no moves/);
    expect(() => parseGame('[Variant "Chess960"]\n\n1. e4 e5 *')).toThrow(/standard/);
  });
  it('keeps only the legal part of an engine line', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(legalPrefix(fen, ['e2e4', 'e7e5', 'e2e4'])).toEqual(['e2e4', 'e7e5']);
    expect(lineToSan(fen, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3']);
  });
});

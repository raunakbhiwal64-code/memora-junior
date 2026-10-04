/**
 * TEST FIXTURES: hand-made, NOT real Chess.com games and NOT Lichess data.
 * They exist so the app and the tests can be exercised without a network.
 * The UI always labels them "TEST FIXTURE".
 */
import type { GameInfo, Puzzle } from './types';

const hdr = (white: string, black: string, result: string) =>
  `[Event "TEST FIXTURE (hand-made, not a real game)"]\n[Site "fixture"]\n[Date "2000.01.01"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n`;

/** FIXTURE: I play Black and allow Scholar's mate with 3...Nf6?? (ply index 5). */
export const FIXTURE_GAME_BLACK: GameInfo = {
  id: 'fixture-black',
  url: 'https://example.invalid/fixture-black',
  pgn: hdr('FixtureOpponent', 'FixtureMe', '1-0') + '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0',
  white: 'FixtureOpponent',
  black: 'FixtureMe',
  myColor: 'b',
  opponent: 'FixtureOpponent',
  endTime: 946684800,
  timeClass: 'rapid',
  result: 'checkmated',
  isFixture: true,
};

/** FIXTURE: I play White and give a knight away with 9.Nxg5?. */
export const FIXTURE_GAME_WHITE: GameInfo = {
  id: 'fixture-white',
  url: 'https://example.invalid/fixture-white',
  pgn:
    hdr('FixtureMe', 'FixtureOpponent', '*') +
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. Nc3 d6 6. Bg5 h6 7. Bh4 g5 8. Bg3 Nh5 9. Nxg5 hxg5 *',
  white: 'FixtureMe',
  black: 'FixtureOpponent',
  myColor: 'w',
  opponent: 'FixtureOpponent',
  endTime: 946684800,
  timeClass: 'rapid',
  result: 'unfinished',
  isFixture: true,
};

/**
 * FIXTURE puzzle in the Lichess database format (FEN is BEFORE the opponent's
 * setup move). Hand-made knight fork, NOT from the Lichess puzzle database.
 * Moves[0] = black's setup move h7h6; the learner then plays Moves[1] = Nc7+.
 */
export const FIXTURE_PUZZLE: Puzzle = {
  id: 'FIXTURE-0001',
  fen: 'r3k3/7p/8/3N4/8/8/5PPP/6K1 b - - 0 1',
  moves: ['h7h6', 'd5c7', 'e8d7', 'c7a8'],
  rating: 800,
  themes: ['fork', 'short'],
  isFixture: true,
};

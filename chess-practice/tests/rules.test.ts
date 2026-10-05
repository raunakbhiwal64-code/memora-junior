import { describe, expect, it } from 'vitest';
import type { EngineLike } from '../src/engine';
import { PracticeSession } from '../src/practice';
import type { Moment } from '../src/types';

/** A fake engine: always "plays" the first legal move for the side to move. TEST DOUBLE, not Stockfish. */
import { Chess } from 'chess.js';
const fake: EngineLike = {
  async analyse(fen) {
    const c = new Chess(fen);
    const m = c.moves({ verbose: true })[0];
    return { score: { cp: 0 }, pv: m ? [m.from + m.to + (m.promotion ?? '')] : [], bestmove: m ? m.from + m.to + (m.promotion ?? '') : '', depth: 1 };
  },
};

const moment = (fen: string, myColor: 'w' | 'b'): Moment => ({
  gameId: 't', gameUrl: '', opponent: 'x', myColor, ply: 0, moveNumber: 1, fen,
  playedUci: 'a2a3', playedSan: 'a3', bestUci: 'e2e4', bestSan: 'e4', bestLine: [], refutation: [],
  before: { cp: 0 }, after: { cp: 0 }, loss: 0, kind: 'cp', phase: 'opening',
});

describe('legal moves in practice', () => {
  it('rejects illegal moves and wrong side to move', () => {
    const s = new PracticeSession(moment('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w'), fake, 1);
    expect(s.isLegal('e2', 'e5')).toBe(false); // pawn cannot jump 3
    expect(s.isLegal('e7', 'e5')).toBe(false); // black piece, white to move
    expect(s.isLegal('a1', 'a3')).toBe(false); // blocked rook
    expect(s.isLegal('e2', 'e4')).toBe(true);
  });
  it('supports castling', async () => {
    const s = new PracticeSession(moment('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'w'), fake, 1);
    expect(s.isLegal('e1', 'g1')).toBe(true);
    const a = await s.play('e1', 'g1');
    expect(a.san).toBe('O-O');
    expect(s.chess.get('f1')?.type).toBe('r');
  });
  it('supports en passant', async () => {
    const s = new PracticeSession(moment('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'w'), fake, 1);
    expect(s.isLegal('e5', 'd6')).toBe(true);
    await s.play('e5', 'd6');
    expect(s.chess.get('d5')).toBeUndefined(); // captured pawn is gone
    expect(s.chess.get('d6')?.type).toBe('p');
  });
  it('requires and applies promotion choice', async () => {
    const s = new PracticeSession(moment('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', 'w'), fake, 1);
    expect(s.isLegal('e7', 'e8')).toBe(false); // promotion piece required
    expect(s.isLegal('e7', 'e8', 'n')).toBe(true);
    await s.play('e7', 'e8', 'n');
    expect(s.chess.get('e8')).toMatchObject({ type: 'n', color: 'w' });
  });
  it('plays at most 3 of my moves, then finishes; reset restores the position', async () => {
    const start = '4k3/8/8/8/8/8/4PPPP/4K3 w - - 0 1';
    const s = new PracticeSession(moment(start, 'w'), fake, 1);
    await s.play('e2', 'e3');
    await s.play('f2', 'f3');
    const last = await s.play('g2', 'g3');
    expect(last.finished).toBe(true);
    expect(last.engineReply).toBeUndefined();
    s.reset();
    expect(s.chess.fen()).toBe(new Chess(start).fen());
    expect(s.finished).toBe(false);
  });
  it('works for Black and orients side-to-move correctly', async () => {
    const s = new PracticeSession(moment('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'b'), fake, 1);
    expect(s.turnText).toBe('Black');
    expect(s.isLegal('e7', 'e5')).toBe(true);
    expect(s.isLegal('e2', 'e3')).toBe(false);
  });
});

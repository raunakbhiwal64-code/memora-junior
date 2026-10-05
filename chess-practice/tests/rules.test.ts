import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import type { EngineLike, SearchLine, SearchResult } from '../src/engine';
import { PracticeSession, leadInSteps } from '../src/practice';
import type { Moment } from '../src/types';

/**
 * TEST DOUBLE, not Stockfish. Scores every legal move with a rule we control:
 * the move named `good` scores +100, every other move scores -200 (so a wrong move loses 300cp).
 */
const fake = (good: string): EngineLike => ({
  engineName: 'fake engine',
  async search(fen, _d, opts): Promise<SearchResult> {
    const c = new Chess(fen);
    const moves = c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    const only = opts?.searchmoves;
    const pick = (only ?? moves).filter((m) => moves.includes(m));
    const lines: SearchLine[] = pick
      .map((m) => ({ move: m, score: { cp: m === good ? 100 : -200 }, pv: [m], depth: 1 }))
      .sort((a, b) => (b.score.cp ?? 0) - (a.score.cp ?? 0))
      .slice(0, opts?.multipv ?? 1);
    return { lines, bestmove: lines[0]?.move ?? '', engine: 'fake engine', depth: 1 };
  },
  async analyse(fen, d) {
    const r = await this.search(fen, d);
    return { score: r.lines[0]?.score ?? { cp: 0 }, pv: r.lines[0]?.pv ?? [], bestmove: r.bestmove, depth: 1 };
  },
});

const moment = (fen: string, myColor: 'w' | 'b', extra: Partial<Moment> = {}): Moment => ({
  id: 't:0', gameId: 't', gameUrl: '', gameDate: 0, gameResult: 'win', timeClass: 'rapid', opponent: 'x', myColor, ply: 0, moveNumber: 1, fen,
  playedUci: 'a2a3', playedSan: 'a3', bestUci: 'e2e4', bestSan: 'e4', bestLine: [], refutation: [], before: { cp: 0 }, after: { cp: -100 }, loss: 100, kind: 'cp',
  urgency: 100, winningCollapse: false, alternatives: [], phase: 'opening', phaseReason: 'test', engine: { name: 'fake', depth: 1, multipv: 1 }, recheck: { depth: 1, status: 'confirmed' },
  repertoire: 'unknown', ...extra,
});

describe('legal moves at the target position', () => {
  it('rejects illegal moves and the wrong side to move', () => {
    const s = new PracticeSession(moment('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w'), fake('e2e4'), 1);
    expect(s.isLegal('e2', 'e5')).toBe(false);
    expect(s.isLegal('e7', 'e5')).toBe(false);
    expect(s.isLegal('a1', 'a3')).toBe(false);
    expect(s.isLegal('e2', 'e4')).toBe(true);
  });
  it('supports castling, en passant and a promotion choice', async () => {
    const castle = new PracticeSession(moment('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'w'), fake('e1g1'), 1);
    expect(castle.isLegal('e1', 'g1')).toBe(true);
    expect((await castle.play('e1', 'g1')).san).toBe('O-O');
    const ep = new PracticeSession(moment('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'w'), fake('e5d6'), 1);
    await ep.play('e5', 'd6');
    expect(ep.chess.get('d5' as never)).toBeFalsy();
    const promo = new PracticeSession(moment('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', 'w'), fake('e7e8n'), 1);
    expect(promo.isLegal('e7', 'e8')).toBe(false);
    expect((await promo.play('e7', 'e8', 'n')).grade.ok).toBe(true);
  });
  it('works for Black', () => {
    const s = new PracticeSession(moment('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'b'), fake('e7e5'), 1);
    expect(s.turnText).toBe('Black');
    expect(s.isLegal('e7', 'e5')).toBe(true);
    expect(s.isLegal('e2', 'e3')).toBe(false);
  });
});

describe('grading and outcomes (independent / corrected / shown)', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('right first time is independent, and the engine then answers', async () => {
    const s = new PracticeSession(moment(fen, 'w'), fake('e2e4'), 1);
    const a = await s.play('e2', 'e4');
    expect(a.grade).toMatchObject({ ok: true, kind: 'best' });
    expect(a.engineReply).toBeDefined();
    expect(s.outcome).toBe('independent');
  });
  it('a wrong first move is graded by checked loss, is not an answer reveal, and a later success is only corrected', async () => {
    const s = new PracticeSession(moment(fen, 'w'), fake('e2e4'), 1);
    const bad = await s.play('a2', 'a3');
    expect(bad.grade).toMatchObject({ ok: false, kind: 'worse', loss: 300 });
    expect(bad.engineReply).toBeUndefined();
    expect(s.outcome).toBe('miss');
    s.retry();
    expect(s.chess.fen()).toBe(new Chess(fen).fen()); // back to the EXACT target position
    await s.play('e2', 'e4');
    expect(s.outcome).toBe('corrected');
  });
  it('showing the answer is its own outcome and never counts as independent', async () => {
    const s = new PracticeSession(moment(fen, 'w'), fake('e2e4'), 1);
    s.showAnswer();
    expect(s.outcome).toBe('shown');
    await s.play('e2', 'e4');
    expect(s.outcome).toBe('shown');
  });
  it('plays at most two continuation moves after the first, then finishes', async () => {
    const s = new PracticeSession(moment('4k3/8/8/8/8/8/4PPPP/4K3 w - - 0 1', 'w'), fake('e2e3'), 1);
    await s.play('e2', 'e3');
    await s.play('f2', 'f3');
    const last = await s.play('g2', 'g3');
    expect(last.engineReply).toBeUndefined();
    expect(s.finished).toBe(true);
  });
  it('flags playing the same move as the real game', async () => {
    const s = new PracticeSession(moment(fen, 'w', { playedUci: 'a2a3' }), fake('e2e4'), 1);
    expect((await s.play('a2', 'a3')).sameAsGame).toBe(true);
  });
});

describe('lead-in replay hands over the exact target position', () => {
  it('replaying the real game moves from the lead-in start gives the target FEN', () => {
    const c = new Chess();
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'].map((m) => c.move(m));
    const target = c.fen();
    const startFen = moves[0].before;
    const m = moment(target, 'w', { leadIn: { startFen, moves: moves.map((x) => x.from + x.to + (x.promotion ?? '')) } });
    const steps = leadInSteps(m);
    expect(steps).toHaveLength(6);
    expect(steps[steps.length - 1].fen).toBe(target);
    expect(new PracticeSession(m, fake('e2e4'), 1).chess.fen()).toBe(target);
  });
  it('near move 1 there may be no lead-in at all', () => {
    expect(leadInSteps(moment('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w'))).toEqual([]);
  });
});

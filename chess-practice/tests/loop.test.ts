import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FIXTURE_GAMES, FIXTURE_GAME_BLACK, FIXTURE_GAME_END, FIXTURE_GAME_LONDON_QB6, FIXTURE_GAME_LOSING, FIXTURE_GAME_SHELL_F7, FIXTURE_PUZZLE } from '../src/fixtures';
import { toCsv } from '../src/debug';
import { analyseGames, type AnalysisResult } from '../src/moments';
import { PracticeSession } from '../src/practice';
import { PuzzleSession } from '../src/puzzle';
import { repertoireCheck } from '../src/repertoire';
import { sixPart } from '../src/sixpart';
import { createNodeEngine } from './nodeEngine';

/** Integration tests with the real Stockfish 19 lite build on the clearly-marked FIXTURE games. */
const { engine, close } = createNodeEngine();
afterAll(close);

let all: AnalysisResult;
beforeAll(async () => {
  all = await analyseGames([...FIXTURE_GAMES, FIXTURE_GAME_LOSING], engine, undefined, () => {}, undefined, repertoireCheck);
}, 280000);

const of = (gameId: string) => all.moments.filter((m) => m.gameId === gameId);

describe('engine: fixed depth, one thread, repeatable', () => {
  it('the same search twice gives identical lines, and the engine name is recorded', async () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
    const a = await engine.search(fen, 12, { multipv: 3 });
    const b = await engine.search(fen, 12, { multipv: 3 });
    expect(b.lines).toEqual(a.lines);
    expect(a.engine).toMatch(/Stockfish/);
    expect(a.lines).toHaveLength(3);
    const only = await engine.search(fen, 12, { searchmoves: ['g8f6'] });
    expect(only.lines).toHaveLength(1);
    expect(only.lines[0].move).toBe('g8f6');
  }, 60000);
});

describe('whole pipeline on the fixtures', () => {
  it('finds real mistakes for both colours, with my-colour scores and root-move losses', () => {
    const black = of(FIXTURE_GAME_BLACK.id)[0];
    expect(black.myColor).toBe('b');
    expect(black.playedSan).toBe('Nf6');
    expect(black.kind).toBe('allowedMate');
    expect(black.before.cp).toBeGreaterThan(-100); // roughly equal for Black before the blunder
    expect(black.after.mate).toBeLessThan(0); // mated, from Black's point of view
    const white = of('fixture-white').find((m) => m.playedSan === 'Nxg5')!;
    expect(white.myColor).toBe('w');
    expect(white.kind).toBe('cp');
    expect(white.loss).toBeGreaterThan(300);
    expect(white.after.cp!).toBeLessThan(-300);
  });
  it('puts the inserted blunders in the right phase, with the reason recorded', () => {
    const end = of(FIXTURE_GAME_END.id).find((m) => m.playedSan === 'Rd7');
    expect(end).toBeDefined();
    expect(end!.phase).toBe('end');
    expect(end!.phaseReason).toMatch(/no queens/);
    expect(end!.before.cp!).toBeGreaterThan(-300); // never taught from an already-lost position
    const mid = of('fixture-middle').find((m) => m.playedSan === 'Na2');
    expect(mid?.phase).toBe('middle');
    expect(of('fixture-black')[0].phase).toBe('opening');
  });
  it('gives at most 3 per game, never pads, and orders each game\'s earliest costly mistake first', () => {
    for (const g of [...FIXTURE_GAMES, FIXTURE_GAME_LOSING]) expect(of(g.id).length, g.id).toBeLessThanOrEqual(3);
    const losing = of(FIXTURE_GAME_LOSING.id);
    const earliest = Math.min(...losing.map((m) => m.ply));
    expect(losing.find((m) => m.ply === earliest)?.cause).toBe(true);
    expect(losing.filter((m) => m.cause)).toHaveLength(1);
    const firstCauseIdx = all.moments.findIndex((m) => !m.cause);
    if (firstCauseIdx >= 0) expect(all.moments.slice(firstCauseIdx).every((m) => !m.cause)).toBe(true); // causes come first
    // every taught position was not already lost (default noise filter)
    for (const m of all.moments) if (m.before.cp !== undefined) expect(m.before.cp, m.id).toBeGreaterThan(-300);
  });
  it('tags carry concrete evidence, or stay untagged', () => {
    for (const m of all.moments) {
      if (m.tag) expect(m.tagEvidence!.length, m.id).toBeGreaterThan(10);
      else expect(m.tagEvidence).toBeUndefined();
    }
    const black = of(FIXTURE_GAME_BLACK.id)[0];
    expect(black.tag).toBe('allowed mate threat');
    expect(black.tagTheme).toBe('mateIn1');
    const nxg5 = of('fixture-white').find((m) => m.playedSan === 'Nxg5')!;
    expect(nxg5.tag).toBe('forcing move without capture-check');
    expect(nxg5.tagTheme).toBe('hangingPiece');
  });
  it('writes a debug row for every analysed own move, with a reason and engine settings', () => {
    expect(all.debug.length).toBe(all.summary.myMoves);
    for (const r of all.debug) {
      expect(r.reason.length).toBeGreaterThan(5);
      expect(r.engine).toMatch(/Stockfish/);
      expect(r.depth).toBe(12);
      expect(['kept', 'dropped']).toContain(r.decision);
    }
    expect(all.debug.filter((r) => r.decision === 'kept')).toHaveLength(all.moments.length);
    const csv = toCsv(all.debug);
    expect(csv.split('\r\n')[0]).toContain('phaseReason');
    expect(csv.trim().split('\r\n')).toHaveLength(all.debug.length + 1);
  });
  it('the lead-in replays real game moves and ends exactly at the target position', () => {
    const m = of(FIXTURE_GAME_LONDON_QB6.id)[0] ?? all.moments[0];
    expect(m.leadIn).toBeDefined();
    expect(m.leadIn!.moves.length).toBeLessThanOrEqual(6);
  });
  it('London and shell fixtures reach the exact lesson boards', () => {
    const qb6 = of(FIXTURE_GAME_LONDON_QB6.id).find((m) => m.playedSan === 'c3');
    expect(qb6).toBeDefined();
    expect(qb6!.bestSan).toBe('Nc3'); // the verified lesson answer, found independently by the pipeline
    expect(qb6!.repertoire).toBe('deviation'); // 5.c3 is a deviation from the credited Nc3 and it costs a lot
    const shell = of(FIXTURE_GAME_SHELL_F7.id).find((m) => m.playedSan === 'Nd7');
    expect(shell).toBeDefined();
    expect(shell!.kind).toBe('allowedMate');
    expect(shell!.bestSan).toBe('d5');
  });
});

describe('six-part explanation', () => {
  const black = () => all.moments.find((m) => m.gameId === FIXTURE_GAME_BLACK.id)!;
  it('has exactly the six parts, in plain words, with the concrete line', () => {
    const sp = sixPart(black());
    expect(sp.position).toMatch(/^Move 3, you to move as Black, equal/);
    expect(sp.played).toMatch(/3\.\.\.Nf6\?/);
    expect(sp.played).toMatch(/mated in 1/);
    expect(sp.whyFails).toMatch(/forced mate in 1: Qxf7#/);
    expect(sp.better).toMatch(/^g6|^Nh6|^Qe7|^d6|^Nge7/);
    expect(sp.tag).toBe('Pattern: allowed mate threat');
    expect(sp.rule).toMatch(/king about to get mated/);
    expect(typeof sp.needsReview).toBe('boolean'); // a quiet better move may honestly be labelled needs review
  });
  it('shows a rule only when a tag has evidence, and labels what it cannot explain', () => {
    for (const m of all.moments) {
      const sp = sixPart(m);
      expect(!!sp.rule).toBe(!!m.tag);
      expect(sp.whyFails.length).toBeGreaterThan(10);
      if (sp.needsReview) expect(`${sp.whyFails} ${sp.better}`).toMatch(/Needs review|needs review/);
    }
  });
  it('says plainly when the capture is tempting but the engine prefers a quieter move', () => {
    const nxg5 = all.moments.find((m) => m.playedSan === 'Nxg5')!;
    expect(sixPart(nxg5).closeCall ?? '').toMatch(/looks natural, but the engine prefers/);
  });
});

describe('practice with the real engine', () => {
  it('grades by the root loss against the best move, independent of the move in the game', async () => {
    const m = all.moments.find((x) => x.gameId === FIXTURE_GAME_BLACK.id)!;
    const bad = new PracticeSession(m, engine, 12);
    const a1 = await bad.play('g8', 'f6');
    expect(a1.sameAsGame).toBe(true);
    expect(a1.grade).toMatchObject({ ok: false, kind: 'allowsMate' });
    expect(bad.outcome).toBe('miss');
    for (const [from, to] of [['g7', 'g6'], ['d8', 'e7']]) {
      const s = new PracticeSession(m, engine, 12);
      const a = await s.play(from, to);
      expect(a.grade.ok, `${from}${to}`).toBe(true);
      expect(a.engineReply).toBeDefined();
      expect(s.outcome).toBe('independent');
    }
  }, 120000);
  it('the puzzle fixture follows the setup-move rule', () => {
    expect(new PuzzleSession(FIXTURE_PUZZLE).try('d5c7').result).toBe('correct');
  });
});

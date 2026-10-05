import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { LESSONS, SEEDS } from '../src/curriculum';
import { CONTENT, creditedMovesVerified, engineCheckLines, quizPosition, stepPositions, validateContent } from '../src/curriculum/content';
import { gradeQuizMove } from '../src/quiz';
import { RootGrader } from '../src/grading';
import type { EngineLike, SearchLine } from '../src/engine';

describe('lesson content', () => {
  it('has no structural or legality errors', () => {
    expect(validateContent().filter((i) => i.level === 'error')).toEqual([]);
  });
  it('London foundation and the Black foundation both exist and are built; unsupported lessons stay pending', () => {
    const built = LESSONS.filter((l) => l.contentStatus === 'built').map((l) => l.id);
    expect(built).toContain('london-foundation');
    expect(built).toContain('black-foundation');
    for (const id of ['london-vigilance', 'black-vs-london-flank']) expect(LESSONS.find((l) => l.id === id)!.contentStatus).toBe('pending');
    expect(LESSONS.find((l) => l.id === 'black-standard-pirc')!.contentStatus).toBe('not-grounded');
    expect(CONTENT['black-standard-pirc']).toBeUndefined();
  });
  it('every lesson has a goal, a why, a board in every step, and at least one quiz item with a hint', () => {
    for (const [id, c] of Object.entries(CONTENT)) {
      expect(c.overview.goal.length, id).toBeGreaterThan(10);
      expect(c.overview.why.length, id).toBeGreaterThan(0);
      expect(c.quiz.length, id).toBeGreaterThan(0);
      for (const s of c.steps) {
        const p = stepPositions(s);
        expect(p.fens.length, `${id}/${s.id}`).toBeGreaterThan(0);
        for (const f of p.fens) expect(() => new Chess(f)).not.toThrow();
      }
    }
  });
  it('credits only engine-verified moves, and every quiz seed is verified', () => {
    for (const [id, c] of Object.entries(CONTENT)) for (const q of c.quiz) expect(creditedMovesVerified(q), `${id}/${q.id}`).toMatchObject({ ok: true });
  });
  it('hints and prompts never name the answer', () => {
    for (const [id, c] of Object.entries(CONTENT)) {
      for (const q of c.quiz) {
        for (const a of q.accept) {
          const bare = a.move.replace(/[+#]/g, '');
          const re = new RegExp(`(^|[^A-Za-z0-9])${bare.replace(/[+]/g, '\\+')}([^A-Za-z0-9]|$)`);
          expect(re.test(q.hint), `${id}/${q.id} hint names ${a.move}`).toBe(false);
          expect(re.test(q.prompt), `${id}/${q.id} prompt names ${a.move}`).toBe(false);
        }
      }
    }
  });
  it('quiz boards are oriented to the learner: the side to move is the lesson colour', () => {
    for (const c of Object.values(CONTENT)) for (const q of c.quiz) {
      const p = quizPosition(q);
      expect(new Chess(p.fen).turn()).toBe(p.color);
    }
  });
  it('board facts stated in the text are true on the board', () => {
    // "nothing aims at g1" after castling in the London reference setup
    const s8 = CONTENT['london-foundation'].steps.find((s) => s.id === 's8')!;
    const fen = stepPositions(s8).fens.at(-1)!;
    const c = new Chess(fen);
    for (const sq of ['g1', 'f1', 'h1', 'g2', 'h2']) expect(c.attackers(sq as never, 'b'), sq).toEqual([]);
    // "f7 is attacked twice and defended only by the king" in the Bc4 + Ng5 board
    const f7 = new Chess(quizPosition(CONTENT['black-vs-bc4-ng5'].quiz[0]).fen);
    expect(f7.attackers('f7' as never, 'w')).toHaveLength(2);
    expect(f7.attackers('f7' as never, 'b')).toEqual(['e8']);
    // Bxf7+ Kd8 Ne6# is checkmate
    const m = new Chess(quizPosition(CONTENT['black-vs-bc4-ng5'].quiz[0]).fen);
    ['Nd7', 'Bxf7+', 'Kd8', 'Ne6#'].forEach((x) => m.move(x));
    expect(m.isCheckmate()).toBe(true);
  });
  it('engine-check lines come from the verified report, from the learner\'s point of view', () => {
    const lines = engineCheckLines('L4.qb6');
    expect(lines[0]).toMatch(/^Nc3 \+/);
    expect(engineCheckLines('B2.f7')[0]).toMatch(/^d5 \+/); // Black to move, good for Black is positive
    expect(engineCheckLines('nope')).toEqual([]);
  });
  it('every seed that a lesson references exists', () => {
    for (const l of LESSONS) for (const s of l.seedIds) expect(SEEDS.some((x) => x.id === s), `${l.id} -> ${s}`).toBe(true);
  });
});

/** TEST DOUBLE: scores accepted moves +50, everything else -300. */
const grader = (good: string[]) => {
  const eng: EngineLike = {
    engineName: 'fake',
    async search(fen, _d, o) {
      const c = new Chess(fen);
      const all = c.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
      const pick = (o?.searchmoves ?? all).filter((m) => all.includes(m));
      const lines: SearchLine[] = pick.map((m) => ({ move: m, score: { cp: good.includes(m) ? 50 : -300 }, pv: [m], depth: 1 })).sort((a, b) => (b.score.cp ?? 0) - (a.score.cp ?? 0)).slice(0, o?.multipv ?? 1);
      return { lines, bestmove: lines[0].move, engine: 'fake', depth: 1 };
    },
    async analyse(fen, d) {
      const r = await this.search(fen, d);
      return { score: r.lines[0].score, pv: r.lines[0].pv, bestmove: r.bestmove, depth: 1 };
    },
  };
  return new RootGrader(eng, 1);
};

describe('quiz grading', () => {
  const item = CONTENT['london-foundation'].quiz[0]; // 1.d4 d5: Bf4 is the answer, e3 has a note
  it('credits the lesson answer and says why', async () => {
    const r = await gradeQuizMove(item, 'c1f4', grader(['c1f4', 'e2e3']));
    expect(r).toMatchObject({ verdict: 'answer', credited: true, san: 'Bf4' });
  });
  it('a sound move that is not the lesson idea gets no credit and a pointed note, without revealing the answer', async () => {
    const r = await gradeQuizMove(item, 'e2e3', grader(['c1f4', 'e2e3']));
    expect(r).toMatchObject({ verdict: 'sound-other', credited: false });
    expect(r.message).toMatch(/shuts the c1 bishop/);
    expect(r.message).not.toMatch(/Bf4/);
  });
  it('a losing move is "not yet", with no answer named', async () => {
    const r = await gradeQuizMove(item, 'a2a3', grader(['c1f4']));
    expect(r).toMatchObject({ verdict: 'wrong', credited: false });
    expect(r.message).not.toMatch(/Bf4/);
  });
  it('alternatives are credited separately', async () => {
    const q = CONTENT['black-vs-early-e5'].quiz[0];
    const bg4 = await gradeQuizMove(q, 'c8g4', grader([]));
    expect(bg4).toMatchObject({ verdict: 'alternative', credited: true });
  });
});

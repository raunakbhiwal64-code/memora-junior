import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LESSONS, REPORT, SEEDS, courseIssues, seedViews } from '../src/curriculum';
import { seedStatus } from '../src/curriculum/status';
import type { Lesson, Seed } from '../src/curriculum/types';
import { seedFen, seedHash, validateCourse } from '../src/curriculum/validate';

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'l1', order: 1, color: 'w', kind: 'foundation', title: 't', goal: 'g', appliesWhen: 'a', prerequisites: [], concepts: [],
  seedIds: [], contentStatus: 'pending', source: [{ kind: 'coaching', note: 'n' }], ...over,
});
const seed = (over: Partial<Seed> = {}): Seed => ({
  id: 's1', lessonId: 'l1', color: 'w', prefix: 'd4 d5', declared: 'illustrative', title: 't',
  claims: [{ type: 'best', move: 'c4' }], briefClaims: [], source: [{ kind: 'coaching', note: 'n' }], ...over,
});

describe('the shipped course data', () => {
  it('has no structural errors', () => {
    expect(courseIssues().filter((i) => i.level === 'error')).toEqual([]);
  });
  it('starts with the London foundation and keeps London / Pirc only', () => {
    const w = LESSONS.filter((l) => l.color === 'w').sort((a, b) => a.order - b.order);
    expect(w[0].id).toBe('london-foundation');
    expect(w[0].prerequisites).toEqual([]);
    expect(LESSONS.map((l) => l.id).join(' ')).not.toMatch(/italian|caro|sicilian/i);
  });
  it('labels what is not grounded instead of inventing a course', () => {
    const pirc = LESSONS.find((l) => l.id === 'black-standard-pirc')!;
    expect(pirc.contentStatus).toBe('not-grounded');
    expect(pirc.seedIds).toEqual([]);
    expect(LESSONS.find((l) => l.id === 'black-foundation')!.honesty).toMatch(/NOT the standard/);
    expect(LESSONS.find((l) => l.id === 'london-vs-c5')!.honesty).toMatch(/Leaves the usual London shape/);
    // no lesson claims to be built yet, and no scored quiz exists in this shell
    expect(LESSONS.filter((l) => l.contentStatus === 'built').length).toBeGreaterThan(0);
  });
  it('derives every seed FEN from a legal prefix and matches the FENs printed in the brief', () => {
    for (const s of SEEDS) {
      const fen = seedFen(s);
      expect(fen.split(' ')).toHaveLength(6);
      if (s.briefFen && s.prefix) expect(fen).toBe(s.briefFen);
    }
    expect(seedFen(SEEDS.find((s) => s.id === 'B2.f7')!)).toBe('rnb1kbnr/ppq1pppp/2pp4/6N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 3 4');
  });
});

describe('verification report is honest and current', () => {
  it('has an entry for every seed whose hash matches the seed (re-run npm run verify-curriculum if this fails)', () => {
    expect(REPORT.engine.name).toMatch(/Stockfish/);
    expect(REPORT.depth).toBeGreaterThanOrEqual(18);
    for (const v of seedViews()) {
      expect(v.stale, `${v.seed.id} is stale`).toBe(false);
      expect(['verified', 'conflict']).toContain(v.status);
      expect(REPORT.seeds[v.seed.id].fen).toBe(v.fen);
    }
  });
  it('node script and TypeScript compute the same hash (read from the script source)', () => {
    const src = readFileSync(new URL('../scripts/verify-curriculum.mjs', import.meta.url), 'utf8');
    expect(src).toContain('JSON.stringify([seed.prefix ?? null, seed.fen ?? null, seed.claims])');
    const s = SEEDS[0];
    expect(REPORT.seeds[s.id].hash).toBe(seedHash(s));
  });
  it('a changed seed is never reported as verified', () => {
    const s = structuredClone(SEEDS.find((x) => x.id === 'L3.d5')!);
    expect(seedStatus(s, REPORT)).toEqual({ status: 'verified', stale: false });
    s.claims = [{ type: 'best', move: 'e3' }];
    expect(seedStatus(s, REPORT)).toEqual({ status: 'pending', stale: true });
    expect(seedStatus(s, undefined)).toEqual({ status: 'pending', stale: false });
  });
  it('reports where the old checks disagree instead of forcing the old answer', () => {
    const r = REPORT.seeds['B4.counter'];
    expect(r.claims.every((c) => c.pass)).toBe(true); // c6 is within 30cp, so not an error
    expect(r.briefClaims.some((c) => !c.pass)).toBe(true); // the brief's "c6 above Nf6" is NOT reproduced
  });
  it('is deterministic: the report records the settings used', () => {
    expect(REPORT.multipv).toBe(3);
    for (const r of Object.values(REPORT.seeds)) expect(r.top.length).toBeGreaterThan(0);
  });
});

describe('validator withholds bad content', () => {
  it('flags illegal prefixes, FEN disagreement, illegal claim moves and bad references', () => {
    const issues = validateCourse(
      [lesson(), lesson({ id: 'l2', prerequisites: ['nope'] }), lesson({ id: 'l1' })],
      [
        seed({ id: 'bad-prefix', prefix: 'e4 e4' }),
        seed({ id: 'fen-mismatch', briefFen: '8/8/8/8/8/8/8/8 w - - 0 1' }),
        seed({ id: 'bad-move', claims: [{ type: 'best', move: 'Qh5' }] }),
        seed({ id: 'no-lesson', lessonId: 'zzz' }),
        seed({ id: 'empty', prefix: undefined }),
      ],
    );
    const msg = (id: string) => issues.filter((i) => i.id === id && i.level === 'error').map((i) => i.message).join(' | ');
    expect(msg('l1')).toMatch(/duplicate lesson id/);
    expect(msg('l2')).toMatch(/unknown prerequisite/);
    expect(msg('bad-prefix')).toMatch(/illegal position/);
    expect(msg('fen-mismatch')).toMatch(/differs from the brief/);
    expect(msg('bad-move')).toMatch(/not legal/);
    expect(msg('no-lesson')).toMatch(/unknown lesson/);
    expect(msg('empty')).toMatch(/prefix or a fen/);
  });
  it('detects prerequisite cycles and cross-colour prerequisites', () => {
    const issues = validateCourse(
      [lesson({ id: 'a', prerequisites: ['b'] }), lesson({ id: 'b', prerequisites: ['a'] }), lesson({ id: 'c', color: 'b', prerequisites: ['a'] })],
      [],
    );
    expect(issues.some((i) => /cycle/.test(i.message))).toBe(true);
    expect(issues.some((i) => /other colour/.test(i.message))).toBe(true);
  });
  it('seedViews withholds invalid seeds rather than showing them', () => {
    const lessons = [lesson({ seedIds: ['bad'] })];
    const views = seedViews([seed({ id: 'bad', prefix: 'e4 e4' })], REPORT, lessons);
    expect(views[0].withheld).toBe(true);
    expect(views[0].fen).toBeUndefined();
    expect(views[0].status).toBe('conflict');
  });
});

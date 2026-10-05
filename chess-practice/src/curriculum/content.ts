import { Chess } from 'chess.js';
import contentJson from './content.json';
import { REPORT, SEEDS, LESSONS } from './index';
import { seedFen } from './validate';
import type { Claim, Seed, VerificationReport } from './types';
import type { Color } from '../types';

export interface Step {
  id: string;
  title: string;
  text: string[];
  /** SAN moves from the start position (the board shows the position AFTER them). Or a FEN. */
  prefix?: string;
  fen?: string;
  /** How many of the last plies of `prefix` can be stepped through with the arrows. */
  animate: number;
  arrows?: { from: string; to: string; kind: 'idea' | 'alt' }[];
  /** Show the engine's verified numbers for this seed under the board. */
  engineSeed?: string;
  links?: { lessonId: string; label: string }[];
}

export interface QuizAccept {
  move: string;
  kind: 'answer' | 'alternative';
  why: string;
}

export interface QuizItem {
  id: string;
  seedId: string;
  prompt: string;
  /** A non-answer hint. */
  hint: string;
  /** Moves credited as correct. Each must be engine-verified by its seed. */
  accept: QuizAccept[];
  /** Notes for specific moves that are sound or wrong but not the idea being practised. */
  notes: Record<string, string>;
  explanation: string[];
}

export interface LessonContent {
  overview: { goal: string; applies: string; why: string[] };
  steps: Step[];
  quiz: QuizItem[];
}

export const CONTENT = contentJson as unknown as Record<string, LessonContent>;

export const contentFor = (lessonId: string): LessonContent | undefined => CONTENT[lessonId];

/** The legal position (and plies leading to it) a step shows. */
export function stepPositions(step: Pick<Step, 'prefix' | 'fen' | 'animate'>): { fens: string[]; sans: string[]; lastMoves: ({ from: string; to: string } | undefined)[] } {
  if (step.fen) return { fens: [new Chess(step.fen).fen()], sans: [], lastMoves: [undefined] };
  const moves = (step.prefix ?? '').split(/\s+/).filter(Boolean);
  const c = new Chess();
  const fens: string[] = [c.fen()];
  const lastMoves: ({ from: string; to: string } | undefined)[] = [undefined];
  const sans: string[] = [];
  for (const m of moves) {
    const mv = c.move(m);
    fens.push(c.fen());
    sans.push(mv.san);
    lastMoves.push({ from: mv.from, to: mv.to });
  }
  const keep = Math.min(moves.length, Math.max(0, step.animate));
  const startIdx = moves.length - keep;
  return { fens: fens.slice(startIdx), sans: sans.slice(startIdx), lastMoves: lastMoves.slice(startIdx) };
}

export interface QuizPosition {
  fen: string;
  color: Color;
  seed: Seed;
}

/** The exact board of a quiz item (from its verified seed). */
export function quizPosition(item: QuizItem): QuizPosition {
  const seed = SEEDS.find((s) => s.id === item.seedId)!;
  return { fen: seedFen(seed), color: seed.color, seed };
}

/** Is every move this quiz credits backed by the engine claims of its seed? */
export function creditedMovesVerified(item: QuizItem, report: VerificationReport = REPORT): { ok: boolean; unverified: string[] } {
  const seed = SEEDS.find((s) => s.id === item.seedId);
  const r = report.seeds[item.seedId];
  if (!seed || !r || r.status !== 'verified') return { ok: false, unverified: item.accept.map((a) => a.move) };
  const supported = new Set<string>();
  for (const c of seed.claims as Claim[]) {
    if (c.type === 'withinCp') c.moves.forEach((m) => supported.add(m));
    else if (c.type === 'best' || c.type === 'inTop' || c.type === 'scoreAtLeast') supported.add(c.move);
  }
  const unverified = item.accept.map((a) => a.move).filter((m) => !supported.has(m));
  return { ok: unverified.length === 0, unverified };
}

export interface Issue {
  level: 'error' | 'warning';
  id: string;
  message: string;
}

/** Structural and legality checks on lesson content. */
export function validateContent(content: Record<string, LessonContent> = CONTENT): Issue[] {
  const issues: Issue[] = [];
  const err = (id: string, message: string) => issues.push({ level: 'error', id, message });
  const lessonIds = new Set(LESSONS.map((l) => l.id));
  for (const [lid, c] of Object.entries(content)) {
    if (!lessonIds.has(lid)) err(lid, 'content for an unknown lesson');
    const seen = new Set<string>();
    for (const s of c.steps) {
      if (seen.has(s.id)) err(`${lid}/${s.id}`, 'duplicate step id');
      seen.add(s.id);
      try {
        stepPositions(s);
      } catch (e) {
        err(`${lid}/${s.id}`, `illegal step position: ${(e as Error).message}`);
      }
      if (s.engineSeed && !SEEDS.some((x) => x.id === s.engineSeed)) err(`${lid}/${s.id}`, `unknown engine seed "${s.engineSeed}"`);
      for (const l of s.links ?? []) if (!lessonIds.has(l.lessonId)) err(`${lid}/${s.id}`, `link to unknown lesson "${l.lessonId}"`);
      for (const a of s.arrows ?? []) if (!/^[a-h][1-8]$/.test(a.from) || !/^[a-h][1-8]$/.test(a.to)) err(`${lid}/${s.id}`, 'bad arrow square');
      if (!s.text.length) err(`${lid}/${s.id}`, 'a step needs text');
    }
    const qids = new Set<string>();
    for (const q of c.quiz) {
      const id = `${lid}/${q.id}`;
      if (qids.has(q.id)) err(id, 'duplicate quiz id');
      qids.add(q.id);
      const seed = SEEDS.find((s) => s.id === q.seedId);
      if (!seed) {
        err(id, `unknown seed "${q.seedId}"`);
        continue;
      }
      let legal: Set<string>;
      try {
        legal = new Set(new Chess(seedFen(seed)).moves());
      } catch (e) {
        err(id, `illegal position: ${(e as Error).message}`);
        continue;
      }
      if (!q.accept.length) err(id, 'a quiz item needs at least one accepted move');
      for (const a of q.accept) if (!legal.has(a.move)) err(id, `accepted move "${a.move}" is not legal`);
      for (const m of Object.keys(q.notes)) if (!legal.has(m)) err(id, `note for illegal move "${m}"`);
      const v = creditedMovesVerified(q);
      if (!v.ok) err(id, `credited move(s) not backed by the seed's engine claims: ${v.unverified.join(', ')}`);
      if (!q.hint) err(id, 'a quiz item needs a hint');
    }
  }
  return issues;
}

/** The verified engine numbers for a seed, in the LEARNER's point of view, as short readable lines. */
export function engineCheckLines(seedId: string, report: VerificationReport = REPORT): string[] {
  const seed = SEEDS.find((s) => s.id === seedId);
  const r = report.seeds[seedId];
  if (!seed || !r) return [];
  const flip = r.sideToMove !== seed.color;
  const fmt = (o: { cp?: number; mate?: number }) => {
    if (o.mate !== undefined) return `mate ${flip ? -o.mate : o.mate}`;
    const v = ((flip ? -(o.cp ?? 0) : o.cp ?? 0) / 100).toFixed(2);
    return Number(v) > 0 ? `+${v}` : v;
  };
  return r.top.map((t) => `${t.move} ${fmt(t)}`);
}

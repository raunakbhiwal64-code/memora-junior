import { Chess } from 'chess.js';
import type { Claim, Lesson, Seed } from './types';

export interface Issue {
  level: 'error' | 'warning';
  id: string;
  message: string;
}

/** FEN of a seed, built from its legal SAN prefix (or the given FEN). Throws if illegal. */
export function seedFen(seed: Pick<Seed, 'prefix' | 'fen'>): string {
  if (seed.fen) {
    const c = new Chess(seed.fen); // throws on an invalid FEN
    return c.fen();
  }
  const c = new Chess();
  for (const m of (seed.prefix ?? '').split(/\s+/).filter(Boolean)) c.move(m);
  return c.fen();
}

export function claimMoves(c: Claim): string[] {
  switch (c.type) {
    case 'best':
    case 'inTop':
    case 'worseThanBestBy':
    case 'allowsMate':
      return [c.move];
    case 'withinCp':
      return c.moves;
    case 'betterThan':
      return [c.move, c.than];
    default:
      return [];
  }
}

/** FNV-1a hash of what a verification depends on, so a changed seed is never reported as verified. */
export function seedHash(seed: Pick<Seed, 'prefix' | 'fen' | 'claims'>): string {
  const text = JSON.stringify([seed.prefix ?? null, seed.fen ?? null, seed.claims]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Structural checks on the whole course. Errors mean the content must be withheld. */
export function validateCourse(lessons: Lesson[], seeds: Seed[]): Issue[] {
  const issues: Issue[] = [];
  const err = (id: string, message: string) => issues.push({ level: 'error', id, message });
  const warn = (id: string, message: string) => issues.push({ level: 'warning', id, message });

  const lessonIds = new Set<string>();
  for (const l of lessons) {
    if (lessonIds.has(l.id)) err(l.id, 'duplicate lesson id');
    lessonIds.add(l.id);
  }
  const seedIds = new Set<string>();
  for (const s of seeds) {
    if (seedIds.has(s.id)) err(s.id, 'duplicate seed id');
    seedIds.add(s.id);
  }

  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const l of lessons) {
    for (const p of l.prerequisites) {
      const pl = byId.get(p);
      if (!pl) err(l.id, `unknown prerequisite "${p}"`);
      else if (pl.color !== l.color) err(l.id, `prerequisite "${p}" is for the other colour`);
    }
    for (const sid of l.seedIds) if (!seedIds.has(sid)) err(l.id, `unknown seed "${sid}"`);
    if (l.contentStatus === 'not-grounded' && !l.notGrounded && !l.honesty) warn(l.id, 'not-grounded lesson has no explanation');
    if (!l.source.length) warn(l.id, 'lesson has no source');
  }
  // prerequisite cycles
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): boolean => {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const cyc = (byId.get(id)?.prerequisites ?? []).some((p) => byId.has(p) && visit(p));
    visiting.delete(id);
    done.add(id);
    return cyc;
  };
  for (const l of lessons) if (visit(l.id)) err(l.id, 'prerequisite cycle');

  for (const s of seeds) {
    if (!lessonIds.has(s.lessonId)) err(s.id, `unknown lesson "${s.lessonId}"`);
    else if (!byId.get(s.lessonId)!.seedIds.includes(s.id)) warn(s.id, 'seed is not listed by its lesson');
    if (!s.prefix && !s.fen) {
      err(s.id, 'needs a prefix or a fen');
      continue;
    }
    let fen: string;
    try {
      fen = seedFen(s);
    } catch (e) {
      err(s.id, `illegal position: ${(e as Error).message}`);
      continue;
    }
    if (s.briefFen && s.prefix && fen !== s.briefFen) err(s.id, `FEN from the prefix differs from the brief's FEN (${fen})`);
    if (!s.claims.length) warn(s.id, 'no claims to verify');
    const legal = new Set(new Chess(fen).moves());
    for (const c of [...s.claims, ...s.briefClaims]) {
      for (const m of claimMoves(c)) if (!legal.has(m)) err(s.id, `claim move "${m}" is not legal in the position`);
    }
    if (!s.source.length) warn(s.id, 'seed has no source');
  }
  return issues;
}

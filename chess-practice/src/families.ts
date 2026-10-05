import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { SEEDS } from './curriculum';
import { seedFen } from './curriculum/validate';
import { parseGame } from './pgn';
import type { GameInfo, Moment } from './types';

/** Position key: piece placement, side to move, castling, en passant (move counters ignored), so transpositions match. */
export const posKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

type Test = (c: Chess, ply: number) => boolean;
const has = (c: Chess, s: string, color: Color, type: PieceSymbol) => {
  const p = c.get(s as Square);
  return !!p && p.color === color && p.type === type;
};

export interface Family {
  /** The lesson this family belongs to. */
  lessonId: string;
  color: Color;
  label: string;
  /** Latest ply (0-based, after the move) at which the structure still counts. */
  maxPly: number;
  test: Test;
}

const london: Test = (c) => has(c, 'f4', 'w', 'b') && has(c, 'd4', 'w', 'p') && has(c, 'e3', 'w', 'p');

/** Family detectors work on piece placement, so they match transpositions and not just move text. */
export const FAMILIES: Family[] = [
  { lessonId: 'london-foundation', color: 'w', label: 'London setup (bishop on f4 with d4 and e3)', maxPly: 14, test: london },
  { lessonId: 'london-bishop-choices', color: 'w', label: '…Bf5 or …Nh5 against your London bishop', maxPly: 14, test: (c, ply) => london(c, ply) || false },
  { lessonId: 'london-vs-c5', color: 'w', label: 'Early …c5', maxPly: 9, test: (c) => has(c, 'c5', 'b', 'p') && !has(c, 'c7', 'b', 'p') && has(c, 'd4', 'w', 'p') },
  { lessonId: 'london-vs-qb6', color: 'w', label: '…Qb6 against the London', maxPly: 14, test: (c) => has(c, 'b6', 'b', 'q') && has(c, 'd4', 'w', 'p') },
  { lessonId: 'london-vs-flank-starts', color: 'w', label: 'Flank start (1…g6 or 1…b6)', maxPly: 1, test: (c, ply) => ply === 1 && has(c, 'd4', 'w', 'p') && ((has(c, 'g6', 'b', 'p') && !has(c, 'g7', 'b', 'p')) || (has(c, 'b6', 'b', 'p') && !has(c, 'b7', 'b', 'p'))) },
  { lessonId: 'black-foundation', color: 'b', label: 'Historical shell (…d6 and …c6)', maxPly: 9, test: (c) => has(c, 'd6', 'b', 'p') && has(c, 'c6', 'b', 'p') && !has(c, 'd7', 'b', 'p') && !has(c, 'c7', 'b', 'p') },
  { lessonId: 'black-vs-bc4-ng5', color: 'b', label: 'Bc4 + Ng5 against f7', maxPly: 12, test: (c) => has(c, 'c4', 'w', 'b') && has(c, 'g5', 'w', 'n') && has(c, 'f7', 'b', 'p') && c.turn() === 'b' },
  { lessonId: 'black-vs-early-e5', color: 'b', label: 'Early e5 push', maxPly: 8, test: (c) => has(c, 'e5', 'w', 'p') && has(c, 'd6', 'b', 'p') },
  { lessonId: 'black-locked-centre', color: 'b', label: 'Locked centre (pawns d5/e4 against e5)', maxPly: 30, test: (c) => has(c, 'd5', 'w', 'p') && has(c, 'e4', 'w', 'p') && has(c, 'e5', 'b', 'p') },
];

/** Exact anchor positions taken from the seeds (the user's own game boards). */
const anchors = (lessonId: string): string[] => SEEDS.filter((s) => s.lessonId === lessonId).map((s) => posKey(seedFen(s)));

export interface FamilyMatch {
  lessonId: string;
  /** 0-based ply of the first matching position. */
  ply: number;
  /** True when the position equals an exact seed board (a position taken from your own games). */
  exact: boolean;
}

/** All lessons whose family or exact board this game reaches. */
export function matchGame(game: GameInfo): FamilyMatch[] {
  let moves;
  try {
    moves = parseGame(game.pgn).moves;
  } catch {
    return [];
  }
  const c = new Chess();
  const out = new Map<string, FamilyMatch>();
  const anchorKeys = new Map<string, string[]>();
  for (const f of FAMILIES) anchorKeys.set(f.lessonId, anchors(f.lessonId));
  let hasLondon = false;
  moves.forEach((m, ply) => {
    c.move(m.san);
    const key = posKey(c.fen());
    if (game.myColor === 'w' && ply <= 14 && london(c, ply)) hasLondon = true;
    for (const f of FAMILIES) {
      if (f.color !== game.myColor) continue;
      if (out.has(f.lessonId) && out.get(f.lessonId)!.exact) continue;
      const exact = (anchorKeys.get(f.lessonId) ?? []).includes(key);
      let hit = false;
      if (ply <= f.maxPly) {
        if (f.lessonId === 'london-bishop-choices') hit = hasLondon && (has(c, 'f5', 'b', 'b') || has(c, 'h5', 'b', 'n')) && ply <= 12;
        else if (f.lessonId === 'london-vs-c5' || f.lessonId === 'london-vs-qb6') hit = hasLondon && f.test(c, ply);
        else hit = f.test(c, ply);
      }
      if (f.lessonId === 'london-foundation' && hit) hasLondon = true;
      if (exact || (hit && !out.has(f.lessonId))) out.set(f.lessonId, { lessonId: f.lessonId, ply, exact: exact || (out.get(f.lessonId)?.exact ?? false) });
    }
  });
  return [...out.values()];
}

export interface ResponseStat {
  lessonId: string;
  label: string;
  /** Games that match this family. */
  count: number;
  /** Games in the sample that this is counted against (all of the learner's games of that colour that reach the base setup). */
  of: number;
  games: string[];
  windowStart: number;
  windowEnd: number;
  /** Games from an exact seed board (your own games, exact position). */
  exactGames: string[];
}

/** Recomputed from the CURRENT imported games every time; never hard-coded. */
export function responseStats(games: GameInfo[]): { stats: ResponseStat[]; sample: { games: number; windowStart: number; windowEnd: number } } {
  const dates = games.map((g) => g.endTime).filter((d) => d > 0);
  const per = new Map<string, FamilyMatch[]>();
  for (const g of games) per.set(g.id, matchGame(g));
  const baseOf = (lessonId: string) => {
    const base = lessonId.startsWith('london') ? 'london-foundation' : lessonId.startsWith('black') ? 'black-foundation' : lessonId;
    return games.filter((g) => per.get(g.id)!.some((m) => m.lessonId === base));
  };
  const stats: ResponseStat[] = FAMILIES.map((f) => {
    const baseGames = baseOf(f.lessonId);
    const matched = games.filter((g) => per.get(g.id)!.some((m) => m.lessonId === f.lessonId));
    const ds = matched.map((g) => g.endTime).filter((d) => d > 0);
    return {
      lessonId: f.lessonId,
      label: f.label,
      count: matched.length,
      of: f.lessonId === 'london-foundation' || f.lessonId === 'black-foundation' ? games.filter((g) => g.myColor === f.color).length : baseGames.length,
      games: matched.map((g) => g.id),
      windowStart: ds.length ? Math.min(...ds) : 0,
      windowEnd: ds.length ? Math.max(...ds) : 0,
      exactGames: matched.filter((g) => per.get(g.id)!.find((m) => m.lessonId === f.lessonId)?.exact).map((g) => g.id),
    };
  });
  return { stats, sample: { games: games.length, windowStart: dates.length ? Math.min(...dates) : 0, windowEnd: dates.length ? Math.max(...dates) : 0 } };
}

export interface LessonLink {
  games: { game: GameInfo; ply: number; exact: boolean }[];
  /** Real mistakes from those games close to the lesson's position (opening-phase or soon after it). */
  moments: Moment[];
}

export function linkLesson(lessonId: string, games: GameInfo[], moments: Moment[]): LessonLink {
  const matched = games
    .map((game) => ({ game, m: matchGame(game).find((x) => x.lessonId === lessonId) }))
    .filter((x): x is { game: GameInfo; m: FamilyMatch } => !!x.m)
    .map((x) => ({ game: x.game, ply: x.m.ply, exact: x.m.exact }));
  const ids = new Map(matched.map((m) => [m.game.id, m.ply]));
  const related = moments.filter((mo) => ids.has(mo.gameId) && (mo.phase === 'opening' || mo.ply <= (ids.get(mo.gameId) ?? 0) + 12));
  return { games: matched, moments: related };
}

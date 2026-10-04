import { Chess } from 'chess.js';
import { cacheGet, cacheSet } from './cache';
import type { EngineLike } from './engine';
import { legalPrefix, lineToSan, parseGame, uci } from './pgn';
import { classifyLoss, isMeaningful, toMine, type LossResult } from './score';
import type { Color, GameInfo, Moment, Score } from './types';

export interface AnalysisOptions {
  depth: number;
  recheckDepth: number;
  thresholdCp: number;
  maxMoments: number;
  finalists: number;
}

export const DEFAULTS: AnalysisOptions = { depth: 12, recheckDepth: 16, thresholdCp: 100, maxMoments: 3, finalists: 6 };

interface Candidate extends Moment {
  rank: number;
}

export type Progress = (done: number, total: number, label: string) => void;

function myPlies(moves: { color: Color }[], mine: Color): number[] {
  return moves.map((m, i) => (m.color === mine ? i : -1)).filter((i) => i >= 0);
}

/** Evaluate one of my moves: before/after at the same depth, scores in my view. */
async function evaluateMove(
  engine: EngineLike,
  fenBefore: string,
  played: { from: string; to: string; promotion?: string },
  mine: Color,
  depth: number,
) {
  const evBefore = await engine.analyse(fenBefore, depth);
  const before = toMine(evBefore.score, mine, mine);
  const playedUci = uci(played);
  const c = new Chess(fenBefore);
  c.move({ from: played.from, to: played.to, promotion: played.promotion });
  const fenAfter = c.fen();
  if (playedUci === evBefore.bestmove) {
    return { evBefore, before, after: before, fenAfter, refutation: [] as string[], result: { kind: 'none', loss: 0 } as LossResult };
  }
  const evAfter = await engine.analyse(fenAfter, depth);
  const after = toMine(evAfter.score, mine === 'w' ? 'b' : 'w', mine);
  return { evBefore, before, after, fenAfter, refutation: evAfter.pv, result: classifyLoss(before, after) };
}

/** Analyse every one of my moves in one game (pass 1). Cached per game + depth. */
export async function scanGame(
  game: GameInfo,
  engine: EngineLike,
  opts: AnalysisOptions,
  onMove: () => void,
  signal?: AbortSignal,
): Promise<Candidate[]> {
  const key = `scan:${game.id}:${game.myColor}:${opts.depth}:${opts.thresholdCp}`;
  const { moves } = parseGame(game.pgn);
  const plies = myPlies(moves, game.myColor);
  const cached = cacheGet<Candidate[]>(key);
  if (cached) {
    plies.forEach(onMove);
    return cached;
  }
  const out: Candidate[] = [];
  for (const ply of plies) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const m = moves[ply];
    const r = await evaluateMove(engine, m.before, m, game.myColor, opts.depth);
    onMove();
    if (r.result.kind === 'none' || !isMeaningful(r.result, opts.thresholdCp)) continue;
    out.push(buildMoment(game, moves, ply, r, opts.depth));
  }
  cacheSet(key, out);
  return out;
}

function buildMoment(
  game: GameInfo,
  moves: ReturnType<typeof parseGame>['moves'],
  ply: number,
  r: Awaited<ReturnType<typeof evaluateMove>>,
  _depth: number,
): Candidate {
  const m = moves[ply];
  const fen = m.before;
  const bestLine = legalPrefix(fen, r.evBefore.pv, 6);
  const afterFen = r.fenAfter;
  const refutation = legalPrefix(afterFen, r.refutation, 5);
  const prev = ply > 0 ? moves[ply - 1] : undefined;
  return {
    gameId: game.id,
    gameUrl: game.url,
    opponent: game.opponent,
    myColor: game.myColor,
    ply,
    moveNumber: Math.floor(ply / 2) + 1,
    fen,
    playedUci: uci(m),
    playedSan: m.san,
    bestUci: r.evBefore.bestmove,
    bestSan: lineToSan(fen, [r.evBefore.bestmove])[0] ?? r.evBefore.bestmove,
    bestLine,
    refutation,
    before: r.before,
    after: r.after,
    loss: r.result.loss,
    kind: r.result.kind as Moment['kind'],
    lastMove: prev ? { from: prev.from, to: prev.to } : undefined,
    isFixture: game.isFixture,
    rank: r.result.loss,
  };
}

/** Re-run the finalists at a stronger depth and keep those that still qualify. */
async function recheck(
  c: Candidate,
  game: GameInfo,
  engine: EngineLike,
  opts: AnalysisOptions,
): Promise<Candidate | null> {
  const { moves } = parseGame(game.pgn);
  const m = moves[c.ply];
  const r = await evaluateMove(engine, m.before, m, game.myColor, opts.recheckDepth);
  if (!isMeaningful(r.result, opts.thresholdCp)) return null;
  return buildMoment(game, moves, c.ply, r, opts.recheckDepth);
}

/** Pick up to `max` moments: best per game first, then fill with moves far apart. */
export function pickDistinct(cands: Candidate[], max: number): Candidate[] {
  const sorted = [...cands].sort((a, b) => b.rank - a.rank);
  const picked: Candidate[] = [];
  const seenGames = new Set<string>();
  for (const c of sorted) {
    if (picked.length >= max) break;
    if (!seenGames.has(c.gameId)) {
      picked.push(c);
      seenGames.add(c.gameId);
    }
  }
  for (const c of sorted) {
    if (picked.length >= max) break;
    if (picked.includes(c)) continue;
    const near = picked.some((p) => p.gameId === c.gameId && Math.abs(p.ply - c.ply) < 10);
    if (!near) picked.push(c);
  }
  return picked.sort((a, b) => b.rank - a.rank);
}

export async function findMoments(
  games: GameInfo[],
  engine: EngineLike,
  opts: AnalysisOptions = DEFAULTS,
  onProgress: Progress = () => {},
  signal?: AbortSignal,
): Promise<Moment[]> {
  const total = games.reduce((n, g) => n + myPlies(parseGame(g.pgn).moves, g.myColor).length, 0);
  let done = 0;
  const all: Candidate[] = [];
  for (const [i, g] of games.entries()) {
    const label = `Game ${i + 1} of ${games.length} vs ${g.opponent}`;
    onProgress(done, total, label);
    const found = await scanGame(g, engine, opts, () => onProgress(++done, total, label), signal);
    all.push(...found);
  }
  const top = [...all].sort((a, b) => b.rank - a.rank).slice(0, opts.finalists);
  const rechecked: Candidate[] = [];
  for (const [i, c] of top.entries()) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    onProgress(total, total, `Double-checking candidate ${i + 1} of ${top.length} at a deeper search`);
    const g = games.find((x) => x.id === c.gameId)!;
    const r = await recheck(c, g, engine, opts);
    if (r) rechecked.push(r);
  }
  return pickDistinct(rechecked, opts.maxMoments).map(({ rank: _r, ...m }) => m);
}

export type { Score };

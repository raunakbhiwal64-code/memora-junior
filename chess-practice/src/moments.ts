import { Chess } from 'chess.js';
import { cacheGet, cacheSet } from './cache';
import type { EngineLike } from './engine';
import { phaseOf, PHASES } from './phase';
import { legalPrefix, lineToSan, parseGame, uci } from './pgn';
import { capped, classifyLoss, isMateFor, isMeaningful, toMine, type LossResult } from './score';
import type { Color, GameInfo, Moment, MomentKind, Score } from './types';

export interface AnalysisOptions {
  depth: number;
  recheckDepth: number;
  /** A single move that loses at least this much (centipawns) is a mistake worth teaching. */
  thresholdCp: number;
  /** Most positions kept PER PHASE (opening / middle game / end game). */
  maxMoments: number;
  /** Candidates re-checked at the stronger depth PER PHASE. */
  finalists: number;
  /**
   * Mistakes made when you were ALREADY this much worse (centipawns, my view) are skipped:
   * the game was already going badly, so they are damage control, not the cause.
   */
  alreadyWorseCp: number;
  /** A smaller drop still counts when it is the move that tipped you from "not worse" to "clearly worse". */
  tippingMinLossCp: number;
}

export const DEFAULTS: AnalysisOptions = {
  depth: 12,
  recheckDepth: 16,
  thresholdCp: 100,
  maxMoments: 3,
  finalists: 4,
  alreadyWorseCp: -150,
  tippingMinLossCp: 50,
};

/** Compact record of one of my moves from the first pass. */
export interface Scan {
  gameId: string;
  ply: number;
  /** Position before my move. */
  fen: string;
  before: Score;
  after: Score;
  kind: MomentKind | 'none';
  loss: number;
}

interface Candidate extends Scan {
  /** Higher = taught first. */
  rank: number;
  /** The earliest teachable mistake of its game: where the slide began. */
  first: boolean;
}

export type Progress = (done: number, total: number, label: string) => void;

/** A big bonus for the first teachable mistake of a game, so the cause is taught before the damage. */
const FIRST_BONUS = 300;

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

/**
 * Is this move worth a lesson? Only if I was NOT already clearly worse, and either it lost
 * a meaningful amount, or it tipped me from "not worse" to "clearly worse".
 */
export function isTeachable(s: Pick<Scan, 'before' | 'after' | 'kind' | 'loss'>, opts: AnalysisOptions): boolean {
  if (s.kind === 'none') return false;
  if (capped(s.before) <= opts.alreadyWorseCp && !isMateFor(s.before)) return false;
  if (isMeaningful({ kind: s.kind, loss: s.loss }, opts.thresholdCp)) return true;
  return (
    s.kind === 'cp' && capped(s.after) <= opts.alreadyWorseCp && s.loss >= opts.tippingMinLossCp
  );
}

/** Analyse every one of my moves in one game (pass 1). Cached per game + depth. */
export async function scanGame(
  game: GameInfo,
  engine: EngineLike,
  opts: AnalysisOptions,
  onMove: () => void,
  signal?: AbortSignal,
): Promise<Scan[]> {
  const key = `scan2:${game.id}:${game.myColor}:${opts.depth}`;
  const { moves } = parseGame(game.pgn);
  const plies = myPlies(moves, game.myColor);
  const cached = cacheGet<Scan[]>(key);
  if (cached) {
    plies.forEach(onMove);
    return cached;
  }
  const out: Scan[] = [];
  for (const ply of plies) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const m = moves[ply];
    const r = await evaluateMove(engine, m.before, m, game.myColor, opts.depth);
    onMove();
    out.push({ gameId: game.id, ply, fen: m.before, before: r.before, after: r.after, kind: r.result.kind, loss: r.result.loss });
  }
  cacheSet(key, out);
  return out;
}

/** Teachable moves of one game, with the earliest one marked as where the slide began. */
export function candidatesOf(scans: Scan[], opts: AnalysisOptions): Candidate[] {
  const list = scans.filter((s) => isTeachable(s, opts)).sort((a, b) => a.ply - b.ply);
  return list.map((s, i) => ({ ...s, first: i === 0, rank: s.loss + (i === 0 ? FIRST_BONUS : 0) }));
}

function buildMoment(
  game: GameInfo,
  moves: ReturnType<typeof parseGame>['moves'],
  ply: number,
  r: Awaited<ReturnType<typeof evaluateMove>>,
): Moment {
  const m = moves[ply];
  const fen = m.before;
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
    bestLine: legalPrefix(fen, r.evBefore.pv, 6),
    refutation: legalPrefix(r.fenAfter, r.refutation, 5),
    before: r.before,
    after: r.after,
    loss: r.result.loss,
    kind: r.result.kind as MomentKind,
    lastMove: prev ? { from: prev.from, to: prev.to } : undefined,
    phase: phaseOf(fen),
    isFixture: game.isFixture,
  };
}

/** Re-run a finalist at a stronger depth; keep it only if it is still teachable. */
async function recheck(c: Candidate, game: GameInfo, engine: EngineLike, opts: AnalysisOptions) {
  const { moves } = parseGame(game.pgn);
  const m = moves[c.ply];
  const r = await evaluateMove(engine, m.before, m, game.myColor, opts.recheckDepth);
  const scan = { before: r.before, after: r.after, kind: r.result.kind, loss: r.result.loss };
  if (!isTeachable(scan, opts)) return null;
  return { moment: buildMoment(game, moves, c.ply, r), rank: r.result.loss + (c.first ? FIRST_BONUS : 0), first: c.first };
}

interface Ranked {
  moment: Moment;
  rank: number;
  first: boolean;
}

/** Pick up to `max`: the best per game first, then fill with moves far apart. */
export function pickDistinct(cands: Ranked[], max: number): Ranked[] {
  const sorted = [...cands].sort((a, b) => b.rank - a.rank);
  const picked: Ranked[] = [];
  const seenGames = new Set<string>();
  for (const c of sorted) {
    if (picked.length >= max) break;
    if (!seenGames.has(c.moment.gameId)) {
      picked.push(c);
      seenGames.add(c.moment.gameId);
    }
  }
  for (const c of sorted) {
    if (picked.length >= max) break;
    if (picked.includes(c)) continue;
    const near = picked.some((p) => p.moment.gameId === c.moment.gameId && Math.abs(p.moment.ply - c.moment.ply) < 10);
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
    const scans = await scanGame(g, engine, opts, () => onProgress(++done, total, label), signal);
    all.push(...candidatesOf(scans, opts));
  }
  // Each phase gets its own shortlist, so a path is only ever filled with real mistakes from that phase.
  const shortlists = PHASES.map(({ id }) =>
    all
      .filter((c) => phaseOf(c.fen) === id)
      .sort((x, y) => y.rank - x.rank)
      .slice(0, opts.finalists),
  );
  const totalChecks = shortlists.reduce((n, l) => n + l.length, 0);
  let checked = 0;
  const picked: Ranked[] = [];
  for (const list of shortlists) {
    const rechecked: Ranked[] = [];
    for (const c of list) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      onProgress(total, total, `Double-checking candidate ${++checked} of ${totalChecks} at a deeper search`);
      const g = games.find((x) => x.id === c.gameId)!;
      const r = await recheck(c, g, engine, opts);
      if (r) rechecked.push(r);
    }
    picked.push(...pickDistinct(rechecked, opts.maxMoments));
  }
  return picked.map((p) => p.moment);
}

export type { Score };

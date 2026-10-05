import { Chess } from 'chess.js';
import { cacheGet, cacheSet } from './cache';
import { DEBUG_COLUMNS, type DebugRow } from './debug';
import type { EngineLike } from './engine';
import { playLine } from './facts';
import { PHASE_THRESHOLDS, REPERTOIRE_DEVIATION_CP, classifyPhase, type Phase } from './phase';
import { legalPrefix, lineToSan, parseGame, uci } from './pgn';
import { compareRoot, formatScore, toMine } from './score';
import { tagMoment } from './tags';
import type { AltMove, Color, GameInfo, Moment, MomentKind, Score } from './types';

export interface AnalysisOptions {
  depth: number;
  recheckDepth: number;
  multipv: number;
  /** Skip moves made when I was already this much worse before the move (centipawns, my view). */
  alreadyLostCp: number;
  /** Skip moves from a clearly winning position (before above this) when the played move is still clearly winning (above `stillWinningAfterCp`). */
  stillWinningBeforeCp: number;
  stillWinningAfterCp: number;
  maxPerGame: number;
  /** Most candidates re-checked at the stronger depth per game. */
  recheckMax: number;
  thresholds: Record<Phase, number>;
  repertoireDeviationCp: number;
}

export const DEFAULTS: AnalysisOptions = {
  depth: 12,
  recheckDepth: 16,
  multipv: 3,
  alreadyLostCp: -300,
  stillWinningBeforeCp: 500,
  stillWinningAfterCp: 300,
  maxPerGame: 3,
  recheckMax: 6,
  thresholds: PHASE_THRESHOLDS,
  repertoireDeviationCp: REPERTOIRE_DEVIATION_CP,
};

export type RepertoireCheck = (fen: string, san: string, color: Color) => 'in-repertoire' | 'deviation' | 'unknown';

/** One of my moves, searched at the root. Scores are in MY point of view. */
export interface Scan {
  gameId: string;
  ply: number;
  moveNumber: number;
  color: Color;
  /** Position before my move. */
  fen: string;
  san: string;
  uci: string;
  best: { uci: string; san: string; score: Score; pv: string[] };
  /** Other MultiPV root moves (not the best). */
  alts: AltMove[];
  played: { score: Score; pv: string[]; inTopLines: boolean };
  kind: MomentKind | 'none';
  loss: number;
  urgency: number;
  winningCollapse: boolean;
  engine: string;
  depth: number;
}

export type Progress = (done: number, total: number, label: string) => void;

const myPlies = (moves: { color: Color }[], mine: Color) => moves.map((m, i) => (m.color === mine ? i : -1)).filter((i) => i >= 0);

/** Search one of my moves: best root move + the move I played, same root, same depth, same settings. */
export async function evaluateMove(
  engine: EngineLike,
  fen: string,
  played: { from: string; to: string; promotion?: string },
  mine: Color,
  depth: number,
  multipv: number,
): Promise<Omit<Scan, 'gameId' | 'ply' | 'moveNumber'>> {
  const playedUci = uci(played);
  const root = await engine.search(fen, depth, { multipv });
  const view = (s: Score) => toMine(s, mine, mine);
  const top = root.lines;
  let playedLine = top.find((l) => l.move === playedUci);
  const inTop = !!playedLine;
  if (!playedLine) {
    const only = await engine.search(fen, depth, { searchmoves: [playedUci] });
    playedLine = only.lines[0];
  }
  const best = top[0];
  const san = (u: string) => lineToSan(fen, [u])[0] ?? u;
  const bestScore = view(best.score);
  const playedScore = view(playedLine.score);
  const cmp = compareRoot(bestScore, playedScore);
  // if the played move IS the best move there is no loss by definition
  const isBest = best.move === playedUci;
  return {
    color: mine,
    fen,
    san: lineToSan(fen, [playedUci])[0] ?? playedUci,
    uci: playedUci,
    best: { uci: best.move, san: san(best.move), score: bestScore, pv: legalPrefix(fen, best.pv, 6) },
    alts: top.slice(1).map((l) => ({ uci: l.move, san: san(l.move), score: view(l.score) })),
    played: { score: isBest ? bestScore : playedScore, pv: legalPrefix(fen, playedLine.pv, 6), inTopLines: inTop },
    kind: isBest ? 'none' : cmp.kind,
    loss: isBest ? 0 : cmp.loss,
    urgency: isBest ? 0 : cmp.urgency,
    winningCollapse: isBest ? false : cmp.winningCollapse,
    engine: root.engine,
    depth,
  };
}

const posKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
export { posKey };

/** Analyse every one of my moves in a game (pass 1). Cached by game, colour, depth, MultiPV and engine. */
export async function scanGame(
  game: GameInfo,
  engine: EngineLike,
  opts: AnalysisOptions,
  onMove: () => void,
  signal?: AbortSignal,
): Promise<Scan[]> {
  const { moves } = parseGame(game.pgn);
  const plies = myPlies(moves, game.myColor);
  const key = `scan3:${game.id}:${game.myColor}:${opts.depth}:${opts.multipv}:${engine.engineName}`;
  const cached = cacheGet<Scan[]>(key);
  if (cached && engine.engineName !== 'unknown engine' && cached.length === plies.length) {
    plies.forEach(onMove);
    return cached;
  }
  const out: Scan[] = [];
  for (const ply of plies) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const m = moves[ply];
    const s = await evaluateMove(engine, m.before, m, game.myColor, opts.depth, opts.multipv);
    onMove();
    out.push({ ...s, gameId: game.id, ply, moveNumber: Math.floor(ply / 2) + 1 });
  }
  if (engine.engineName !== 'unknown engine') cacheSet(key, out);
  return out;
}

export interface Eligibility {
  ok: boolean;
  reason: string;
}

/** Why a move is, or is not, a candidate for a lesson. Pure and tunable. */
export function eligibility(
  s: Pick<Scan, 'best' | 'played' | 'kind' | 'loss' | 'winningCollapse'>,
  phase: Phase,
  opts: AnalysisOptions,
  repertoire: 'in-repertoire' | 'deviation' | 'unknown' = 'unknown',
): Eligibility {
  if (s.kind === 'none') return { ok: false, reason: 'no loss: the played move equals the best root move or is not worse' };
  const before = s.best.score;
  const after = s.played.score;
  if (s.kind === 'missedMate') return { ok: true, reason: 'missed a forced mate' };
  if (s.kind === 'allowedMate') {
    return { ok: true, reason: 'allowed a forced mate' };
  }
  if (before.cp !== undefined && before.cp <= opts.alreadyLostCp) {
    return { ok: false, reason: `already lost before the move (eval ${formatScore(before)} <= ${(opts.alreadyLostCp / 100).toFixed(1)})` };
  }
  if (before.cp !== undefined && before.cp > opts.stillWinningBeforeCp && after.cp !== undefined && after.cp > opts.stillWinningAfterCp) {
    return { ok: false, reason: `still clearly winning after the move (${formatScore(before)} to ${formatScore(after)})` };
  }
  const thr = opts.thresholds[phase];
  if (s.loss >= thr) return { ok: true, reason: `${phase} loss ${s.loss}cp >= ${thr}cp${s.winningCollapse ? ' (winning collapse)' : ''}` };
  if (phase === 'opening' && repertoire === 'deviation' && s.loss >= opts.repertoireDeviationCp) {
    return { ok: true, reason: `verified repertoire deviation costing ${s.loss}cp (>= ${opts.repertoireDeviationCp}cp)` };
  }
  return { ok: false, reason: `loss ${s.loss}cp is below the ${phase} threshold of ${thr}cp` };
}

interface Candidate {
  scan: Scan;
  phase: Phase;
  reason: string;
  repertoire: 'in-repertoire' | 'deviation' | 'unknown';
}

/** Order for picking: mate urgency first, then loss. */
const byUrgency = (a: Candidate, b: Candidate) => b.scan.urgency - a.scan.urgency || b.scan.loss - a.scan.loss;

export interface PickInfo {
  scan: Scan;
  tag?: string;
}

/**
 * Up to `max` per game, never padded: the biggest eligible error, the earliest eligible error (the cause),
 * then different themes, then the next biggest. Moves within 4 plies of an already picked one are skipped.
 */
export function pickForGame<T extends { scan: Pick<Scan, 'ply' | 'urgency' | 'loss'>; tag?: string }>(cands: T[], max: number): T[] {
  const sorted = [...cands].sort((a, b) => b.scan.urgency - a.scan.urgency || b.scan.loss - a.scan.loss);
  const picked: T[] = [];
  const near = (c: T) => picked.some((p) => Math.abs(p.scan.ply - c.scan.ply) < 4);
  const take = (c: T | undefined) => {
    if (c && picked.length < max && !picked.includes(c) && !near(c)) picked.push(c);
  };
  take(sorted[0]);
  take([...cands].sort((a, b) => a.scan.ply - b.scan.ply)[0]);
  const seen = new Set(picked.map((p) => p.tag ?? '-'));
  for (const c of sorted) {
    if (picked.length >= max) break;
    if (!seen.has(c.tag ?? '-')) {
      take(c);
      seen.add(c.tag ?? '-');
    }
  }
  for (const c of sorted) take(c);
  return picked.sort((a, b) => b.scan.urgency - a.scan.urgency || b.scan.loss - a.scan.loss);
}

function buildMoment(
  game: GameInfo,
  moves: ReturnType<typeof parseGame>['moves'],
  s: Scan,
  cand: Pick<Candidate, 'phase' | 'repertoire'> & { phaseReason: string; needsReview?: boolean },
  recheck: Moment['recheck'],
  engineInfo: Moment['engine'],
): Moment {
  const prev = s.ply > 0 ? moves[s.ply - 1] : undefined;
  const startIdx = Math.max(0, s.ply - 6);
  const leadIn = s.ply > 0 ? { startFen: moves[startIdx].before, moves: moves.slice(startIdx, s.ply).map((m) => uci(m)) } : undefined;
  const bestLine = s.best.pv;
  const refutation = s.played.pv.slice(1);
  const base: Moment = {
    id: `${game.id}:${s.ply}`,
    gameId: game.id,
    gameUrl: game.url,
    gameDate: game.endTime,
    gameResult: game.result,
    timeClass: game.timeClass,
    opponent: game.opponent,
    myColor: s.color,
    ply: s.ply,
    moveNumber: s.moveNumber,
    fen: s.fen,
    lastMove: prev ? { from: prev.from, to: prev.to } : undefined,
    leadIn,
    playedUci: s.uci,
    playedSan: s.san,
    bestUci: s.best.uci,
    bestSan: s.best.san,
    bestLine,
    refutation,
    before: s.best.score,
    after: s.played.score,
    loss: s.loss,
    kind: s.kind as MomentKind,
    urgency: s.urgency,
    winningCollapse: s.winningCollapse,
    alternatives: s.alts,
    phase: cand.phase,
    phaseReason: cand.phaseReason,
    needsReview: cand.needsReview,
    engine: engineInfo,
    recheck,
    repertoire: cand.repertoire,
    isFixture: game.isFixture,
  };
  const second = s.alts[0];
  if (second) {
    base.second = second;
    if (second.score.cp !== undefined && s.best.score.cp !== undefined) base.gapToSecondCp = s.best.score.cp - second.score.cp;
  }
  const tag = tagMoment({
    fen: s.fen,
    color: s.color,
    moveNumber: s.moveNumber,
    phase: cand.phase,
    playedUci: s.uci,
    playedSan: s.san,
    bestUci: s.best.uci,
    bestSan: s.best.san,
    bestLine,
    refutation,
    kind: base.kind,
    loss: s.loss,
    before: s.best.score,
    after: s.played.score,
    lastOpponent: prev ? { uci: uci(prev), san: prev.san } : undefined,
  });
  if (tag) {
    base.tag = tag.tag;
    base.tagEvidence = tag.evidence;
    base.tagTheme = tag.theme;
  }
  return base;
}

export interface AnalysisSummary {
  games: number;
  myMoves: number;
  eligible: number;
  picked: number;
  engine: string;
  depth: number;
  recheckDepth: number;
}

export interface AnalysisResult {
  moments: Moment[];
  debug: DebugRow[];
  summary: AnalysisSummary;
}

const emptyRepertoire: RepertoireCheck = () => 'unknown';

export async function analyseGames(
  games: GameInfo[],
  engine: EngineLike,
  opts: AnalysisOptions = DEFAULTS,
  onProgress: Progress = () => {},
  signal?: AbortSignal,
  repertoireCheck: RepertoireCheck = emptyRepertoire,
): Promise<AnalysisResult> {
  const total = games.reduce((n, g) => n + myPlies(parseGame(g.pgn).moves, g.myColor).length, 0);
  let done = 0;
  const moments: Moment[] = [];
  const debug: DebugRow[] = [];
  let eligibleCount = 0;
  for (const [gi, g] of games.entries()) {
    const label = `Game ${gi + 1} of ${games.length} vs ${g.opponent}`;
    onProgress(done, total, label);
    const { moves } = parseGame(g.pgn);
    const scans = await scanGame(g, engine, opts, () => onProgress(++done, total, label), signal);
    const engineInfo = { name: scans[0]?.engine ?? engine.engineName, depth: opts.depth, multipv: opts.multipv };
    const rows = new Map<number, DebugRow>();
    const cands: Candidate[] = [];
    for (const s of scans) {
      const ph = classifyPhase(s.fen);
      const rep = repertoireCheck(s.fen, s.san, s.color);
      const el = eligibility(s, ph.phase, opts, rep);
      const row: DebugRow = {
        gameId: g.id, ply: s.ply, moveNumber: s.moveNumber, color: s.color, san: s.san, uci: s.uci, phase: ph.phase, phaseReason: ph.reason + (ph.needsReview ? ' [needs review]' : ''),
        bestMove: s.best.san, alternatives: s.alts.map((a) => `${a.san} ${formatScore(a.score)}`).join('; '),
        evalBefore: formatScore(s.best.score), bestRoot: formatScore(s.best.score), playedRoot: formatScore(s.played.score),
        lossCp: s.kind === 'cp' || s.kind === 'none' ? s.loss : '', mate: s.kind === 'missedMate' ? 'missed mate' : s.kind === 'allowedMate' ? 'allowed mate' : '',
        secondBestGapCp: s.alts[0] && s.alts[0].score.cp !== undefined && s.best.score.cp !== undefined ? s.best.score.cp - s.alts[0].score.cp : '',
        tag: '', tagEvidence: '', repertoireState: rep, decision: 'dropped', reason: el.reason, engine: s.engine, depth: s.depth, recheck: '',
      };
      rows.set(s.ply, row);
      if (el.ok) cands.push({ scan: s, phase: ph.phase, reason: el.reason, repertoire: rep });
    }
    eligibleCount += cands.length;
    // pass 2: re-check the most promising candidates deeper; keep only the ones that stay eligible
    const shortlist = [...cands].sort(byUrgency).slice(0, opts.recheckMax);
    for (const c of cands) if (!shortlist.includes(c)) rows.get(c.scan.ply)!.reason = `eligible (${c.reason}) but not re-checked: ranked below the top ${opts.recheckMax} for this game`;
    const confirmed: { scan: Scan; tag?: string; moment: Moment }[] = [];
    for (const c of shortlist) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      onProgress(total, total, `Double-checking move ${c.scan.moveNumber} of game ${gi + 1} at a deeper search`);
      const m = moves[c.scan.ply];
      const deep = await evaluateMove(engine, m.before, m, g.myColor, opts.recheckDepth, opts.multipv);
      const rs: Scan = { ...deep, gameId: g.id, ply: c.scan.ply, moveNumber: c.scan.moveNumber };
      const ph = classifyPhase(rs.fen);
      const el = eligibility(rs, ph.phase, opts, c.repertoire);
      const row = rows.get(c.scan.ply)!;
      if (!el.ok) {
        row.reason = `dropped on re-check at depth ${opts.recheckDepth}: ${el.reason}`;
        row.recheck = `depth ${opts.recheckDepth}: no longer eligible`;
        continue;
      }
      const changed = Math.abs(rs.loss - c.scan.loss) > 50 || rs.kind !== c.scan.kind;
      const recheck: Moment['recheck'] = { depth: opts.recheckDepth, status: changed ? 'changed' : 'confirmed' };
      const moment = buildMoment(g, moves, rs, { phase: ph.phase, repertoire: c.repertoire, phaseReason: ph.reason, needsReview: ph.needsReview }, recheck, { name: rs.engine, depth: opts.recheckDepth, multipv: opts.multipv });
      row.recheck = `depth ${opts.recheckDepth}: ${recheck.status}, loss ${rs.loss}cp`;
      row.tag = moment.tag ?? '';
      row.tagEvidence = moment.tagEvidence ?? '';
      row.reason = `eligible after re-check: ${el.reason}`;
      confirmed.push({ scan: rs, tag: moment.tag, moment });
    }
    const picks = pickForGame(confirmed, opts.maxPerGame);
    for (const c of confirmed) {
      const row = rows.get(c.scan.ply)!;
      if (picks.includes(c)) {
        row.decision = 'kept';
        row.reason += `; selected (up to ${opts.maxPerGame} per game)`;
      } else row.reason += `; not selected: the ${opts.maxPerGame} chosen for this game rank higher or repeat the same episode`;
    }
    if (picks.length) {
      const earliest = Math.min(...picks.map((p) => p.scan.ply));
      for (const p of picks) p.moment.cause = p.scan.ply === earliest;
    }
    moments.push(...picks.map((p) => p.moment));
    debug.push(...[...rows.values()].sort((a, b) => a.ply - b.ply));
  }
  // Paths show each game's earliest costly mistake (the cause) first, then the biggest losses.
  moments.sort((a, b) => Number(!!b.cause) - Number(!!a.cause) || b.urgency - a.urgency || b.loss - a.loss);
  return {
    moments,
    debug,
    summary: { games: games.length, myMoves: total, eligible: eligibleCount, picked: moments.length, engine: engine.engineName, depth: opts.depth, recheckDepth: opts.recheckDepth },
  };
}

/** Convenience wrapper that returns only the moments. */
export async function findMoments(
  games: GameInfo[],
  engine: EngineLike,
  opts: AnalysisOptions = DEFAULTS,
  onProgress: Progress = () => {},
  signal?: AbortSignal,
  repertoireCheck?: RepertoireCheck,
): Promise<Moment[]> {
  return (await analyseGames(games, engine, opts, onProgress, signal, repertoireCheck)).moments;
}

export { DEBUG_COLUMNS, playLine };
export type { Moment, Score };

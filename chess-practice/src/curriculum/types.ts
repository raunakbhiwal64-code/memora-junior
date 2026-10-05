import type { Color } from '../types';

/** verified = every claim passed with the installed engine; conflict = at least one claim failed (withheld); pending = not verified yet or stale. */
export type SeedStatus = 'verified' | 'conflict' | 'pending';

export interface SourceRef {
  kind: 'coaching' | 'game' | 'engine';
  note: string;
  date?: string;
  gameId?: string;
  url?: string;
}

/**
 * A checkable statement about one exact position. Scores are compared at the same depth, with the move
 * searched as a root move (UCI searchmoves). `cp` is centipawns; mate is never turned into centipawns.
 */
export type Claim =
  | { type: 'best'; move: string }
  | { type: 'inTop'; move: string; n: number }
  | { type: 'withinCp'; moves: string[]; cp: number }
  | { type: 'worseThanBestBy'; move: string; atLeastCp: number }
  | { type: 'allowsMate'; move: string; atMost: number }
  | { type: 'evalBetween'; minCp: number; maxCp: number }
  | { type: 'betterThan'; move: string; than: string; byCp: number };

export interface Seed {
  id: string;
  lessonId: string;
  /** The learner's colour in the lesson. */
  color: Color;
  /** Legal SAN moves from the start position. Either `prefix` or `fen` is given. */
  prefix?: string;
  fen?: string;
  /** FEN printed in the brief; must equal the one derived from `prefix`. */
  briefFen?: string;
  declared: 'illustrative' | 'pending';
  title: string;
  /** Claims the lesson relies on. All must pass for 'verified'. */
  claims: Claim[];
  /** Claims from the earlier (Stockfish 14.1) checks. Reported as agree / disagree, never used to force an answer. */
  briefClaims: Claim[];
  source: SourceRef[];
  note?: string;
}

export interface Lesson {
  id: string;
  order: number;
  color: Color;
  kind: 'foundation' | 'response';
  title: string;
  goal: string;
  appliesWhen: string;
  prerequisites: string[];
  /** Concept IDs this lesson teaches. */
  concepts: string[];
  seedIds: string[];
  /** pending = lesson not written yet; not-grounded = no source material exists. Built lessons arrive in later stages. */
  contentStatus: 'pending' | 'built' | 'not-grounded';
  source: SourceRef[];
  /** Honest label, for example when a response leaves the usual London shape. */
  honesty?: string;
  notGrounded?: string;
}

export interface ClaimResult {
  claim: Claim;
  pass: boolean;
  /** Human-readable measured values, e.g. "c3 -18, best +162". */
  measured: string;
}

export interface SeedReport {
  hash: string;
  fen: string;
  sideToMove: Color;
  status: Exclude<SeedStatus, 'pending'>;
  /** MultiPV lines, mover's point of view. */
  top: { move: string; cp?: number; mate?: number; pv: string[] }[];
  /** Root-move searches for every move named in a claim. */
  roots: Record<string, { cp?: number; mate?: number; pv: string[] }>;
  claims: ClaimResult[];
  briefClaims: ClaimResult[];
}

export interface VerificationReport {
  generated: string;
  engine: { name: string; package: string };
  depth: number;
  multipv: number;
  seeds: Record<string, SeedReport>;
}

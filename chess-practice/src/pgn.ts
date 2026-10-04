import { Chess, type Move } from 'chess.js';
import type { Color } from './types';

export class PgnError extends Error {}

export interface ParsedGame {
  headers: Record<string, string>;
  moves: Move[];
}

/** Parse a PGN with chess.js. Throws PgnError with a readable message. */
export function parseGame(pgn: string): ParsedGame {
  const text = (pgn ?? '').trim();
  if (!text) throw new PgnError('The PGN is empty.');
  const chess = new Chess();
  try {
    chess.loadPgn(text);
  } catch (e) {
    throw new PgnError(`This PGN could not be read: ${(e as Error).message.split('\n')[0]}`);
  }
  const moves = chess.history({ verbose: true });
  if (moves.length === 0) throw new PgnError('This PGN has no moves.');
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(chess.getHeaders())) if (v != null) headers[k] = String(v);
  if (headers.Variant && headers.Variant.toLowerCase() !== 'standard') {
    throw new PgnError(`Only standard chess is supported (this is "${headers.Variant}").`);
  }
  if (headers.FEN && headers.SetUp === '1') {
    throw new PgnError('Games that start from a custom position are not supported.');
  }
  return { headers, moves };
}

/** Which colour did `username` play? Undefined when the headers don't say. */
export function colorOf(headers: Record<string, string>, username: string): Color | undefined {
  const u = username.trim().toLowerCase();
  if (!u) return undefined;
  if ((headers.White ?? '').toLowerCase() === u) return 'w';
  if ((headers.Black ?? '').toLowerCase() === u) return 'b';
  return undefined;
}

export const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');

/** Convert a UCI line to SAN from `fen`, stopping at the first illegal move. */
export function lineToSan(fen: string, line: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of line) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  return out;
}

/** Keep only the legal prefix of a UCI line, at most `max` plies. */
export function legalPrefix(fen: string, line: string[], max = 6): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of line.slice(0, max)) {
    try {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push(u);
    } catch {
      break;
    }
  }
  return out;
}

export function moveFromUci(c: Chess, u: string): Move {
  return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
}

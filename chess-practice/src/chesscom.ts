import { colorOf, parseGame } from './pgn';
import type { GameInfo } from './types';

const BASE = 'https://api.chess.com/pub';

export type ApiErrorKind = 'network' | 'notfound' | 'http' | 'parse' | 'nogames';
export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, message: string) {
    super(message);
  }
}

type FetchFn = (url: string) => Promise<Response>;

async function getJson<T>(url: string, f: FetchFn): Promise<T> {
  let res: Response;
  try {
    res = await f(url);
  } catch {
    throw new ApiError('network', 'Could not reach Chess.com. Check your internet connection and try again.');
  }
  if (res.status === 404) throw new ApiError('notfound', 'Chess.com does not know that username. Check the spelling.');
  if (!res.ok) throw new ApiError('http', `Chess.com answered with an error (HTTP ${res.status}). Try again in a moment.`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('parse', 'Chess.com sent something unreadable. Try again.');
  }
}

export async function fetchArchives(username: string, f: FetchFn = fetch): Promise<string[]> {
  const u = username.trim().toLowerCase();
  if (!u) throw new ApiError('notfound', 'Please type a Chess.com username.');
  const data = await getJson<{ archives?: string[] }>(`${BASE}/player/${encodeURIComponent(u)}/games/archives`, f);
  if (!Array.isArray(data.archives)) throw new ApiError('parse', 'Chess.com sent an unexpected archive list.');
  return data.archives;
}

interface RawGame {
  url?: string;
  pgn?: string;
  time_class?: string;
  rules?: string;
  end_time?: number;
  white?: { username?: string; result?: string };
  black?: { username?: string; result?: string };
}

/** Pure filter/sort: latest `count` completed standard blitz/rapid games, newest first. */
export function selectGames(raw: RawGame[], username: string, count: number): GameInfo[] {
  const me = username.trim().toLowerCase();
  const out: GameInfo[] = [];
  const sorted = [...raw].sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0));
  for (const g of sorted) {
    if (g.rules !== 'chess') continue;
    if (g.time_class !== 'blitz' && g.time_class !== 'rapid') continue;
    if (!g.pgn || !g.white?.result || !g.black?.result) continue;
    if (g.white.result === 'abandoned' || g.black.result === 'abandoned') continue;
    const wName = g.white.username ?? '';
    const bName = g.black.username ?? '';
    let myColor: 'w' | 'b';
    if (wName.toLowerCase() === me) myColor = 'w';
    else if (bName.toLowerCase() === me) myColor = 'b';
    else continue;
    try {
      const parsed = parseGame(g.pgn);
      if (parsed.moves.length < 8) continue; // too short to learn from
      if (colorOf(parsed.headers, username) && colorOf(parsed.headers, username) !== myColor) continue;
    } catch {
      continue;
    }
    const id = (g.url ?? '').split('/').pop() || String(g.end_time);
    out.push({
      id,
      url: g.url ?? '',
      pgn: g.pgn,
      white: wName,
      black: bName,
      myColor,
      opponent: myColor === 'w' ? bName : wName,
      endTime: g.end_time ?? 0,
      timeClass: g.time_class,
      result: myColor === 'w' ? g.white.result : g.black.result,
    });
    if (out.length === count) break;
  }
  return out;
}

/**
 * Fetch the latest archive, then go back one month at a time (max 3 archives)
 * until `count` games are found. Requests are strictly sequential.
 */
export async function fetchRecentGames(
  username: string,
  count = 5,
  f: FetchFn = fetch,
  onStatus: (msg: string) => void = () => {},
): Promise<GameInfo[]> {
  onStatus('Looking up your game archives…');
  const archives = await fetchArchives(username, f);
  if (archives.length === 0) throw new ApiError('nogames', 'That account has no games yet.');
  const collected: RawGame[] = [];
  let found: GameInfo[] = [];
  for (let i = 0; i < 3 && archives.length - 1 - i >= 0; i++) {
    const url = archives[archives.length - 1 - i];
    onStatus(`Downloading games (${i + 1}/3 max): ${url.split('/').slice(-2).join('/')}…`);
    const data = await getJson<{ games?: RawGame[] }>(url, f);
    collected.push(...(data.games ?? []));
    found = selectGames(collected, username, count);
    if (found.length >= count) break;
  }
  if (found.length === 0) {
    throw new ApiError('nogames', 'No recent completed standard blitz or rapid games were found for that user.');
  }
  return found;
}

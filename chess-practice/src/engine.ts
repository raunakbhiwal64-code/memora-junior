import { Chess } from 'chess.js';
import type { EvalResult, Score } from './types';

/** Anything that can talk UCI: a Web Worker in the browser, a child process in tests. */
export interface Transport {
  send(line: string): void;
  onLine: (line: string) => void;
  terminate(): void;
}

/** One searched line. `score` and `pv` are from the point of view of the side to move in the searched position. */
export interface SearchLine {
  /** First move of the line, UCI. */
  move: string;
  score: Score;
  pv: string[];
  depth: number;
}

export interface SearchResult {
  /** MultiPV lines, best first. With `searchmoves`, only the named root moves. */
  lines: SearchLine[];
  bestmove: string;
  engine: string;
  depth: number;
}

export interface SearchOptions {
  multipv?: number;
  /** Restrict the root to these moves (UCI): an explicit root-move search. */
  searchmoves?: string[];
}

export interface EngineLike {
  search(fen: string, depth: number, opts?: SearchOptions): Promise<SearchResult>;
  /** Single best line (MultiPV 1). */
  analyse(fen: string, depth: number): Promise<EvalResult>;
  readonly engineName: string;
}

export interface ParsedInfo {
  depth: number;
  multipv: number;
  score: Score;
  pv: string[];
}

export function parseInfo(line: string): ParsedInfo | null {
  if (!line.startsWith('info ') || !line.includes(' score ') || !line.includes(' pv ')) return null;
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;
  const depth = Number(/ depth (\d+)/.exec(line)?.[1] ?? 0);
  const multipv = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1);
  const cp = /score cp (-?\d+)/.exec(line);
  const mate = /score mate (-?\d+)/.exec(line);
  const pv = line.split(' pv ')[1].trim().split(/\s+/);
  if (mate) return { depth, multipv, score: { mate: Number(mate[1]) }, pv };
  if (cp) return { depth, multipv, score: { cp: Number(cp[1]) }, pv };
  return null;
}

/** Score for a position with no legal moves, from the side to move's view. */
export function terminalScore(chess: Chess): Score | null {
  if (chess.isCheckmate()) return { mate: 0 };
  if (chess.isStalemate() || chess.isInsufficientMaterial()) return { cp: 0 };
  return null;
}

export class Engine implements EngineLike {
  private queue: Promise<unknown> = Promise.resolve();
  private waiter: ((line: string) => void) | null = null;
  private ready = false;
  engineName = 'unknown engine';

  constructor(private t: Transport) {
    t.onLine = (line) => this.waiter?.(line);
  }

  private waitFor(done: (line: string) => boolean, collect?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      this.waiter = (line) => {
        collect?.(line);
        if (done(line)) {
          this.waiter = null;
          resolve();
        }
      };
    });
  }

  async init(): Promise<void> {
    if (this.ready) return;
    const w = this.waitFor(
      (l) => l === 'uciok',
      (l) => {
        if (l.startsWith('id name ')) this.engineName = l.slice(8).trim();
      },
    );
    this.t.send('uci');
    await w;
    this.t.send('setoption name Threads value 1');
    this.t.send('setoption name Hash value 16');
    const r = this.waitFor((l) => l === 'readyok');
    this.t.send('isready');
    await r;
    this.ready = true;
  }

  /**
   * Fixed-depth, single-thread search. The engine state is reset first, so a result never depends on
   * what was searched before (repeatable). Calls are queued one at a time.
   */
  search(fen: string, depth: number, opts: SearchOptions = {}): Promise<SearchResult> {
    const run = async (): Promise<SearchResult> => {
      const chess = new Chess(fen);
      const terminal = terminalScore(chess);
      if (terminal) return { lines: [{ move: '', score: terminal, pv: [], depth: 0 }], bestmove: '', engine: this.engineName, depth: 0 };
      await this.init();
      this.t.send('ucinewgame');
      const ready = this.waitFor((l) => l === 'readyok');
      this.t.send('isready');
      await ready;
      const multipv = Math.max(1, opts.multipv ?? 1);
      this.t.send(`setoption name MultiPV value ${multipv}`);
      const best: Record<number, ParsedInfo> = {};
      let bestmove = '';
      const w = this.waitFor(
        (l) => l.startsWith('bestmove'),
        (l) => {
          const info = parseInfo(l);
          if (info && (!best[info.multipv] || info.depth >= best[info.multipv].depth)) best[info.multipv] = info;
          if (l.startsWith('bestmove')) bestmove = l.split(/\s+/)[1] ?? '';
        },
      );
      this.t.send(`position fen ${fen}`);
      this.t.send(`go depth ${depth}` + (opts.searchmoves?.length ? ` searchmoves ${opts.searchmoves.join(' ')}` : ''));
      await w;
      const lines = Object.values(best)
        .sort((a, b) => a.multipv - b.multipv)
        .map((i) => ({ move: i.pv[0], score: i.score, pv: i.pv, depth: i.depth }));
      if (!lines.length) lines.push({ move: bestmove, score: { cp: 0 }, pv: bestmove ? [bestmove] : [], depth: 0 });
      return { lines, bestmove: bestmove || lines[0].move, engine: this.engineName, depth: lines[0].depth };
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  async analyse(fen: string, depth: number): Promise<EvalResult> {
    const r = await this.search(fen, depth, { multipv: 1 });
    const l = r.lines[0];
    return { score: l.score, pv: l.pv, bestmove: r.bestmove, depth: l.depth };
  }

  terminate() {
    this.t.terminate();
  }
}

/** Browser transport: Stockfish 19 lite single-threaded WASM in a Web Worker. */
export function createBrowserEngine(): Engine {
  const url = new URL('engine/stockfish-19-lite-single.js', document.baseURI).href;
  const worker = new Worker(url);
  const t: Transport = {
    send: (line) => worker.postMessage(line),
    onLine: () => {},
    terminate: () => worker.terminate(),
  };
  worker.onmessage = (e: MessageEvent) => t.onLine(String(e.data));
  return new Engine(t);
}

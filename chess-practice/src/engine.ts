import { Chess } from 'chess.js';
import type { EvalResult, Score } from './types';

/** Anything that can talk UCI: a Web Worker in the browser, a child process in tests. */
export interface Transport {
  send(line: string): void;
  onLine: (line: string) => void;
  terminate(): void;
}

export interface EngineLike {
  analyse(fen: string, depth: number): Promise<EvalResult>;
}

export function parseInfo(line: string): { depth: number; score: Score; pv: string[] } | null {
  if (!line.startsWith('info ') || !line.includes(' score ') || !line.includes(' pv ')) return null;
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;
  const depth = Number(/ depth (\d+)/.exec(line)?.[1] ?? 0);
  const cp = /score cp (-?\d+)/.exec(line);
  const mate = /score mate (-?\d+)/.exec(line);
  const pv = line.split(' pv ')[1].trim().split(/\s+/);
  if (mate) return { depth, score: { mate: Number(mate[1]) }, pv };
  if (cp) return { depth, score: { cp: Number(cp[1]) }, pv };
  return null;
}

/** Score for a position with no legal moves, from the side to move's view. */
export function terminalResult(chess: Chess): EvalResult | null {
  if (chess.isCheckmate()) return { score: { mate: 0 }, pv: [], bestmove: '', depth: 0 };
  if (chess.isStalemate() || chess.isInsufficientMaterial()) return { score: { cp: 0 }, pv: [], bestmove: '', depth: 0 };
  return null;
}

export class Engine implements EngineLike {
  private queue: Promise<unknown> = Promise.resolve();
  private waiter: ((line: string) => void) | null = null;
  private ready = false;

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
    const w = this.waitFor((l) => l === 'uciok');
    this.t.send('uci');
    await w;
    this.t.send('setoption name Hash value 16');
    const r = this.waitFor((l) => l === 'readyok');
    this.t.send('isready');
    await r;
    this.ready = true;
  }

  /** Analyses one position to a fixed depth. Calls are queued one at a time. */
  analyse(fen: string, depth: number): Promise<EvalResult> {
    const run = async (): Promise<EvalResult> => {
      const chess = new Chess(fen);
      const terminal = terminalResult(chess);
      if (terminal) return terminal;
      await this.init();
      let best: { depth: number; score: Score; pv: string[] } | null = null;
      let bestmove = '';
      const w = this.waitFor(
        (l) => l.startsWith('bestmove'),
        (l) => {
          const info = parseInfo(l);
          if (info && (!best || info.depth >= best.depth)) best = info;
          if (l.startsWith('bestmove')) bestmove = l.split(/\s+/)[1] ?? '';
        },
      );
      this.t.send(`position fen ${fen}`);
      this.t.send(`go depth ${depth}`);
      await w;
      const b = best as { depth: number; score: Score; pv: string[] } | null;
      if (!b) return { score: { cp: 0 }, pv: [bestmove], bestmove, depth: 0 };
      return { score: b.score, pv: b.pv, bestmove: bestmove || b.pv[0], depth: b.depth };
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
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

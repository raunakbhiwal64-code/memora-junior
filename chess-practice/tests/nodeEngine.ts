import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { Engine, type Transport } from '../src/engine';

/** Runs the same Stockfish 19 lite build as the browser, as a Node child process. */
export function createNodeEngine(): { engine: Engine; close: () => void } {
  const require = createRequire(import.meta.url);
  const js = require.resolve('stockfish/bin/stockfish-19-lite-single.js');
  const child = spawn(process.execPath, [js], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buf = '';
  const t: Transport = {
    send: (line) => child.stdin.write(line + '\n'),
    onLine: () => {},
    terminate: () => child.kill(),
  };
  child.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      t.onLine(buf.slice(0, i).trim());
      buf = buf.slice(i + 1);
    }
  });
  return { engine: new Engine(t), close: () => child.kill() };
}

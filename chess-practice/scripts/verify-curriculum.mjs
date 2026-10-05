// Re-checks every curriculum seed with the INSTALLED Stockfish and writes
// src/curriculum/verification.generated.json (engine name, depth, measured values, pass/fail).
//   npm run verify-curriculum            (depth 18, MultiPV 3)
//   npm run verify-curriculum -- --depth 14
// A seed is only ever shown as "verified" if its report entry matches the seed's current hash.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const DEPTH = Number(args.includes('--depth') ? args[args.indexOf('--depth') + 1] : 18);
const MULTIPV = 3;
const dir = new URL('../src/curriculum/', import.meta.url);
const seeds = JSON.parse(readFileSync(new URL('seeds.json', dir), 'utf8'));

const child = spawn(process.execPath, [require.resolve('stockfish/bin/stockfish-19-lite-single.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
let waiter = null;
let engineName = '';
child.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (l.startsWith('id name ')) engineName = l.slice(8);
    waiter?.(l);
  }
});
const send = (s) => child.stdin.write(s + '\n');
const until = (pred, collect) =>
  new Promise((res) => {
    waiter = (l) => {
      collect?.(l);
      if (pred(l)) {
        waiter = null;
        res();
      }
    };
  });

/** Same function as src/curriculum/validate.ts (checked by a test). */
function seedHash(seed) {
  const text = JSON.stringify([seed.prefix ?? null, seed.fen ?? null, seed.claims]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function seedFen(seed) {
  if (seed.fen) return new Chess(seed.fen).fen();
  const c = new Chess();
  for (const m of (seed.prefix ?? '').split(/\s+/).filter(Boolean)) c.move(m);
  return c.fen();
}
const claimMoves = (c) => (c.type === 'withinCp' ? c.moves : c.type === 'betterThan' ? [c.move, c.than] : c.move ? [c.move] : []);

/** Mover's point of view. Returns [{mpv, cp|mate, pv(UCI)}]. */
async function search(fen, { multipv = 1, searchmoves = '' } = {}) {
  // Fresh search state every time (clears the hash), so a result never depends on what was searched before.
  send('ucinewgame');
  const ready = until((l) => l === 'readyok');
  send('isready');
  await ready;
  send('setoption name MultiPV value ' + multipv);
  const lines = {};
  const w = until(
    (l) => l.startsWith('bestmove'),
    (l) => {
      if (!l.startsWith('info ') || !l.includes(' pv ') || /bound/.test(l)) return;
      const d = Number(/ depth (\d+)/.exec(l)?.[1] ?? 0);
      const mpv = Number(/multipv (\d+)/.exec(l)?.[1] ?? 1);
      const cp = /score cp (-?\d+)/.exec(l);
      const mt = /score mate (-?\d+)/.exec(l);
      const o = { depth: d, mpv, pv: l.split(' pv ')[1].trim().split(/\s+/) };
      if (mt) o.mate = Number(mt[1]);
      else if (cp) o.cp = Number(cp[1]);
      if (!lines[mpv] || d >= lines[mpv].depth) lines[mpv] = o;
    },
  );
  send('position fen ' + fen);
  send(`go depth ${DEPTH}` + (searchmoves ? ' searchmoves ' + searchmoves : ''));
  await w;
  return Object.values(lines).sort((a, b) => a.mpv - b.mpv);
}
const uci = (fen, san) => {
  const m = new Chess(fen).move(san);
  return m.from + m.to + (m.promotion ?? '');
};
const sanLine = (fen, pv, n = 6) => {
  const c = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, n)) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  return out;
};
const fmt = (o) => (o.mate !== undefined ? `mate ${o.mate}` : `${o.cp >= 0 ? '+' : ''}${(o.cp / 100).toFixed(2)}`);
const hasMate = (o) => o.mate !== undefined;

function evalClaim(c, ctx) {
  const { top, roots, color, stm } = ctx;
  const best = top[0];
  const root = (m) => roots[m];
  switch (c.type) {
    case 'best': {
      const ok = top[0].move === c.move;
      return { pass: ok, measured: `top: ${top.map((t) => `${t.move} ${fmt(t)}`).join(', ')}` };
    }
    case 'inTop': {
      const i = top.findIndex((t) => t.move === c.move);
      return { pass: i >= 0 && i < c.n, measured: `top: ${top.map((t) => `${t.move} ${fmt(t)}`).join(', ')}` };
    }
    case 'withinCp': {
      const rs = c.moves.map((m) => ({ m, r: root(m) }));
      if (rs.some((x) => hasMate(x.r)) || hasMate(best)) return { pass: false, measured: 'mate involved: not compared in centipawns' };
      const ref = Math.max(best.cp, ...rs.map((x) => x.r.cp));
      const gaps = rs.map((x) => ({ m: x.m, gap: ref - x.r.cp }));
      return { pass: gaps.every((g) => g.gap <= c.cp), measured: `best ${fmt({ cp: ref })}; ` + rs.map((x, i) => `${x.m} ${fmt(x.r)} (-${gaps[i].gap})`).join(', ') };
    }
    case 'worseThanBestBy': {
      const r = root(c.move);
      if (hasMate(r) || hasMate(best)) return { pass: false, measured: 'mate involved: not compared in centipawns' };
      const ref = Math.max(best.cp, r.cp);
      return { pass: ref - r.cp >= c.atLeastCp, measured: `${c.move} ${fmt(r)}, best ${fmt({ cp: ref })} (gap ${ref - r.cp})` };
    }
    case 'allowsMate': {
      const r = root(c.move);
      const ok = r.mate !== undefined && r.mate < 0 && Math.abs(r.mate) <= c.atMost;
      return { pass: ok, measured: `${c.move} ${fmt(r)} for the mover` };
    }
    case 'evalBetween': {
      if (hasMate(best)) return { pass: false, measured: `mate ${best.mate} for the mover` };
      const cp = stm === color ? best.cp : -best.cp; // learner's point of view
      return { pass: cp >= c.minCp && cp <= c.maxCp, measured: `learner's view ${fmt({ cp })}` };
    }
    case 'betterThan': {
      const a = root(c.move);
      const b = root(c.than);
      if (hasMate(a) || hasMate(b)) return { pass: false, measured: 'mate involved: not compared in centipawns' };
      return { pass: a.cp - b.cp >= c.byCp, measured: `${c.move} ${fmt(a)} vs ${c.than} ${fmt(b)} (diff ${a.cp - b.cp})` };
    }
  }
}

async function main() {
  const w0 = until((l) => l === 'uciok');
  send('uci');
  await w0;
  send('setoption name Threads value 1');
  send('setoption name Hash value 64');
  const r0 = until((l) => l === 'readyok');
  send('isready');
  await r0;

  const report = {
    generated: new Date().toISOString().slice(0, 10),
    engine: { name: engineName, package: `stockfish@${require('stockfish/package.json').version} lite single-threaded WebAssembly` },
    depth: DEPTH,
    multipv: MULTIPV,
    seeds: {},
  };
  for (const s of seeds) {
    const fen = seedFen(s);
    const stm = fen.split(' ')[1];
    const topRaw = await search(fen, { multipv: MULTIPV });
    const top = topRaw.map((t) => ({ move: sanLine(fen, t.pv, 1)[0], cp: t.cp, mate: t.mate, pv: sanLine(fen, t.pv, 6) }));
    const names = [...new Set([...s.claims, ...s.briefClaims].flatMap(claimMoves))];
    const roots = {};
    for (const m of names) {
      const [r] = await search(fen, { searchmoves: uci(fen, m) });
      roots[m] = { cp: r.cp, mate: r.mate, pv: sanLine(fen, r.pv, 6) };
    }
    const ctx = { top, roots, color: s.color, stm };
    const claims = s.claims.map((c) => ({ claim: c, ...evalClaim(c, ctx) }));
    const briefClaims = s.briefClaims.map((c) => ({ claim: c, ...evalClaim(c, ctx) }));
    const status = claims.every((c) => c.pass) ? 'verified' : 'conflict';
    report.seeds[s.id] = { hash: seedHash(s), fen, sideToMove: stm, status, top, roots, claims, briefClaims };
    console.log(`${status.padEnd(8)} ${s.id.padEnd(12)} ${claims.map((c) => (c.pass ? 'ok' : 'FAIL')).join(',')}  brief: ${briefClaims.map((c) => (c.pass ? 'agrees' : 'differs')).join(',') || '-'}`);
  }
  writeFileSync(new URL('verification.generated.json', dir), JSON.stringify(report, null, 1) + '\n');
  console.log(`Wrote src/curriculum/verification.generated.json (${report.engine.name}, depth ${DEPTH}, MultiPV ${MULTIPV}).`);
  child.kill();
  process.exit(0);
}
main();

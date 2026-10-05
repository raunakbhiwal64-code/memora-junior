import { test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createNodeEngine } from './nodeEngine';
import { analyseGames } from '../src/moments';
import { FIXTURE_GAMES } from '../src/fixtures';
import { toCsv } from '../src/debug';
test('probe', async () => {
  const { engine, close } = createNodeEngine();
  const t = Date.now();
  const r = await analyseGames([...FIXTURE_GAMES], engine);
  writeFileSync('/tmp/claude-0/-home-user-memora-junior/4ceac428-50db-562d-bf03-0224b41ab804/scratchpad/probe-moments.json', JSON.stringify({ ms: Date.now() - t, summary: r.summary, moments: r.moments.map((m) => ({ id: m.id, san: m.playedSan, best: m.bestSan, phase: m.phase, phaseReason: m.phaseReason, kind: m.kind, loss: m.loss, before: m.before, after: m.after, tag: m.tag, evidence: m.tagEvidence, theme: m.tagTheme, recheck: m.recheck, gap: m.gapToSecondCp, leadIn: m.leadIn?.moves })) }, null, 1));
  writeFileSync('/tmp/claude-0/-home-user-memora-junior/4ceac428-50db-562d-bf03-0224b41ab804/scratchpad/probe-debug.csv', toCsv(r.debug));
  close();
}, 280000);

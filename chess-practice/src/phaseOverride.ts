import type { KV } from './kv';
import type { Phase } from './phase';
import { PHASE_LABEL } from './phase';
import type { Moment } from './types';

const KEY = 'phase:overrides';

export const getOverrides = (kv: KV): Record<string, Phase> => kv.get<Record<string, Phase>>(KEY) ?? {};

export function setPhaseOverride(kv: KV, momentId: string, phase: Phase | null): void {
  const o = getOverrides(kv);
  if (phase === null) delete o[momentId];
  else o[momentId] = phase;
  kv.set(KEY, o);
}

/** Applies manual phase choices. The original reason is kept next to the override. */
export function applyOverrides(kv: KV, moments: Moment[]): Moment[] {
  const o = getOverrides(kv);
  return moments.map((m) => (o[m.id] && o[m.id] !== m.phase ? { ...m, phase: o[m.id], phaseReason: `set by you to ${PHASE_LABEL[o[m.id]]} (was: ${m.phaseReason})`, needsReview: false } : m));
}

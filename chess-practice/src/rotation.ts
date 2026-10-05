import type { KV } from './kv';
import { PHASES, type Phase } from './phase';

const KEY = 'rotation:index';
export const ROTATION: Phase[] = PHASES.map((p) => p.id); // openings -> middlegame -> endgame

export const suggestedPhase = (kv: KV): Phase => ROTATION[(kv.get<number>(KEY) ?? 0) % ROTATION.length];

/**
 * Advance only when a round in the SUGGESTED phase is completed (not on app open). Practising another phase
 * by choice is allowed and changes nothing, with no penalty.
 */
export function noteRoundCompleted(kv: KV, phase: Phase): boolean {
  if (phase !== suggestedPhase(kv)) return false;
  kv.set(KEY, ((kv.get<number>(KEY) ?? 0) + 1) % ROTATION.length);
  return true;
}

/** Explicit "next phase" choice. */
export function advanceRotation(kv: KV): Phase {
  kv.set(KEY, ((kv.get<number>(KEY) ?? 0) + 1) % ROTATION.length);
  return suggestedPhase(kv);
}

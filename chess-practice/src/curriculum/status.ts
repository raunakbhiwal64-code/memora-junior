import { seedHash } from './validate';
import type { Seed, SeedStatus, VerificationReport } from './types';

/** verified / conflict only when the report was produced for exactly this seed; otherwise pending. */
export function seedStatus(seed: Seed, report: VerificationReport | undefined): { status: SeedStatus; stale: boolean } {
  const r = report?.seeds[seed.id];
  if (!r) return { status: 'pending', stale: false };
  if (r.hash !== seedHash(seed)) return { status: 'pending', stale: true };
  return { status: r.status, stale: false };
}

import lessonsJson from './lessons.json';
import seedsJson from './seeds.json';
import reportJson from './verification.generated.json';
import { seedStatus } from './status';
import type { Lesson, Seed, SeedStatus, VerificationReport } from './types';
import { seedFen, validateCourse, type Issue } from './validate';

export const LESSONS = lessonsJson as unknown as Lesson[];
export const SEEDS = seedsJson as unknown as Seed[];
export const REPORT = reportJson as unknown as VerificationReport;

export interface SeedView {
  seed: Seed;
  fen?: string;
  status: SeedStatus;
  stale: boolean;
  /** Invalid seeds are withheld: never shown or scored. */
  withheld: boolean;
}

/** Every seed with its derived FEN and honest status. */
export function seedViews(seeds: Seed[] = SEEDS, report: VerificationReport = REPORT, lessons: Lesson[] = LESSONS): SeedView[] {
  const bad = new Set(validateCourse(lessons, seeds).filter((i) => i.level === 'error').map((i) => i.id));
  return seeds.map((seed) => {
    const withheld = bad.has(seed.id);
    let fen: string | undefined;
    if (!withheld) fen = seedFen(seed);
    const { status, stale } = seedStatus(seed, report);
    return { seed, fen, status: withheld ? 'conflict' : status, stale, withheld };
  });
}

export function courseIssues(): Issue[] {
  return validateCourse(LESSONS, SEEDS);
}

export type { Lesson, Seed, SeedStatus, VerificationReport } from './types';

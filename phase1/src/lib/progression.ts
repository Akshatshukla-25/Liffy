import { WorkSet, isWorkingSet } from './types';

export interface Target { weightKg: number; reps: number; }

/**
 * Double progression: stay at a weight until every working set hits the top of the rep range,
 * then add `incrementKg` and reset to the bottom of the range.
 */
export function nextTarget(
  last: WorkSet[],
  repRange: [number, number],
  incrementKg = 2.5,
): Target | null {
  const work = last.filter(isWorkingSet);
  if (!work.length) return null;
  const [lo, hi] = repRange;
  const weightKg = Math.max(...work.map(s => s.weightKg));
  const atWeight = work.filter(s => s.weightKg === weightKg);
  const minReps = Math.min(...atWeight.map(s => s.reps));
  if (minReps >= hi) return { weightKg: weightKg + incrementKg, reps: lo };
  return { weightKg, reps: Math.min(hi, Math.max(lo, minReps + 1)) };
}

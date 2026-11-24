import { WorkSet, isWorkingSet } from './types';
import { estimate1RM } from './oneRepMax';

export type PRType = 'weight' | 'e1rm' | 'reps_at_weight';

/**
 * Which personal records does `candidate` set versus `prior` history (same exercise)?
 * - weight: heaviest weight ever lifted for >=1 rep
 * - e1rm: highest estimated 1RM
 * - reps_at_weight: most reps at this weight or heavier
 * The first-ever set for an exercise returns [] (nothing to beat yet).
 */
export function detectPRs(prior: WorkSet[], candidate: WorkSet): PRType[] {
  if (!isWorkingSet(candidate)) return [];
  const history = prior.filter(isWorkingSet);
  if (history.length === 0) return [];

  const prs: PRType[] = [];
  if (candidate.weightKg > Math.max(...history.map(s => s.weightKg))) prs.push('weight');

  const cE = estimate1RM(candidate.weightKg, candidate.reps);
  const bestE = Math.max(0, ...history.map(s => estimate1RM(s.weightKg, s.reps) ?? 0));
  if (cE !== null && cE > bestE + 1e-9) prs.push('e1rm');

  const bestReps = Math.max(0, ...history.filter(s => s.weightKg >= candidate.weightKg).map(s => s.reps));
  if (candidate.reps > bestReps) prs.push('reps_at_weight');

  return prs;
}

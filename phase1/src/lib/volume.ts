import { ExerciseEntry, WorkSet, isWorkingSet } from './types';

export const setVolume = (s: WorkSet): number => (isWorkingSet(s) ? s.weightKg * s.reps : 0);

export const totalVolume = (sets: WorkSet[]): number => sets.reduce((a, s) => a + setVolume(s), 0);

/** Hard sets per muscle: primary muscle = 1 per set, secondary = 0.5. Warm-ups excluded. */
export function hardSetsByMuscle(entries: ExerciseEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    const n = e.sets.filter(isWorkingSet).length;
    if (!n) continue;
    for (const m of e.primaryMuscles) out[m] = (out[m] ?? 0) + n;
    for (const m of e.secondaryMuscles ?? []) out[m] = (out[m] ?? 0) + n * 0.5;
  }
  return out;
}

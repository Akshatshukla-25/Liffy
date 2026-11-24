export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

export interface WorkSet {
  weightKg: number;
  reps: number;
  rpe?: number | null;
  type: SetType;
}

export interface ExerciseEntry {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  sets: WorkSet[];
}

/** A set counts toward training stats unless it is a warm-up. */
export const isWorkingSet = (s: WorkSet): boolean => s.type !== 'warmup' && s.reps > 0;

import type { Session } from '../lib/session';
import type { WorkSet } from '../lib/types';

export interface ExerciseRow {
  id: string; name: string; category: 'strength' | 'bodyweight' | 'cardio' | 'mobility';
  equipment: string | null; primaryMuscles: string[]; secondaryMuscles: string[]; isCustom: boolean;
}

export interface WorkoutSummary {
  id: string; name: string; startedAt: string; durationMin: number; volumeKg: number; exerciseNames: string[];
}

/** Implement with expo-sqlite. Every method filters by the current owner_id and deleted_at IS NULL. */
export interface Repository {
  init(): Promise<void>;                         // runs MIGRATIONS via PRAGMA user_version
  searchExercises(query: string, limit?: number): Promise<ExerciseRow[]>;
  createCustomExercise(e: Omit<ExerciseRow, 'isCustom'>): Promise<void>;

  /** Persist a session. Called on every change for the active workout (crash safety), and on finish. */
  saveSession(s: Session): Promise<void>;
  getActiveSession(): Promise<Session | null>;   // unfinished workout, restored after app kill
  discardSession(id: string): Promise<void>;     // soft delete

  listWorkouts(limit: number, offset: number): Promise<WorkoutSummary[]>;
  getWorkout(id: string): Promise<Session | null>;
  deleteWorkout(id: string): Promise<void>;      // soft delete

  /** All finished working sets for one exercise, newest first. Feeds detectPRs / nextTarget. */
  getExerciseHistory(exerciseId: string): Promise<WorkSet[]>;
  /** Last finished session's sets for this exercise (for "previous" column). */
  getLastSets(exerciseId: string): Promise<WorkSet[]>;

  /** Called after sign-in: UPDATE every table SET owner_id=:userId, dirty=1 WHERE owner_id='local'. */
  claimLocalData(userId: string): Promise<void>;
}

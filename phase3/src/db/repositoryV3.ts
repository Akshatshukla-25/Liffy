import type { Repository } from './repository';
import type { LogRow, LoadSession } from '../lib/progress';
import type { Template } from '../lib/templates';

/** Extend the existing Repository (implement these in sqliteRepository.ts). Finished + non-deleted rows only. */
export interface RepositoryV3 extends Repository {
  /** All finished working sets since `sinceIso`, joined to workout + exercise (muscles parsed from JSON). */
  getTrainingLog(sinceIso: string): Promise<LogRow[]>;
  /** Finished lifting sessions AND runs since `sinceIso`, as {startedAt, durationMin, rpe}. Lifting rpe = mean of set rpes or null. */
  getLoadSessions(sinceIso: string): Promise<LoadSession[]>;

  listTemplates(): Promise<Template[]>;
  saveTemplate(t: Template): Promise<void>;       // upsert; replace its template_exercises rows
  deleteTemplate(id: string): Promise<void>;      // soft delete
  /** Names for display: exerciseId -> name. */
  getExerciseNames(ids: string[]): Promise<Record<string, string>>;
}

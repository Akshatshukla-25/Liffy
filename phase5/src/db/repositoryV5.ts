import type { RepositoryV4 } from './repositoryV4';
import type { RunRow } from '../lib/runs';

/** Implement in sqliteRepository.ts. Current owner + deleted_at IS NULL on every read. */
export interface RepositoryV5 extends RepositoryV4 {
  listRuns(limit: number, offset: number): Promise<RunRow[]>;   // newest first
  saveRun(run: RunRow): Promise<void>;                          // upsert by id (manual runs)
  deleteRun(id: string): Promise<void>;                         // soft delete
  /** Insert an imported run unless (owner_id, source, external_id) already exists (also if soft-deleted: return 'duplicate'). */
  importRun(run: RunRow): Promise<'added' | 'duplicate'>;
}

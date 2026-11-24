import type { RepositoryV3 } from './repositoryV3';
import type { Tables } from '../lib/backup';

export interface RepositoryV4 extends RepositoryV3 {
  /** Every row of every BACKUP_TABLES table for the current owner, INCLUDING soft-deleted (buildBackup filters). */
  exportAllTables(): Promise<Tables>;
  /** Upsert rows in BACKUP_TABLES order inside ONE transaction; roll back everything on any error.
   *  Set owner_id = current owner and dirty = 1 on every written row. */
  importRows(upserts: Tables): Promise<void>;
  /** Hard-delete ALL user data for the current owner (workouts, sets, runs, templates, custom exercises). */
  deleteAllUserData(): Promise<void>;
}

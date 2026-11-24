import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { MIGRATIONS, SYNCED_TABLES } from './schema';
import type { Repository, ExerciseRow, WorkoutSummary } from './repository';
import type { RepositoryV4 } from './repositoryV4';
import type { RepositoryV5 } from './repositoryV5';
import type { Session, SessionExercise, SessionSet } from '../lib/session';
import { sessionDurationMin } from '../lib/session';
import type { WorkSet, SetType } from '../lib/types';
import type { LogRow, LoadSession } from '../lib/progress';
import type { RunRow } from '../lib/runs';
import type { Template, TemplateExercise } from '../lib/templates';
import { BACKUP_TABLES, type Tables, type Row } from '../lib/backup';
import { totalVolume } from '../lib/volume';
import exercisesData from '../../assets/exercises.json';

export class SQLiteRepository implements RepositoryV5 {
  private db: SQLite.SQLiteDatabase | null = null;
  private ownerId: string;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(ownerId = 'local') {
    this.ownerId = ownerId;
  }

  setOwnerId(ownerId: string) {
    this.ownerId = ownerId;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  async init(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.db) {
          this.db = await SQLite.openDatabaseAsync('liffy.db');
        }

        if (Platform.OS === 'web') {
          await this.db.execAsync('PRAGMA journal_mode = MEMORY;');
        } else {
          await this.db.execAsync('PRAGMA journal_mode = WAL;');
        }
        await this.db.execAsync('PRAGMA foreign_keys = ON;');

        const versionRow = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
        const currentVersion = versionRow?.user_version ?? 0;

        for (let i = currentVersion; i < MIGRATIONS.length; i++) {
          await this.db.execAsync(MIGRATIONS[i]);
          await this.db.execAsync(`PRAGMA user_version = ${i + 1};`);
        }

        // Seed default exercise catalogue: insert only missing IDs on every launch
        const existingRows = await this.db.getAllAsync<{ id: string }>(
          'SELECT id FROM exercises;'
        );
        const existingIds = new Set(existingRows.map((r) => r.id));
        const missing = (exercisesData as ExerciseRow[]).filter((ex) => !existingIds.has(ex.id));

        if (missing.length > 0) {
          const now = new Date().toISOString();
          const CHUNK_SIZE = 50;
          for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
            const chunk = missing.slice(i, i + CHUNK_SIZE);
            const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, 0, \'local\', ?, 1)').join(', ');
            const params: any[] = [];
            for (const ex of chunk) {
              params.push(
                ex.id,
                ex.name,
                ex.category,
                ex.equipment ?? null,
                JSON.stringify(ex.primaryMuscles ?? []),
                JSON.stringify(ex.secondaryMuscles ?? []),
                now
              );
            }
            await this.db.runAsync(
              `INSERT OR IGNORE INTO exercises (id, name, category, equipment, primary_muscles, secondary_muscles, is_custom, owner_id, updated_at, dirty)
               VALUES ${placeholders};`,
              params
            );
          }
        }
        this.isInitialized = true;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private ensureDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('SQLiteRepository not initialized. Call init() first.');
    }
    return this.db;
  }

  async searchExercises(query: string, limit = 50): Promise<ExerciseRow[]> {
    const db = this.ensureDb();
    const trimmed = query.trim();
    const rows = await db.getAllAsync<any>(
      `SELECT id, name, category, equipment, primary_muscles, secondary_muscles, is_custom
       FROM exercises
       WHERE (owner_id = ? OR owner_id = 'local')
         AND deleted_at IS NULL
         AND name LIKE ?
       ORDER BY is_custom DESC, name ASC
       LIMIT ?;`,
      [this.ownerId, `%${trimmed}%`, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as ExerciseRow['category'],
      equipment: r.equipment ?? null,
      primaryMuscles: typeof r.primary_muscles === 'string' ? JSON.parse(r.primary_muscles) : (r.primary_muscles ?? []),
      secondaryMuscles: typeof r.secondary_muscles === 'string' ? JSON.parse(r.secondary_muscles) : (r.secondary_muscles ?? []),
      isCustom: Boolean(r.is_custom),
    }));
  }

  async createCustomExercise(e: Omit<ExerciseRow, 'isCustom'>): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO exercises (id, name, category, equipment, primary_muscles, secondary_muscles, is_custom, owner_id, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1);`,
      [
        e.id,
        e.name,
        e.category,
        e.equipment ?? null,
        JSON.stringify(e.primaryMuscles ?? []),
        JSON.stringify(e.secondaryMuscles ?? []),
        this.ownerId,
        now,
      ]
    );
  }

  async saveSession(s: Session): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Upsert workouts row
      await db.runAsync(
        `INSERT INTO workouts (id, name, started_at, ended_at, owner_id, updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           started_at = excluded.started_at,
           ended_at = excluded.ended_at,
           updated_at = excluded.updated_at,
           deleted_at = NULL,
           dirty = 1;`,
        [s.id, s.name, s.startedAt, s.endedAt, this.ownerId, now]
      );

      // 2. Soft-delete workout_exercises no longer in this session
      const currentExerciseIds = s.exercises.map((e) => e.id);
      if (currentExerciseIds.length > 0) {
        const placeholders = currentExerciseIds.map(() => '?').join(',');
        await db.runAsync(
          `UPDATE workout_exercises SET deleted_at = ?, dirty = 1
           WHERE workout_id = ? AND id NOT IN (${placeholders}) AND deleted_at IS NULL;`,
          [now, s.id, ...currentExerciseIds]
        );
      } else {
        await db.runAsync(
          `UPDATE workout_exercises SET deleted_at = ?, dirty = 1
           WHERE workout_id = ? AND deleted_at IS NULL;`,
          [now, s.id]
        );
      }

      // 3. Upsert workout_exercises and their sets
      for (let pos = 0; pos < s.exercises.length; pos++) {
        const ex = s.exercises[pos];
        await db.runAsync(
          `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, owner_id, updated_at, dirty)
           VALUES (?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET
             exercise_id = excluded.exercise_id,
             position = excluded.position,
             updated_at = excluded.updated_at,
             deleted_at = NULL,
             dirty = 1;`,
          [ex.id, s.id, ex.exerciseId, pos, this.ownerId, now]
        );

        // Soft-delete sets no longer in this exercise
        const currentSetIds = ex.sets.map((x) => x.id);
        if (currentSetIds.length > 0) {
          const setPlaceholders = currentSetIds.map(() => '?').join(',');
          await db.runAsync(
            `UPDATE sets SET deleted_at = ?, dirty = 1
             WHERE workout_exercise_id = ? AND id NOT IN (${setPlaceholders}) AND deleted_at IS NULL;`,
            [now, ex.id, ...currentSetIds]
          );
        } else {
          await db.runAsync(
            `UPDATE sets SET deleted_at = ?, dirty = 1
             WHERE workout_exercise_id = ? AND deleted_at IS NULL;`,
            [now, ex.id]
          );
        }

        // Upsert sets
        for (let setPos = 0; setPos < ex.sets.length; setPos++) {
          const st = ex.sets[setPos];
          const completedAt = st.done ? now : null;
          await db.runAsync(
            `INSERT INTO sets (id, workout_exercise_id, position, set_type, weight_kg, reps, rpe, completed_at, owner_id, updated_at, dirty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(id) DO UPDATE SET
               position = excluded.position,
               set_type = excluded.set_type,
               weight_kg = excluded.weight_kg,
               reps = excluded.reps,
               rpe = excluded.rpe,
               completed_at = CASE WHEN excluded.completed_at IS NOT NULL THEN COALESCE(sets.completed_at, excluded.completed_at) ELSE NULL END,
               updated_at = excluded.updated_at,
               deleted_at = NULL,
               dirty = 1;`,
            [
              st.id,
              ex.id,
              setPos,
              st.type,
              st.weightKg,
              st.reps,
              st.rpe ?? null,
              completedAt,
              this.ownerId,
              now,
            ]
          );
        }
      }
    });
  }

  private async hydrateSession(wRow: { id: string; name: string | null; started_at: string; ended_at: string | null }): Promise<Session> {
    const db = this.ensureDb();
    const exRows = await db.getAllAsync<any>(
      `SELECT id, exercise_id, position
       FROM workout_exercises
       WHERE workout_id = ? AND deleted_at IS NULL
       ORDER BY position ASC;`,
      [wRow.id]
    );

    const exercises: SessionExercise[] = [];
    for (const ex of exRows) {
      const setRows = await db.getAllAsync<any>(
        `SELECT id, position, set_type, weight_kg, reps, rpe, completed_at
         FROM sets
         WHERE workout_exercise_id = ? AND deleted_at IS NULL
         ORDER BY position ASC;`,
        [ex.id]
      );

      const sets: SessionSet[] = setRows.map((s) => ({
        id: s.id,
        weightKg: Number(s.weight_kg),
        reps: Number(s.reps),
        rpe: s.rpe != null ? Number(s.rpe) : null,
        type: s.set_type as SetType,
        done: Boolean(s.completed_at),
      }));

      exercises.push({
        id: ex.id,
        exerciseId: ex.exercise_id,
        sets,
      });
    }

    return {
      id: wRow.id,
      name: wRow.name || 'Workout',
      startedAt: wRow.started_at,
      endedAt: wRow.ended_at,
      exercises,
    };
  }

  async getActiveSession(): Promise<Session | null> {
    const db = this.ensureDb();
    const row = await db.getFirstAsync<any>(
      `SELECT id, name, started_at, ended_at
       FROM workouts
       WHERE owner_id = ? AND ended_at IS NULL AND deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1;`,
      [this.ownerId]
    );
    if (!row) return null;
    return this.hydrateSession(row);
  }

  async discardSession(id: string): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE workouts SET deleted_at = ?, dirty = 1 WHERE id = ? AND owner_id = ?;`,
        [now, id, this.ownerId]
      );
      await db.runAsync(
        `UPDATE workout_exercises SET deleted_at = ?, dirty = 1 WHERE workout_id = ? AND owner_id = ?;`,
        [now, id, this.ownerId]
      );
      await db.runAsync(
        `UPDATE sets SET deleted_at = ?, dirty = 1
         WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?) AND owner_id = ?;`,
        [now, id, this.ownerId]
      );
    });
  }

  async listWorkouts(limit: number, offset: number): Promise<WorkoutSummary[]> {
    const db = this.ensureDb();
    const rows = await db.getAllAsync<any>(
      `SELECT id, name, started_at, ended_at
       FROM workouts
       WHERE owner_id = ? AND ended_at IS NOT NULL AND deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?;`,
      [this.ownerId, limit, offset]
    );

    const summaries: WorkoutSummary[] = [];
    for (const r of rows) {
      const exRows = await db.getAllAsync<{ name: string }>(
        `SELECT DISTINCT e.name
         FROM workout_exercises we
         JOIN exercises e ON we.exercise_id = e.id
         WHERE we.workout_id = ? AND we.deleted_at IS NULL
         ORDER BY we.position ASC;`,
        [r.id]
      );

      const setRows = await db.getAllAsync<any>(
        `SELECT s.weight_kg, s.reps, s.set_type
         FROM sets s
         JOIN workout_exercises we ON s.workout_exercise_id = we.id
         WHERE we.workout_id = ? AND s.completed_at IS NOT NULL AND s.deleted_at IS NULL;`,
        [r.id]
      );

      const workSets: WorkSet[] = setRows.map((s) => ({
        weightKg: Number(s.weight_kg),
        reps: Number(s.reps),
        type: s.set_type as SetType,
      }));

      const volumeKg = totalVolume(workSets);
      const durationMin = sessionDurationMin({
        id: r.id,
        name: r.name || 'Workout',
        startedAt: r.started_at,
        endedAt: r.ended_at,
        exercises: [],
      });

      summaries.push({
        id: r.id,
        name: r.name || 'Workout',
        startedAt: r.started_at,
        durationMin,
        volumeKg,
        exerciseNames: exRows.map((x) => x.name),
      });
    }

    return summaries;
  }

  async getWorkout(id: string): Promise<Session | null> {
    const db = this.ensureDb();
    const row = await db.getFirstAsync<any>(
      `SELECT id, name, started_at, ended_at
       FROM workouts
       WHERE id = ? AND owner_id = ? AND deleted_at IS NULL;`,
      [id, this.ownerId]
    );
    if (!row) return null;
    return this.hydrateSession(row);
  }

  async deleteWorkout(id: string): Promise<void> {
    return this.discardSession(id);
  }

  async getExerciseHistory(exerciseId: string): Promise<WorkSet[]> {
    const db = this.ensureDb();
    const rows = await db.getAllAsync<any>(
      `SELECT s.weight_kg, s.reps, s.rpe, s.set_type
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       WHERE we.exercise_id = ? AND w.owner_id = ?
         AND s.completed_at IS NOT NULL
         AND s.deleted_at IS NULL AND we.deleted_at IS NULL AND w.deleted_at IS NULL
       ORDER BY w.started_at DESC, s.position DESC;`,
      [exerciseId, this.ownerId]
    );

    return rows.map((r) => ({
      weightKg: Number(r.weight_kg),
      reps: Number(r.reps),
      rpe: r.rpe != null ? Number(r.rpe) : null,
      type: r.set_type as SetType,
    }));
  }

  async getLastSets(exerciseId: string): Promise<WorkSet[]> {
    const db = this.ensureDb();
    const lastWorkout = await db.getFirstAsync<{ id: string }>(
      `SELECT w.id
       FROM workouts w
       JOIN workout_exercises we ON we.workout_id = w.id
       WHERE we.exercise_id = ? AND w.owner_id = ?
         AND w.ended_at IS NOT NULL
         AND w.deleted_at IS NULL AND we.deleted_at IS NULL
       ORDER BY w.started_at DESC
       LIMIT 1;`,
      [exerciseId, this.ownerId]
    );

    if (!lastWorkout) return [];

    const rows = await db.getAllAsync<any>(
      `SELECT s.weight_kg, s.reps, s.rpe, s.set_type
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       WHERE we.workout_id = ? AND we.exercise_id = ?
         AND s.completed_at IS NOT NULL
         AND s.deleted_at IS NULL AND we.deleted_at IS NULL
       ORDER BY s.position ASC;`,
      [lastWorkout.id, exerciseId]
    );

    return rows.map((r) => ({
      weightKg: Number(r.weight_kg),
      reps: Number(r.reps),
      rpe: r.rpe != null ? Number(r.rpe) : null,
      type: r.set_type as SetType,
    }));
  }

  async claimLocalData(userId: string): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      for (const table of SYNCED_TABLES) {
        await db.runAsync(
          `UPDATE ${table} SET owner_id = ?, updated_at = ?, dirty = 1 WHERE owner_id = 'local';`,
          [userId, now]
        );
      }
    });
    this.ownerId = userId;
  }

  // --- RepositoryV3 Methods ---

  async getTrainingLog(sinceIso: string): Promise<LogRow[]> {
    const db = this.ensureDb();
    const rows = await db.getAllAsync<any>(
      `SELECT w.id as workout_id, w.started_at, we.exercise_id,
              e.primary_muscles, e.secondary_muscles,
              s.weight_kg, s.reps, s.rpe, s.set_type
       FROM sets s
       JOIN workout_exercises we ON s.workout_exercise_id = we.id
       JOIN workouts w ON we.workout_id = w.id
       JOIN exercises e ON we.exercise_id = e.id
       WHERE w.owner_id = ?
         AND w.ended_at IS NOT NULL
         AND w.started_at >= ?
         AND s.completed_at IS NOT NULL
         AND s.set_type != 'warmup'
         AND w.deleted_at IS NULL
         AND we.deleted_at IS NULL
         AND s.deleted_at IS NULL
         AND e.deleted_at IS NULL
       ORDER BY w.started_at ASC, we.position ASC, s.position ASC;`,
      [this.ownerId, sinceIso]
    );

    return rows.map((r) => ({
      workoutId: r.workout_id,
      startedAt: r.started_at,
      exerciseId: r.exercise_id,
      primaryMuscles: typeof r.primary_muscles === 'string' ? JSON.parse(r.primary_muscles) : (r.primary_muscles ?? []),
      secondaryMuscles: typeof r.secondary_muscles === 'string' ? JSON.parse(r.secondary_muscles) : (r.secondary_muscles ?? []),
      set: {
        weightKg: Number(r.weight_kg),
        reps: Number(r.reps),
        rpe: r.rpe != null ? Number(r.rpe) : null,
        type: r.set_type as SetType,
      },
    }));
  }

  async getLoadSessions(sinceIso: string): Promise<LoadSession[]> {
    const db = this.ensureDb();
    // 1. Finished lifting workouts
    const workoutRows = await db.getAllAsync<any>(
      `SELECT w.id, w.started_at, w.ended_at,
              AVG(s.rpe) as avg_rpe,
              COUNT(s.rpe) as rpe_count
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id AND we.deleted_at IS NULL
       LEFT JOIN sets s ON s.workout_exercise_id = we.id AND s.completed_at IS NOT NULL AND s.deleted_at IS NULL
       WHERE w.owner_id = ?
         AND w.ended_at IS NOT NULL
         AND w.started_at >= ?
         AND w.deleted_at IS NULL
       GROUP BY w.id, w.started_at, w.ended_at
       ORDER BY w.started_at ASC;`,
      [this.ownerId, sinceIso]
    );

    const liftingSessions: LoadSession[] = workoutRows.map((w) => {
      const durationMin = sessionDurationMin({
        id: w.id,
        name: 'Workout',
        startedAt: w.started_at,
        endedAt: w.ended_at,
        exercises: [],
      });
      const avgRpe = w.rpe_count > 0 && w.avg_rpe != null ? Number(w.avg_rpe) : null;
      return {
        startedAt: w.started_at,
        durationMin,
        rpe: avgRpe,
      };
    });

    // 2. Runs
    const runRows = await db.getAllAsync<any>(
      `SELECT started_at, duration_s, rpe
       FROM runs
       WHERE owner_id = ?
         AND started_at >= ?
         AND deleted_at IS NULL
       ORDER BY started_at ASC;`,
      [this.ownerId, sinceIso]
    );

    const runSessions: LoadSession[] = runRows.map((r) => ({
      startedAt: r.started_at,
      durationMin: Math.max(0, Math.round(Number(r.duration_s) / 60)),
      rpe: r.rpe != null ? Number(r.rpe) : null,
    }));

    const combined = [...liftingSessions, ...runSessions];
    combined.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    return combined;
  }

  async listTemplates(): Promise<Template[]> {
    const db = this.ensureDb();
    const rows = await db.getAllAsync<any>(
      `SELECT id, name
       FROM templates
       WHERE owner_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC;`,
      [this.ownerId]
    );

    const templates: Template[] = [];
    for (const row of rows) {
      const exRows = await db.getAllAsync<any>(
        `SELECT exercise_id, sets, rep_min, rep_max, increment_kg
         FROM template_exercises
         WHERE template_id = ? AND deleted_at IS NULL
         ORDER BY position ASC;`,
        [row.id]
      );

      const exercises: TemplateExercise[] = exRows.map((e) => ({
        exerciseId: e.exercise_id,
        sets: Number(e.sets),
        repMin: Number(e.rep_min),
        repMax: Number(e.rep_max),
        incrementKg: Number(e.increment_kg),
      }));

      templates.push({
        id: row.id,
        name: row.name,
        exercises,
      });
    }

    return templates;
  }

  async saveTemplate(t: Template): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Upsert template
      await db.runAsync(
        `INSERT INTO templates (id, name, owner_id, updated_at, dirty)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           updated_at = excluded.updated_at,
           deleted_at = NULL,
           dirty = 1;`,
        [t.id, t.name, this.ownerId, now]
      );

      // 2. Soft-delete existing template_exercises
      await db.runAsync(
        `UPDATE template_exercises SET deleted_at = ?, dirty = 1
         WHERE template_id = ? AND deleted_at IS NULL;`,
        [now, t.id]
      );

      // 3. Insert new template_exercises
      for (let pos = 0; pos < t.exercises.length; pos++) {
        const te = t.exercises[pos];
        const teId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO template_exercises (id, template_id, exercise_id, position, sets, rep_min, rep_max, increment_kg, owner_id, updated_at, dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
          [teId, t.id, te.exerciseId, pos, te.sets, te.repMin, te.repMax, te.incrementKg, this.ownerId, now]
        );
      }
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE templates SET deleted_at = ?, dirty = 1 WHERE id = ? AND owner_id = ?;`,
        [now, id, this.ownerId]
      );
      await db.runAsync(
        `UPDATE template_exercises SET deleted_at = ?, dirty = 1 WHERE template_id = ? AND owner_id = ?;`,
        [now, id, this.ownerId]
      );
    });
  }

  async getExerciseNames(ids: string[]): Promise<Record<string, string>> {
    if (!ids || ids.length === 0) return {};
    const db = this.ensureDb();
    const placeholders = ids.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ id: string; name: string }>(
      `SELECT id, name FROM exercises WHERE id IN (${placeholders}) AND deleted_at IS NULL;`,
      ids
    );

    const out: Record<string, string> = {};
    for (const r of rows) {
      out[r.id] = r.name;
    }
    return out;
  }

  // --- RepositoryV4 Methods ---

  async exportAllTables(): Promise<Tables> {
    const db = this.ensureDb();
    const tables: Tables = {};
    for (const table of BACKUP_TABLES) {
      if (table === 'exercises') {
        const rows = await db.getAllAsync<any>(
          `SELECT * FROM exercises WHERE owner_id = ? OR (owner_id = 'local' AND is_custom = 1);`,
          [this.ownerId]
        );
        tables[table] = rows.map((r) => ({
          ...r,
          is_custom: Boolean(r.is_custom),
          primary_muscles: typeof r.primary_muscles === 'string' ? JSON.parse(r.primary_muscles) : r.primary_muscles,
          secondary_muscles: typeof r.secondary_muscles === 'string' ? JSON.parse(r.secondary_muscles) : r.secondary_muscles,
        }));
      } else {
        const rows = await db.getAllAsync<any>(
          `SELECT * FROM ${table} WHERE owner_id = ?;`,
          [this.ownerId]
        );
        tables[table] = rows;
      }
    }
    return tables;
  }

  async importRows(upserts: Tables): Promise<void> {
    const db = this.ensureDb();
    await db.withTransactionAsync(async () => {
      for (const table of BACKUP_TABLES) {
        const rows = upserts[table];
        if (!rows || rows.length === 0) continue;

        for (const row of rows) {
          if (table === 'runs' && row.external_id) {
            await db.runAsync(
              `DELETE FROM runs WHERE owner_id = ? AND source = ? AND external_id = ? AND id != ?;`,
              [this.ownerId, (row.source as string) || 'manual', String(row.external_id), row.id]
            );
          }
          const keys = Object.keys(row).filter((k) => k !== 'owner_id' && k !== 'dirty');
          const allKeys = [...keys, 'owner_id', 'dirty'];
          const values: any[] = keys.map((k) => {
            const v = row[k];
            if (v === undefined || v === null) return null;
            if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
              return JSON.stringify(v);
            }
            if (typeof v === 'boolean') {
              return v ? 1 : 0;
            }
            return v;
          });
          values.push(this.ownerId, 1);

          const placeholders = allKeys.map(() => '?').join(',');
          const updateClauses = keys
            .filter((k) => k !== 'id')
            .map((k) => `${k} = excluded.${k}`)
            .concat(['owner_id = excluded.owner_id', 'dirty = excluded.dirty'])
            .join(', ');

          await db.runAsync(
            `INSERT INTO ${table} (${allKeys.join(',')}) VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${updateClauses};`,
            values
          );
        }
      }
    });
  }

  async deleteAllUserData(): Promise<void> {
    const db = this.ensureDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM sets WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM workout_exercises WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM workouts WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM template_exercises WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM templates WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM runs WHERE owner_id = ?;`, [this.ownerId]);
      await db.runAsync(`DELETE FROM exercises WHERE owner_id = ? AND is_custom = 1;`, [this.ownerId]);
    });
  }

  // --- RepositoryV5 Methods ---

  async listRuns(limit: number, offset: number): Promise<RunRow[]> {
    const db = this.ensureDb();
    const rows = await db.getAllAsync<any>(
      `SELECT id, started_at, distance_m, duration_s, avg_hr, rpe, notes, source, external_id
       FROM runs
       WHERE owner_id = ? AND deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?;`,
      [this.ownerId, limit, offset]
    );

    return rows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      distanceM: Number(r.distance_m),
      durationS: Number(r.duration_s),
      avgHr: r.avg_hr != null ? Number(r.avg_hr) : null,
      rpe: r.rpe != null ? Number(r.rpe) : null,
      notes: r.notes ?? null,
      source: (r.source ?? 'manual') as 'manual' | 'gpx',
      externalId: r.external_id ?? null,
    }));
  }

  async saveRun(run: RunRow): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO runs (id, owner_id, started_at, distance_m, duration_s, avg_hr, rpe, notes, source, external_id, updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         started_at = excluded.started_at,
         distance_m = excluded.distance_m,
         duration_s = excluded.duration_s,
         avg_hr = excluded.avg_hr,
         rpe = excluded.rpe,
         notes = excluded.notes,
         source = excluded.source,
         external_id = excluded.external_id,
         updated_at = excluded.updated_at,
         deleted_at = NULL,
         dirty = 1;`,
      [
        run.id,
        this.ownerId,
        run.startedAt,
        run.distanceM,
        run.durationS,
        run.avgHr ?? null,
        run.rpe ?? null,
        run.notes ?? null,
        run.source,
        run.externalId ?? null,
        now,
      ]
    );
  }

  async deleteRun(id: string): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE runs SET deleted_at = ?, dirty = 1 WHERE id = ? AND owner_id = ? AND deleted_at IS NULL;`,
      [now, id, this.ownerId]
    );
  }

  async importRun(run: RunRow): Promise<'added' | 'duplicate'> {
    const db = this.ensureDb();
    const now = new Date().toISOString();

    // Check if duplicate by (owner_id, source, external_id) even if soft-deleted
    if (run.externalId) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM runs WHERE owner_id = ? AND source = ? AND external_id = ?;`,
        [this.ownerId, run.source, run.externalId]
      );
      if (existing) {
        return 'duplicate';
      }
    }

    // Check if duplicate by id
    const existingById = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM runs WHERE id = ? AND owner_id = ?;`,
      [run.id, this.ownerId]
    );
    if (existingById) {
      return 'duplicate';
    }

    try {
      await db.runAsync(
        `INSERT INTO runs (id, owner_id, started_at, distance_m, duration_s, avg_hr, rpe, notes, source, external_id, updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [
          run.id,
          this.ownerId,
          run.startedAt,
          run.distanceM,
          run.durationS,
          run.avgHr ?? null,
          run.rpe ?? null,
          run.notes ?? null,
          run.source,
          run.externalId ?? null,
          now,
        ]
      );
      return 'added';
    } catch (err: any) {
      if (err?.message && /unique|constraint/i.test(err.message)) {
        return 'duplicate';
      }
      throw err;
    }
  }
}

// Export singleton instance for the app
export const repository: RepositoryV5 & { setOwnerId(ownerId: string): void; getOwnerId(): string } = new SQLiteRepository('local');

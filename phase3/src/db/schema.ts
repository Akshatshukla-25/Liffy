/**
 * Local SQLite schema (expo-sqlite). Offline-first: this is the source of truth on the device.
 * owner_id = 'local' for guest data. On sign-in, claimLocalData(userId) re-owns those rows.
 * dirty = 1 means "changed since last sync", unused until cloud sync is added, but kept now
 * so adding sync later needs no data migration.
 * Timestamps are ISO-8601 text. Deletes are soft (deleted_at).
 * Versioning: PRAGMA user_version; run every migration with index >= current, in order.
 */
const common = `owner_id TEXT NOT NULL DEFAULT 'local',
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1`;

export const MIGRATIONS: string[] = [
  `
  CREATE TABLE exercises (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('strength','bodyweight','cardio','mobility')),
    equipment TEXT, primary_muscles TEXT NOT NULL DEFAULT '[]', secondary_muscles TEXT NOT NULL DEFAULT '[]',
    is_custom INTEGER NOT NULL DEFAULT 0, ${common}
  );
  CREATE INDEX idx_exercises_name ON exercises(name);

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY, name TEXT, notes TEXT,
    started_at TEXT NOT NULL, ended_at TEXT, ${common}
  );
  CREATE INDEX idx_workouts_started ON workouts(owner_id, started_at DESC);

  CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY, workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id), position INTEGER NOT NULL, notes TEXT, ${common}
  );
  CREATE INDEX idx_we_workout ON workout_exercises(workout_id);

  CREATE TABLE sets (
    id TEXT PRIMARY KEY, workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'working' CHECK (set_type IN ('warmup','working','drop','failure')),
    weight_kg REAL NOT NULL DEFAULT 0, reps INTEGER NOT NULL DEFAULT 0, rpe REAL,
    completed_at TEXT, ${common}
  );
  CREATE INDEX idx_sets_we ON sets(workout_exercise_id);

  CREATE TABLE runs (
    id TEXT PRIMARY KEY, started_at TEXT NOT NULL, distance_m REAL NOT NULL, duration_s INTEGER NOT NULL,
    avg_hr INTEGER, rpe REAL, route TEXT, notes TEXT, ${common}
  );
  CREATE INDEX idx_runs_started ON runs(owner_id, started_at DESC);
  `,
  `
  CREATE TABLE templates (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, notes TEXT, ${common}
  );
  CREATE TABLE template_exercises (
    id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id), position INTEGER NOT NULL,
    sets INTEGER NOT NULL DEFAULT 3, rep_min INTEGER NOT NULL DEFAULT 8, rep_max INTEGER NOT NULL DEFAULT 12,
    increment_kg REAL NOT NULL DEFAULT 2.5, ${common}
  );
  CREATE INDEX idx_te_template ON template_exercises(template_id);
  `,
];

export const SYNCED_TABLES = ['exercises', 'workouts', 'workout_exercises', 'sets', 'runs', 'templates', 'template_exercises'] as const;

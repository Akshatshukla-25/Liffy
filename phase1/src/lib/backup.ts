/** Import order matters for foreign keys. */
export const BACKUP_TABLES = ['exercises', 'workouts', 'workout_exercises', 'sets', 'runs', 'templates', 'template_exercises'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];
export type Row = { id: string; updated_at: string; deleted_at?: string | null; [k: string]: unknown };
export type Tables = Partial<Record<BackupTable, Row[]>>;

export interface BackupFile { format: 'liffy-backup'; version: 1; exportedAt: string; tables: Tables; }

const DEVICE_FIELDS = ['owner_id', 'dirty'];

/**
 * Build a backup from DB rows. Drops soft-deleted rows and device-specific columns.
 * Only CUSTOM exercises are exported: the built-in catalogue ships with the app (ids must be stable).
 */
export function buildBackup(tables: Tables, now: string): BackupFile {
  const out: Tables = {};
  for (const t of BACKUP_TABLES) {
    let rows = (tables[t] ?? []).filter(r => !r.deleted_at);
    if (t === 'exercises') rows = rows.filter(r => r.is_custom === 1 || r.is_custom === true);
    out[t] = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !DEVICE_FIELDS.includes(k)))) as Row[];
  }
  return { format: 'liffy-backup', version: 1, exportedAt: now, tables: out };
}

export type Validation = { ok: true; data: BackupFile } | { ok: false; error: string };

export function validateBackup(input: unknown): Validation {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Not a valid backup file.' };
  const o = input as Record<string, unknown>;
  if (o.format !== 'liffy-backup') return { ok: false, error: 'This file is not a backup from this app.' };
  if (typeof o.version !== 'number' || o.version > 1) return { ok: false, error: 'This backup is from a newer app version. Update the app first.' };
  if (!o.tables || typeof o.tables !== 'object') return { ok: false, error: 'Backup has no data.' };
  const tables = o.tables as Record<string, unknown>;
  for (const t of Object.keys(tables)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(t)) return { ok: false, error: `Unknown table "${t}".` };
    const rows = tables[t];
    if (!Array.isArray(rows)) return { ok: false, error: `Table "${t}" is malformed.` };
    for (const r of rows) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || typeof r.updated_at !== 'string' || Number.isNaN(Date.parse(r.updated_at)))
        return { ok: false, error: `Table "${t}" has an invalid row.` };
    }
  }
  return { ok: true, data: o as unknown as BackupFile };
}

/** Rows to write: new ids, or backup rows strictly newer than the local copy. Local deletes that are newer win. */
export function planImport(local: Tables, backup: BackupFile): { upserts: Tables; counts: Record<string, number> } {
  const upserts: Tables = {};
  const counts: Record<string, number> = {};
  for (const t of BACKUP_TABLES) {
    const have = new Map((local[t] ?? []).map(r => [r.id, r]));
    const take = (backup.tables[t] ?? []).filter(r => {
      const l = have.get(r.id);
      return !l || Date.parse(r.updated_at) > Date.parse(l.updated_at);
    });
    upserts[t] = take;
    counts[t] = take.length;
  }
  return { upserts, counts };
}

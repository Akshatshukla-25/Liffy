export interface Syncable {
  id: string;
  updatedAt: string; // ISO 8601
  deletedAt?: string | null;
}

const t = (iso: string) => Date.parse(iso);

/** Last-write-wins by updatedAt. Tie -> remote wins (server is the tiebreaker). */
export function resolveConflict<T extends Syncable>(local: T, remote: T): T {
  return t(local.updatedAt) > t(remote.updatedAt) ? local : remote;
}

/** Merge two record lists by id. Soft-deleted rows are kept so deletes propagate. */
export function mergeRecords<T extends Syncable>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) {
    const r = map.get(l.id);
    map.set(l.id, r ? resolveConflict(l, r) : l);
  }
  return [...map.values()];
}

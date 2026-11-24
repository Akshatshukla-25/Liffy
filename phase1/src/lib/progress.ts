import { WorkSet, isWorkingSet } from './types';
import { estimate1RM } from './oneRepMax';
import { loadRatio, sessionLoad } from './load';

/** One finished set joined with its workout + exercise. Repository.getTrainingLog returns these. */
export interface LogRow {
  workoutId: string; startedAt: string; exerciseId: string;
  primaryMuscles: string[]; secondaryMuscles: string[]; set: WorkSet;
}
const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(iso);

export interface Best { e1rm: number; date: string; }

/** Best estimated 1RM per exercise (working sets only, <=12 reps). */
export function best1RMs(rows: LogRow[]): Record<string, Best> {
  const out: Record<string, Best> = {};
  for (const r of rows) {
    if (!isWorkingSet(r.set)) continue;
    const e = estimate1RM(r.set.weightKg, r.set.reps);
    if (e !== null && (!out[r.exerciseId] || e > out[r.exerciseId].e1rm)) out[r.exerciseId] = { e1rm: e, date: r.startedAt };
  }
  return out;
}

/** Best e1RM per workout for one exercise, oldest first (chart data). */
export function e1rmTrend(rows: LogRow[], exerciseId: string): { date: string; e1rm: number }[] {
  const per = new Map<string, { date: string; e1rm: number }>();
  for (const r of rows) {
    if (r.exerciseId !== exerciseId || !isWorkingSet(r.set)) continue;
    const e = estimate1RM(r.set.weightKg, r.set.reps);
    if (e === null) continue;
    const cur = per.get(r.workoutId);
    if (!cur || e > cur.e1rm) per.set(r.workoutId, { date: r.startedAt, e1rm: e });
  }
  return [...per.values()].sort((a, b) => ms(a.date) - ms(b.date));
}

/** Rolling 7-day buckets ending at `now`; index 0 = oldest. Returns tonnage per bucket. */
export function weeklyVolume(rows: LogRow[], weeks: number, now: string): number[] {
  const out = new Array<number>(weeks).fill(0);
  for (const r of rows) {
    if (!isWorkingSet(r.set)) continue;
    const age = Math.floor((ms(now) - ms(r.startedAt)) / (7 * DAY));
    if (age >= 0 && age < weeks) out[weeks - 1 - age] += r.set.weightKg * r.set.reps;
  }
  return out;
}

/** Hard sets per muscle in the last 7 days (primary 1, secondary 0.5). */
export function muscleSetsLast7(rows: LogRow[], now: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const age = ms(now) - ms(r.startedAt);
    if (age < 0 || age >= 7 * DAY || !isWorkingSet(r.set)) continue;
    for (const m of r.primaryMuscles) out[m] = (out[m] ?? 0) + 1;
    for (const m of r.secondaryMuscles) out[m] = (out[m] ?? 0) + 0.5;
  }
  return out;
}

export interface LoadSession { startedAt: string; durationMin: number; rpe?: number | null; }
export const DEFAULT_RPE = 6; // used when a session has no RPE logged

/** Weekly session-RPE load (lifting + running together), 7-day buckets, index 0 = oldest. */
export function weeklyLoads(sessions: LoadSession[], weeks: number, now: string): number[] {
  const out = new Array<number>(weeks).fill(0);
  for (const s of sessions) {
    const age = Math.floor((ms(now) - ms(s.startedAt)) / (7 * DAY));
    if (age >= 0 && age < weeks) out[weeks - 1 - age] += sessionLoad(s.durationMin, s.rpe ?? DEFAULT_RPE);
  }
  return out;
}

export type LoadBand = 'low' | 'optimal' | 'high' | 'spike';
export interface LoadStatus { ratio: number; band: LoadBand; }

/** Needs >= 3 of the previous 4 weeks with data, else null ("not enough data yet"). */
export function loadStatus(weekly: number[]): LoadStatus | null {
  const prev = weekly.slice(-5, -1);
  if (prev.filter(x => x > 0).length < 3) return null;
  const ratio = loadRatio(weekly);
  if (ratio === null) return null;
  const band: LoadBand = ratio < 0.8 ? 'low' : ratio <= 1.3 ? 'optimal' : ratio <= 1.5 ? 'high' : 'spike';
  return { ratio, band };
}

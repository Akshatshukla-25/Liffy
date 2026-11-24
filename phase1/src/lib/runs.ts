import { paceSecPerKm } from './running';

export interface RunRow {
  id: string; startedAt: string; distanceM: number; durationS: number;
  avgHr: number | null; rpe: number | null; notes: string | null;
  source: 'manual' | 'gpx'; externalId: string | null;
}

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(iso);

/** HR zone ranges in bpm from max HR (5 zones: 50-60, 60-70, 70-80, 80-90, 90-100 %). */
export function zoneRanges(maxHr: number): { zone: 1 | 2 | 3 | 4 | 5; minBpm: number; maxBpm: number }[] {
  const edges = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  return ([1, 2, 3, 4, 5] as const).map(z => ({ zone: z, minBpm: Math.round(maxHr * edges[z - 1]), maxBpm: Math.round(maxHr * edges[z]) }));
}

export interface RunSummary { weekKm: number; prev4AvgKm: number; longestKm: number; avgPaceSecPerKm: number | null; }

/** weekKm = last 7 days; prev4AvgKm = mean of the 4 weeks before; longest + pace use the last 28 days. */
export function runSummary(runs: RunRow[], now: string): RunSummary {
  const n = ms(now);
  const wk = [0, 0, 0, 0, 0];
  let longest = 0, dist28 = 0, dur28 = 0;
  for (const r of runs) {
    const age = n - ms(r.startedAt);
    if (age < 0) continue;
    const w = Math.floor(age / (7 * DAY));
    if (w < 5) wk[w] += r.distanceM / 1000;
    if (age < 28 * DAY) { longest = Math.max(longest, r.distanceM / 1000); dist28 += r.distanceM; dur28 += r.durationS; }
  }
  return {
    weekKm: wk[0],
    prev4AvgKm: (wk[1] + wk[2] + wk[3] + wk[4]) / 4,
    longestKm: longest,
    avgPaceSecPerKm: paceSecPerKm(dist28, dur28),
  };
}

/** Manual-entry helper: "mm:ss" or "h:mm:ss" -> seconds. Null if invalid. */
export function parseDuration(text: string): number | null {
  const p = text.trim().split(':').map(Number);
  if (p.length < 2 || p.length > 3 || p.some(x => !Number.isInteger(x) || x < 0)) return null;
  const [h, m, s] = p.length === 3 ? p : [0, p[0], p[1]];
  if (m > 59 || s > 59) return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

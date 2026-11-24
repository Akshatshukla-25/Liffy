import { RunRow } from './runs';

export interface GpxPoint { lat: number; lon: number; timeMs: number | null; hr: number | null; }
export interface GpxSummary { startedAt: string; distanceM: number; movingS: number; elapsedS: number; avgHr: number | null; points: number; }

const MAX_CHARS = 25_000_000;
const R = 6_371_000;

/** Reads the <type> of the first track, e.g. "running". Null if absent. */
export function gpxType(xml: string): string | null {
  const m = /<trk\b[\s\S]*?<type>\s*([^<]*?)\s*<\/type>/.exec(xml);
  return m ? m[1] : null;
}
/** Unknown type counts as a run (the user confirms in the preview anyway). */
export const looksLikeRun = (type: string | null): boolean => type === null || type === '' || /run|jog/i.test(type);

/** Lightweight GPX reader (no XML library): track points with lat, lon, <time> and any <*:hr>. Never throws. */
export function parseGpx(xml: string): GpxPoint[] {
  if (typeof xml !== 'string' || xml.length > MAX_CHARS) return [];
  const pts: GpxPoint[] = [];
  const re = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1], body = m[2] ?? '';
    const lat = /\blat\s*=\s*["']([^"']+)["']/.exec(attrs), lon = /\blon\s*=\s*["']([^"']+)["']/.exec(attrs);
    if (!lat || !lon) continue;
    const la = Number(lat[1]), lo = Number(lon[1]);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) continue;
    const t = /<time>\s*([^<]+?)\s*<\/time>/.exec(body);
    const ms = t ? Date.parse(t[1]) : NaN;
    const h = /<(?:\w+:)?hr>\s*(\d+(?:\.\d+)?)\s*<\/(?:\w+:)?hr>/.exec(body);
    const hr = h ? Number(h[1]) : null;
    pts.push({ lat: la, lon: lo, timeMs: Number.isNaN(ms) ? null : ms, hr: hr !== null && hr >= 30 && hr <= 240 ? hr : null });
  }
  return pts;
}

export function haversineM(a: GpxPoint, b: GpxPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/**
 * Distance = sum of plausible segments (GPS jumps above 15 m/s are ignored).
 * Moving time = sum of segment durations <= 30 s with speed >= 0.5 m/s (pauses/auto-pause excluded).
 * Needs at least 2 timestamped points; otherwise null.
 */
export function summarizeGpx(points: GpxPoint[]): GpxSummary | null {
  const p = points.filter(x => x.timeMs !== null);
  if (p.length < 2) return null;
  let dist = 0, moving = 0;
  for (let i = 1; i < p.length; i++) {
    const dt = (p[i].timeMs! - p[i - 1].timeMs!) / 1000;
    if (dt <= 0) continue;
    const d = haversineM(p[i - 1], p[i]);
    const v = d / dt;
    if (v > 15) continue;
    dist += d;
    if (dt <= 30 && v >= 0.5) moving += dt;
  }
  const hrs = p.filter(x => x.hr !== null).map(x => x.hr!);
  const first = p[0].timeMs!, last = p[p.length - 1].timeMs!;
  if (dist < 1 || moving < 1) return null;
  return {
    startedAt: new Date(first).toISOString(), distanceM: dist, movingS: Math.round(moving), elapsedS: Math.round((last - first) / 1000),
    avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null, points: p.length,
  };
}

/** Deterministic id from the start time => importing the same file twice never duplicates. */
export function gpxToRun(s: GpxSummary): RunRow {
  const key = String(Date.parse(s.startedAt));
  return { id: `gpx-${key}`, startedAt: s.startedAt, distanceM: Math.round(s.distanceM), durationS: s.movingS, avgHr: s.avgHr, rpe: null, notes: null, source: 'gpx', externalId: key };
}

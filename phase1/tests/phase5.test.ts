import { describe, it, expect } from 'vitest';
import { zoneRanges, runSummary, parseDuration, RunRow } from '../src/lib/runs';
import { parseGpx, summarizeGpx, gpxToRun, gpxType, looksLikeRun, haversineM } from '../src/lib/gpx';

const NOW = '2026-11-03T12:00:00Z';
const run = (startedAt: string, km: number, min: number): RunRow =>
  ({ id: startedAt, startedAt, distanceM: km * 1000, durationS: min * 60, avgHr: null, rpe: null, notes: null, source: 'manual', externalId: null });

describe('runs', () => {
  it('zone ranges', () => {
    const z = zoneRanges(190);
    expect(z[0]).toEqual({ zone: 1, minBpm: 95, maxBpm: 114 });
    expect(z[4].maxBpm).toBe(190);
  });
  it('summary', () => {
    const s = runSummary([run('2026-11-02T08:00:00Z', 10, 50), run('2026-10-28T08:00:00Z', 5, 30), run('2026-10-20T08:00:00Z', 8, 40)], NOW);
    expect(s.weekKm).toBe(15);
    expect(s.prev4AvgKm).toBeCloseTo(2, 5);
    expect(s.longestKm).toBe(10);
    expect(s.avgPaceSecPerKm).toBeCloseTo((120 * 60) / 23, 3);
  });
  it('empty summary', () => expect(runSummary([], NOW)).toEqual({ weekKm: 0, prev4AvgKm: 0, longestKm: 0, avgPaceSecPerKm: null }));
  it('parse duration', () => {
    expect(parseDuration('25:30')).toBe(1530);
    expect(parseDuration('1:05:00')).toBe(3900);
    expect(parseDuration('99:99')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('0:00')).toBeNull();
  });
});

// Synthetic track on the equator heading east at 3 m/s; 1 degree of longitude = 111194.9 m.
const DEG_PER_M = 1 / 111194.93;
function gpx(opts: { n: number; speed?: number; gapAt?: number; gapS?: number; hr?: number; type?: string; t0?: string }) {
  const { n, speed = 3, gapAt = -1, gapS = 0, hr, type = 'running', t0 = '2026-11-01T06:00:00Z' } = opts;
  let t = Date.parse(t0), x = 0;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i === gapAt) t += gapS * 1000; // paused: time passes, no movement
    else if (i > 0) { t += 1000; x += speed; }
    const h = hr ? `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>` : '';
    pts.push(`<trkpt lat="0.0" lon="${(x * DEG_PER_M).toFixed(8)}"><ele>10</ele><time>${new Date(t).toISOString()}</time>${h}</trkpt>`);
  }
  return `<?xml version="1.0"?><gpx version="1.1"><trk><name>x</name><type>${type}</type><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}

describe('gpx', () => {
  it('distance and moving time of a steady run', () => {
    const s = summarizeGpx(parseGpx(gpx({ n: 101 })))!;
    expect(s.distanceM).toBeGreaterThan(295);
    expect(s.distanceM).toBeLessThan(305);
    expect(s.movingS).toBe(100);
    expect(s.startedAt).toBe('2026-11-01T06:00:00.000Z');
  });
  it('a long pause is excluded from moving time', () => {
    const s = summarizeGpx(parseGpx(gpx({ n: 101, gapAt: 50, gapS: 120 })))!;
    expect(s.elapsedS).toBeGreaterThan(s.movingS + 100);
    expect(s.movingS).toBeLessThanOrEqual(100);
  });
  it('reads heart rate', () => expect(summarizeGpx(parseGpx(gpx({ n: 20, hr: 150 })))!.avgHr).toBe(150));
  it('no heart rate -> null', () => expect(summarizeGpx(parseGpx(gpx({ n: 20 })))!.avgHr).toBeNull());
  it('GPS jump is ignored', () => {
    const base = parseGpx(gpx({ n: 50 }));
    base[25] = { ...base[25], lat: 5 }; // teleport 550 km away and back
    const s = summarizeGpx(base)!;
    expect(s.distanceM).toBeLessThan(200);
  });
  it('garbage and empty input are safe', () => {
    expect(parseGpx('not xml')).toEqual([]);
    expect(parseGpx(undefined as unknown as string)).toEqual([]);
    expect(summarizeGpx([])).toBeNull();
    expect(summarizeGpx(parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="1"></trkpt></trkseg></trk></gpx>'))).toBeNull();
  });
  it('rejects invalid coordinates', () => expect(parseGpx('<trkpt lat="999" lon="1"><time>2026-01-01T00:00:00Z</time></trkpt>')).toEqual([]));
  it('type detection', () => {
    expect(gpxType(gpx({ n: 2, type: 'running' }))).toBe('running');
    expect(looksLikeRun('running')).toBe(true);
    expect(looksLikeRun('cycling')).toBe(false);
    expect(looksLikeRun(null)).toBe(true);
  });
  it('run row has a deterministic id (same file twice = same row)', () => {
    const a = gpxToRun(summarizeGpx(parseGpx(gpx({ n: 60 })))!);
    const b = gpxToRun(summarizeGpx(parseGpx(gpx({ n: 60 })))!);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ source: 'gpx', rpe: null, notes: null });
    expect(a.id).toBe(`gpx-${Date.parse('2026-11-01T06:00:00Z')}`);
  });
  it('haversine sanity: 1 degree of longitude at the equator', () => {
    expect(haversineM({ lat: 0, lon: 0, timeMs: 0, hr: null }, { lat: 0, lon: 1, timeMs: 0, hr: null })).toBeCloseTo(111195, -1);
  });
});

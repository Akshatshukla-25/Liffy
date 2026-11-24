import { describe, it, expect } from 'vitest';
import { formatWeight, parseWeightInput, kgToLb } from '../src/lib/units';
import { estimateMaxHr, sanitizeSettings, defaultSettings } from '../src/lib/settings';
import { suggestRest, startRest, adjustRest, remainingSeconds, formatClock } from '../src/lib/rest';
import { buildBackup, validateBackup, planImport, Row } from '../src/lib/backup';

describe('units', () => {
  it('format', () => {
    expect(formatWeight(62.5, 'kg')).toBe('62.5');
    expect(formatWeight(100, 'kg', true)).toBe('100 kg');
    expect(formatWeight(100, 'lb')).toBe('220.5');
  });
  it('parse', () => {
    expect(parseWeightInput('62,5', 'kg')).toBe(62.5);
    expect(parseWeightInput('225', 'lb')).toBeCloseTo(102.06, 1);
    expect(parseWeightInput('', 'kg')).toBeNull();
    expect(parseWeightInput('abc', 'kg')).toBeNull();
    expect(parseWeightInput('-5', 'kg')).toBeNull();
  });
  it('round trip stays close', () => expect(parseWeightInput(String(kgToLb(80)), 'lb')!).toBeCloseTo(80, 1));
});

describe('settings', () => {
  it('max HR estimate', () => { expect(estimateMaxHr(20)).toBe(194); expect(estimateMaxHr(5)).toBeNull(); });
  it('sanitize falls back safely', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings);
    expect(sanitizeSettings({ unit: 'stone', maxHr: 999, restOverrideSec: 90 })).toEqual({ ...defaultSettings, restOverrideSec: 90 });
    expect(sanitizeSettings({ unit: 'lb', maxHr: 190 })).toMatchObject({ unit: 'lb', maxHr: 190 });
  });
});

describe('rest', () => {
  it('suggest', () => { expect(suggestRest(3)).toBe(180); expect(suggestRest(10)).toBe(120); expect(suggestRest(15)).toBe(90); expect(suggestRest(3, 9.5)).toBe(210); });
  it('absolute end time survives backgrounding', () => {
    const end = startRest(1000, 90);
    expect(remainingSeconds(end, 1000)).toBe(90);
    expect(remainingSeconds(end, 1000 + 60_000)).toBe(30);
    expect(remainingSeconds(end, 1000 + 999_000)).toBe(0);
  });
  it('adjust never goes into the past', () => expect(adjustRest(5000, -60, 4000)).toBe(4000));
  it('clock', () => expect(formatClock(125)).toBe('2:05'));
});

describe('backup', () => {
  const r = (id: string, at: string, extra: object = {}): Row => ({ id, updated_at: at, owner_id: 'local', dirty: 1, ...extra });
  it('build drops deleted rows, device fields and built-in exercises', () => {
    const b = buildBackup({
      exercises: [r('x1', '2026-01-01T00:00:00Z', { is_custom: 0 }), r('c1', '2026-01-01T00:00:00Z', { is_custom: 1 })],
      workouts: [r('w1', '2026-01-01T00:00:00Z'), r('w2', '2026-01-01T00:00:00Z', { deleted_at: '2026-01-02T00:00:00Z' })],
    }, '2026-11-03T00:00:00Z');
    expect(b.tables.exercises!.map(x => x.id)).toEqual(['c1']);
    expect(b.tables.workouts).toHaveLength(1);
    expect(b.tables.workouts![0]).not.toHaveProperty('owner_id');
    expect(b.tables.workouts![0]).not.toHaveProperty('dirty');
  });
  it('validate accepts own output, rejects junk', () => {
    const b = buildBackup({ workouts: [r('w1', '2026-01-01T00:00:00Z')] }, '2026-11-03T00:00:00Z');
    expect(validateBackup(JSON.parse(JSON.stringify(b))).ok).toBe(true);
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ format: 'other' }).ok).toBe(false);
    expect(validateBackup({ ...b, version: 2 }).ok).toBe(false);
    expect(validateBackup({ ...b, tables: { evil: [] } }).ok).toBe(false);
    expect(validateBackup({ ...b, tables: { workouts: [{ id: 5 }] } }).ok).toBe(false);
    expect(validateBackup({ ...b, tables: { workouts: [{ id: 'a', updated_at: 'nope' }] } }).ok).toBe(false);
  });
  it('plan import: only new or strictly newer rows', () => {
    const backup = buildBackup({ workouts: [r('a', '2026-05-01T00:00:00Z'), r('b', '2026-05-01T00:00:00Z'), r('c', '2026-05-01T00:00:00Z')] }, 'now');
    const local = { workouts: [r('a', '2026-05-01T00:00:00Z'), r('b', '2026-04-01T00:00:00Z')] };
    const p = planImport(local, backup);
    expect(p.upserts.workouts!.map(x => x.id).sort()).toEqual(['b', 'c']);
    expect(p.counts.workouts).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import { estimate1RM } from '../src/lib/oneRepMax';
import { totalVolume, hardSetsByMuscle } from '../src/lib/volume';
import { detectPRs } from '../src/lib/prs';
import { nextTarget } from '../src/lib/progression';
import { paceSecPerKm, formatPace, hrZone } from '../src/lib/running';
import { loadRatio } from '../src/lib/load';
import { mergeRecords, resolveConflict } from '../src/lib/sync';
import { WorkSet } from '../src/lib/types';

const w = (weightKg: number, reps: number, type: WorkSet['type'] = 'working'): WorkSet => ({ weightKg, reps, type });

describe('1RM', () => {
  it('single = weight, high reps = null', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(60, 15)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
  });
  it('100x5 is about 115-117', () => {
    const v = estimate1RM(100, 5)!;
    expect(v).toBeGreaterThan(114);
    expect(v).toBeLessThan(118);
  });
});

describe('volume', () => {
  it('ignores warmups', () => {
    expect(totalVolume([w(40, 10, 'warmup'), w(100, 5), w(100, 5)])).toBe(1000);
  });
  it('counts hard sets, secondary at half', () => {
    const r = hardSetsByMuscle([
      { primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], sets: [w(80, 8), w(80, 8), w(20, 10, 'warmup')] },
    ]);
    expect(r).toEqual({ chest: 2, triceps: 1 });
  });
});

describe('PRs', () => {
  const hist = [w(100, 5), w(100, 4), w(90, 8)];
  it('first ever set is not a PR', () => expect(detectPRs([], w(100, 5))).toEqual([]));
  it('warmups never PR', () => expect(detectPRs(hist, w(200, 5, 'warmup'))).toEqual([]));
  it('heavier weight', () => expect(detectPRs(hist, w(105, 3))).toContain('weight'));
  it('more reps at same weight', () => expect(detectPRs(hist, w(100, 6))).toContain('reps_at_weight'));
  it('equal is not a PR', () => expect(detectPRs(hist, w(100, 5))).not.toContain('weight'));
});

describe('progression', () => {
  it('adds a rep inside range', () => expect(nextTarget([w(60, 8), w(60, 9)], [8, 12])).toEqual({ weightKg: 60, reps: 9 }));
  it('adds weight at top of range', () => expect(nextTarget([w(60, 12), w(60, 12)], [8, 12])).toEqual({ weightKg: 62.5, reps: 8 }));
  it('null with no history', () => expect(nextTarget([], [8, 12])).toBeNull());
});

describe('running', () => {
  it('pace', () => {
    expect(formatPace(paceSecPerKm(10000, 3000))).toBe('5:00');
    expect(paceSecPerKm(0, 100)).toBeNull();
  });
  it('zones', () => {
    expect(hrZone(95, 190)).toBe(1);
    expect(hrZone(180, 190)).toBe(5);
  });
});

describe('load', () => {
  it('ratio vs previous weeks', () => expect(loadRatio([100, 100, 100, 100, 150])).toBeCloseTo(1.5));
  it('no baseline', () => expect(loadRatio([100])).toBeNull());
});

describe('sync', () => {
  const a = { id: '1', updatedAt: '2026-11-02T10:00:00Z' };
  const b = { id: '1', updatedAt: '2026-11-02T11:00:00Z' };
  it('newer wins, tie goes to remote', () => {
    expect(resolveConflict(a, b)).toBe(b);
    expect(resolveConflict(b, a)).toBe(b);
    const tie = { ...a };
    expect(resolveConflict(a, tie)).toBe(tie);
  });
  it('merge keeps both sides and propagates soft deletes', () => {
    const del = { id: '2', updatedAt: '2026-11-02T12:00:00Z', deletedAt: '2026-11-02T12:00:00Z' };
    const old = { id: '2', updatedAt: '2026-11-02T09:00:00Z' };
    const out = mergeRecords([del, a], [old, { id: '3', updatedAt: '2026-11-01T00:00:00Z' }]);
    expect(out).toHaveLength(3);
    expect(out.find(x => x.id === '2')!.deletedAt).toBeTruthy();
  });
});

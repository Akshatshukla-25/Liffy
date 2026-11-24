import { describe, it, expect } from 'vitest';
import { celebrationTier, confettiCount, staggerDelay, countUp, easeOutCubic, confettiPieces, weekIndex, weeklyStreak } from '../src/lib/celebrate';

describe('celebration', () => {
  it('tiers', () => {
    expect(celebrationTier({ setsDone: 0, prCount: 5 })).toBe('none');
    expect(celebrationTier({ setsDone: 9, prCount: 0 })).toBe('done');
    expect(celebrationTier({ setsDone: 9, prCount: 1 })).toBe('pr');
    expect(celebrationTier({ setsDone: 9, prCount: 3 })).toBe('epic');
    expect(confettiCount('done')).toBe(0);
    expect(confettiCount('epic')).toBeGreaterThan(confettiCount('pr'));
  });
  it('stagger is capped', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(135);
    expect(staggerDelay(11)).toBe(360);
    expect(staggerDelay(12)).toBe(0);
  });
  it('count-up eases and clamps', () => {
    expect(countUp(0, 100, 0)).toBe(0);
    expect(countUp(0, 100, 1)).toBe(100);
    expect(countUp(0, 100, 0.5)).toBeGreaterThan(50);
    expect(easeOutCubic(2)).toBe(1);
  });
  it('confetti is deterministic', () => {
    expect(confettiPieces(10, 42, 5)).toEqual(confettiPieces(10, 42, 5));
    expect(confettiPieces(10, 42, 5)).not.toEqual(confettiPieces(10, 43, 5));
    expect(confettiPieces(10, 1, 5).every(p => p.colorIndex >= 0 && p.colorIndex < 5)).toBe(true);
  });
});

describe('weekly streak', () => {
  const at = (iso: string) => Date.parse(iso);
  it('week index is Monday-based', () => {
    expect(weekIndex(at('2026-11-02T00:00:00Z'), 0)).toBe(weekIndex(at('2026-11-08T23:59:00Z'), 0));
    expect(weekIndex(at('2026-11-09T00:00:00Z'), 0)).toBe(weekIndex(at('2026-11-02T00:00:00Z'), 0) + 1);
  });
  it('timezone shifts the week boundary (India UTC+5:30)', () => {
    expect(weekIndex(at('2026-11-08T20:00:00Z'), 330)).toBe(weekIndex(at('2026-11-09T06:00:00Z'), 330));
    expect(weekIndex(at('2026-11-08T20:00:00Z'), 0)).not.toBe(weekIndex(at('2026-11-09T06:00:00Z'), 0));
  });
  it('counts consecutive met weeks; unmet current week does not break it', () => {
    const now = at('2026-11-04T12:00:00Z');
    const w = (d: string) => [`${d}T08:00:00Z`];
    const lastWeek = ['2026-10-26', '2026-10-28', '2026-10-30'].flatMap(w);
    const weekBefore = ['2026-10-19', '2026-10-21', '2026-10-23'].flatMap(w);
    const s = weeklyStreak([...lastWeek, ...weekBefore, ...w('2026-11-02')], 3, now, 0);
    expect(s).toEqual({ weeks: 2, thisWeekCount: 1, thisWeekMet: false });
  });
  it('current week met adds one; a gap resets', () => {
    const now = at('2026-11-06T12:00:00Z');
    const cur = ['2026-11-02', '2026-11-04', '2026-11-05'].map(d => `${d}T08:00:00Z`);
    const old = ['2026-10-12', '2026-10-14', '2026-10-16'].map(d => `${d}T08:00:00Z`);
    expect(weeklyStreak([...cur, ...old], 3, now, 0)).toEqual({ weeks: 1, thisWeekCount: 3, thisWeekMet: true });
  });
  it('no sessions', () => expect(weeklyStreak([], 3, Date.now(), 0).weeks).toBe(0));
});

import { describe, it, expect } from 'vitest';
import { best1RMs, e1rmTrend, weeklyVolume, muscleSetsLast7, weeklyLoads, loadStatus, LogRow } from '../src/lib/progress';
import { sessionFromTemplate } from '../src/lib/templates';

const NOW = '2026-11-03T12:00:00Z';
const row = (workoutId: string, startedAt: string, exerciseId: string, w: number, r: number, p = ['chest'], s: string[] = []): LogRow =>
  ({ workoutId, startedAt, exerciseId, primaryMuscles: p, secondaryMuscles: s, set: { weightKg: w, reps: r, type: 'working' } });

describe('progress', () => {
  const rows = [
    row('a', '2026-10-01T10:00:00Z', 'bench', 100, 5),
    row('a', '2026-10-01T10:00:00Z', 'bench', 90, 8),
    row('b', '2026-11-02T10:00:00Z', 'bench', 105, 5, ['chest'], ['triceps']),
  ];
  it('best 1RM per exercise', () => expect(best1RMs(rows).bench.date).toBe('2026-11-02T10:00:00Z'));
  it('trend: one point per workout, oldest first', () => {
    const t = e1rmTrend(rows, 'bench');
    expect(t).toHaveLength(2);
    expect(t[1].e1rm).toBeGreaterThan(t[0].e1rm);
  });
  it('weekly volume buckets', () => {
    expect(weeklyVolume(rows, 2, NOW)).toEqual([0, 525]);
    expect(weeklyVolume(rows, 6, NOW)[1]).toBe(100 * 5 + 90 * 8); // 5 weeks ago
  });
  it('muscle sets last 7 days', () => expect(muscleSetsLast7(rows, NOW)).toEqual({ chest: 1, triceps: 0.5 }));
});

describe('load', () => {
  it('buckets lifting+run, default RPE 6', () => {
    const l = weeklyLoads([{ startedAt: '2026-11-02T10:00:00Z', durationMin: 60 }, { startedAt: '2026-11-01T10:00:00Z', durationMin: 30, rpe: 8 }], 2, NOW);
    expect(l).toEqual([0, 360 + 240]);
  });
  it('null without enough history', () => expect(loadStatus([0, 0, 0, 100, 100])).toBeNull());
  it('bands', () => {
    expect(loadStatus([100, 100, 100, 100, 100])).toMatchObject({ band: 'optimal' });
    expect(loadStatus([100, 100, 100, 100, 200])?.band).toBe('spike');
    expect(loadStatus([100, 100, 100, 100, 60])?.band).toBe('low');
  });
});

describe('sessionFromTemplate', () => {
  let n = 0; const id = () => `id${n++}`;
  const t = { id: 't', name: 'Push', exercises: [{ exerciseId: 'bench', sets: 3, repMin: 8, repMax: 12, incrementKg: 2.5 }, { exerciseId: 'new', sets: 2, repMin: 10, repMax: 15, incrementKg: 2.5 }] };
  it('prefills progression target; new exercise starts empty at repMin', () => {
    const s = sessionFromTemplate(t, NOW, { bench: [{ weightKg: 60, reps: 12, type: 'working' }, { weightKg: 60, reps: 12, type: 'working' }] }, id);
    expect(s.exercises[0].sets).toHaveLength(3);
    expect(s.exercises[0].sets[0]).toMatchObject({ weightKg: 62.5, reps: 8, done: false });
    expect(s.exercises[1].sets[0]).toMatchObject({ weightKg: 0, reps: 10 });
    expect(new Set(s.exercises.flatMap(e => e.sets.map(x => x.id))).size).toBe(5);
  });
});

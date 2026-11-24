import { describe, it, expect } from 'vitest';
import { newSession, sessionReducer as r, sessionVolume, sessionDurationMin, Session } from '../src/lib/session';

const base = (): Session => {
  let s = newSession('w1', '2026-11-03T10:00:00Z');
  s = r(s, { type: 'ADD_EXERCISE', id: 'e1', exerciseId: 'bench' });
  s = r(s, { type: 'ADD_SET', exerciseEntryId: 'e1', setId: 's1' });
  return s;
};

describe('session reducer', () => {
  it('new set prefills from previous set', () => {
    let s = base();
    s = r(s, { type: 'UPDATE_SET', exerciseEntryId: 'e1', setId: 's1', patch: { weightKg: 80, reps: 8 } });
    s = r(s, { type: 'ADD_SET', exerciseEntryId: 'e1', setId: 's2' });
    expect(s.exercises[0].sets[1]).toMatchObject({ weightKg: 80, reps: 8, done: false });
  });
  it('volume counts only done sets', () => {
    let s = base();
    s = r(s, { type: 'UPDATE_SET', exerciseEntryId: 'e1', setId: 's1', patch: { weightKg: 100, reps: 5 } });
    expect(sessionVolume(s)).toBe(0);
    s = r(s, { type: 'TOGGLE_DONE', exerciseEntryId: 'e1', setId: 's1' });
    expect(sessionVolume(s)).toBe(500);
  });
  it('finish drops undone sets and empty exercises, then locks', () => {
    let s = base();
    s = r(s, { type: 'ADD_EXERCISE', id: 'e2', exerciseId: 'squat' });
    s = r(s, { type: 'TOGGLE_DONE', exerciseEntryId: 'e1', setId: 's1' });
    s = r(s, { type: 'FINISH', at: '2026-11-03T10:45:00Z' });
    expect(s.exercises.map(e => e.id)).toEqual(['e1']);
    expect(sessionDurationMin(s)).toBe(45);
    expect(r(s, { type: 'ADD_EXERCISE', id: 'e3', exerciseId: 'x' })).toBe(s);
  });
  it('remove set / exercise', () => {
    let s = base();
    s = r(s, { type: 'REMOVE_SET', exerciseEntryId: 'e1', setId: 's1' });
    expect(s.exercises[0].sets).toHaveLength(0);
    s = r(s, { type: 'REMOVE_EXERCISE', id: 'e1' });
    expect(s.exercises).toHaveLength(0);
  });
});

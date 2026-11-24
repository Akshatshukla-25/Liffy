import { SetType, WorkSet } from './types';
import { totalVolume } from './volume';

export interface SessionSet { id: string; weightKg: number; reps: number; rpe: number | null; type: SetType; done: boolean; }
export interface SessionExercise { id: string; exerciseId: string; sets: SessionSet[]; }
export interface Session { id: string; name: string; startedAt: string; endedAt: string | null; exercises: SessionExercise[]; }

/** Pure: callers pass ids and timestamps in, so reducers stay deterministic and testable. */
export type Action =
  | { type: 'ADD_EXERCISE'; id: string; exerciseId: string }
  | { type: 'REMOVE_EXERCISE'; id: string }
  | { type: 'ADD_SET'; exerciseEntryId: string; setId: string }
  | { type: 'UPDATE_SET'; exerciseEntryId: string; setId: string; patch: Partial<Pick<SessionSet, 'weightKg' | 'reps' | 'rpe' | 'type'>> }
  | { type: 'TOGGLE_DONE'; exerciseEntryId: string; setId: string }
  | { type: 'REMOVE_SET'; exerciseEntryId: string; setId: string }
  | { type: 'RENAME'; name: string }
  | { type: 'FINISH'; at: string };

export const newSession = (id: string, startedAt: string, name = 'Workout'): Session =>
  ({ id, name, startedAt, endedAt: null, exercises: [] });

const mapEx = (s: Session, id: string, fn: (e: SessionExercise) => SessionExercise): Session =>
  ({ ...s, exercises: s.exercises.map(e => (e.id === id ? fn(e) : e)) });

export function sessionReducer(s: Session, a: Action): Session {
  if (s.endedAt && a.type !== 'RENAME') return s; // finished sessions are read-only
  switch (a.type) {
    case 'ADD_EXERCISE':
      return { ...s, exercises: [...s.exercises, { id: a.id, exerciseId: a.exerciseId, sets: [] }] };
    case 'REMOVE_EXERCISE':
      return { ...s, exercises: s.exercises.filter(e => e.id !== a.id) };
    case 'ADD_SET':
      // Prefill from the previous set so repeating a set is one tap.
      return mapEx(s, a.exerciseEntryId, e => {
        const prev = e.sets[e.sets.length - 1];
        const set: SessionSet = { id: a.setId, weightKg: prev?.weightKg ?? 0, reps: prev?.reps ?? 0, rpe: null, type: 'working', done: false };
        return { ...e, sets: [...e.sets, set] };
      });
    case 'UPDATE_SET':
      return mapEx(s, a.exerciseEntryId, e => ({ ...e, sets: e.sets.map(x => (x.id === a.setId ? { ...x, ...a.patch } : x)) }));
    case 'TOGGLE_DONE':
      return mapEx(s, a.exerciseEntryId, e => ({ ...e, sets: e.sets.map(x => (x.id === a.setId ? { ...x, done: !x.done } : x)) }));
    case 'REMOVE_SET':
      return mapEx(s, a.exerciseEntryId, e => ({ ...e, sets: e.sets.filter(x => x.id !== a.setId) }));
    case 'RENAME':
      return { ...s, name: a.name };
    case 'FINISH':
      return { ...s, exercises: s.exercises.map(e => ({ ...e, sets: e.sets.filter(x => x.done) })).filter(e => e.sets.length), endedAt: a.at };
  }
}

/** Only completed sets count toward stats. */
export const doneSets = (e: SessionExercise): WorkSet[] =>
  e.sets.filter(x => x.done).map(({ weightKg, reps, rpe, type }) => ({ weightKg, reps, rpe, type }));

export const sessionVolume = (s: Session): number => s.exercises.reduce((a, e) => a + totalVolume(doneSets(e)), 0);
export const sessionDurationMin = (s: Session, nowIso?: string): number =>
  Math.max(0, Math.round((Date.parse(s.endedAt ?? nowIso ?? s.startedAt) - Date.parse(s.startedAt)) / 60000));

import { WorkSet } from './types';
import { nextTarget } from './progression';
import { Session, SessionExercise, SessionSet } from './session';

export interface TemplateExercise { exerciseId: string; sets: number; repMin: number; repMax: number; incrementKg: number; }
export interface Template { id: string; name: string; exercises: TemplateExercise[]; }

/**
 * Build a ready-to-log session from a template. Each exercise is prefilled with the double-progression
 * target from its last finished sets (or empty if never done). `genId` is injected to keep this pure.
 */
export function sessionFromTemplate(
  t: Template,
  startedAt: string,
  lastSets: Record<string, WorkSet[]>,
  genId: () => string,
): Session {
  const exercises: SessionExercise[] = t.exercises.map(te => {
    const target = nextTarget(lastSets[te.exerciseId] ?? [], [te.repMin, te.repMax], te.incrementKg);
    const sets: SessionSet[] = Array.from({ length: te.sets }, () => ({
      id: genId(), weightKg: target?.weightKg ?? 0, reps: target?.reps ?? te.repMin, rpe: null, type: 'working', done: false,
    }));
    return { id: genId(), exerciseId: te.exerciseId, sets };
  });
  return { id: genId(), name: t.name, startedAt, endedAt: null, exercises };
}

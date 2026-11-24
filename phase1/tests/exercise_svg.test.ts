import { describe, it, expect } from 'vitest';
import { getExerciseSvg, getExerciseSvgSlug, hasExerciseSvg } from '../src/lib/exerciseSvg';
import exerciseSvgsData from '../assets/exerciseSvgs.json';

describe('Exercise SVG Illustrations Registry', () => {
  it('bundles over 300 exercise SVG illustrations', () => {
    const keys = Object.keys(exerciseSvgsData);
    expect(keys.length).toBeGreaterThanOrEqual(300);
  });

  it('retrieves valid SVG markup for major compound lifts', () => {
    const compoundLifts = [
      'bench-press',
      'deadlift',
      'front-squat',
      'pull-up',
      'chin-up',
      'push-up',
      'barbell-row',
      'arnold-press',
      'bicep-curl',
    ];

    for (const slug of compoundLifts) {
      expect(hasExerciseSvg(slug)).toBe(true);
      const svg = getExerciseSvg(slug);
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('<path');
      expect(svg).toContain('fill="currentColor"');
    }
  });

  it('matches exercises via fuzzy and alias resolution', () => {
    // Tests common real-world naming from database
    expect(getExerciseSvgSlug('Barbell Bench Press - Medium Grip')).toBe('bench-press');
    expect(getExerciseSvgSlug('Incline Dumbbell Bench Press')).toBe('incline-dumbbell-press');
    expect(getExerciseSvgSlug('Romanian Deadlift')).toBe('romanian-deadlift');
    expect(getExerciseSvgSlug('Wide-Grip Pull-Up')).toBe('pull-up');
    expect(getExerciseSvgSlug('Diamond Push-Up')).toBe('diamond-push-up');
    expect(getExerciseSvgSlug('Bent Over Barbell Row')).toBe('barbell-row');
  });

  it('handles non-existent exercises gracefully by returning null', () => {
    expect(getExerciseSvgSlug('nonexistent_alien_workout_12345')).toBeNull();
    expect(getExerciseSvg('nonexistent_alien_workout_12345')).toBeNull();
    expect(hasExerciseSvg('nonexistent_alien_workout_12345')).toBe(false);
  });
});

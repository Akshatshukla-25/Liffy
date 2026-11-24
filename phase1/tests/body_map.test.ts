import { describe, it, expect } from 'vitest';
import { BODY_PATHS } from '../src/components/body/bodyPaths';
import { mapMusclesToSlugs, INERT_PARTS, MUSCLE_LABELS } from '../src/components/body/muscleMapping';

describe('SVG Body Map and Muscle Mapping System', () => {
  it('maps standard exercise database muscle names to anatomical body vector slugs', () => {
    expect(mapMusclesToSlugs(['abdominals'])).toContain('abs');
    expect(mapMusclesToSlugs(['chest'])).toContain('chest');
    expect(mapMusclesToSlugs(['glutes'])).toContain('gluteal');
    expect(mapMusclesToSlugs(['lats'])).toContain('lats');
    expect(mapMusclesToSlugs(['quadriceps'])).toContain('quadriceps');
    expect(mapMusclesToSlugs(['hamstrings'])).toContain('hamstring');
    expect(mapMusclesToSlugs(['biceps'])).toContain('biceps');
    expect(mapMusclesToSlugs(['triceps'])).toContain('triceps');
    expect(mapMusclesToSlugs(['shoulders'])).toContain('deltoids');
    expect(mapMusclesToSlugs(['calves'])).toContain('calves');
    expect(mapMusclesToSlugs(['traps'])).toContain('trapezius');
  });

  it('handles multiple muscle inputs and normalizes casing / spaces', () => {
    const slugs = mapMusclesToSlugs(['Upper Chest', 'Triceps', 'Lower Back']);
    expect(slugs).toContain('chest');
    expect(slugs).toContain('triceps');
    expect(slugs).toContain('lower-back');
  });

  it('returns empty array when given empty inputs or unknown strings', () => {
    expect(mapMusclesToSlugs([])).toEqual([]);
    expect(mapMusclesToSlugs(['nonexistent_alien_muscle'])).toEqual([]);
  });

  it('verifies BODY_PATHS structure for male and female vectors', () => {
    // Male
    expect(BODY_PATHS.male.front.vb).toBe('0 95 727 1280');
    expect(BODY_PATHS.male.back.vb).toBe('718 95 727 1280');
    expect(Object.keys(BODY_PATHS.male.front.p).length).toBeGreaterThan(10);
    expect(Object.keys(BODY_PATHS.male.back.p).length).toBeGreaterThan(10);

    // Female
    expect(BODY_PATHS.female.front.vb).toBe('0 0 650 1450');
    expect(BODY_PATHS.female.back.vb).toBe('823 0 650 1450');
    expect(Object.keys(BODY_PATHS.female.front.p).length).toBeGreaterThan(10);
    expect(Object.keys(BODY_PATHS.female.back.p).length).toBeGreaterThan(10);
  });

  it('ensures INERT_PARTS are defined and separate from muscles', () => {
    expect(INERT_PARTS).toContain('head');
    expect(INERT_PARTS).toContain('hands');
    expect(INERT_PARTS).toContain('feet');
    for (const inert of INERT_PARTS) {
      expect(Object.keys(MUSCLE_LABELS)).not.toContain(inert);
    }
  });

  it('verifies human-readable labels exist for all major muscle slugs', () => {
    expect(MUSCLE_LABELS['chest']).toBe('Chest');
    expect(MUSCLE_LABELS['lats']).toBe('Lats');
    expect(MUSCLE_LABELS['abs']).toBe('Abs');
    expect(MUSCLE_LABELS['gluteal']).toBe('Glutes');
    expect(MUSCLE_LABELS['quadriceps']).toBe('Quads');
  });
});

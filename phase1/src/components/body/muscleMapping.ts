export const INERT_PARTS = ['head', 'hair', 'neck', 'hands', 'feet', 'knees', 'ankles'];

export const ALL_MUSCLE_SLUGS = [
  'trapezius',
  'deltoids',
  'chest',
  'upper-back',
  'lats',
  'serratus',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'hip-flexors',
  'calves',
  'tibialis',
] as const;

export type MuscleSlug = typeof ALL_MUSCLE_SLUGS[number];

export const MUSCLE_LABELS: Record<string, string> = {
  trapezius: 'Traps',
  deltoids: 'Shoulders',
  'front-delts': 'Front Delts',
  'side-delts': 'Side Delts',
  'rear-delts': 'Rear Delts',
  chest: 'Chest',
  lats: 'Lats',
  'latissimus-dorsi': 'Lats',
  'upper-back': 'Upper Back',
  serratus: 'Serratus',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearm: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  'lower-back': 'Lower Back',
  gluteal: 'Glutes',
  quadriceps: 'Quads',
  hamstring: 'Hamstrings',
  adductors: 'Adductors',
  'hip-flexors': 'Hip Flexors',
  calves: 'Calves',
  tibialis: 'Shins',
};

// Maps raw exercise muscle strings (from free-exercise-db exercises.json) to body map slugs
export const EXERCISE_MUSCLE_TO_SLUG: Record<string, string[]> = {
  abdominals: ['abs', 'obliques'],
  abs: ['abs'],
  core: ['abs', 'obliques'],
  obliques: ['obliques'],
  abductors: ['gluteal'],
  adductors: ['adductors'],
  biceps: ['biceps'],
  calves: ['calves', 'tibialis'],
  chest: ['chest'],
  'upper chest': ['chest'],
  'lower chest': ['chest'],
  forearms: ['forearm'],
  forearm: ['forearm'],
  glutes: ['gluteal'],
  glute: ['gluteal'],
  gluteal: ['gluteal'],
  hamstrings: ['hamstring'],
  hamstring: ['hamstring'],
  lats: ['lats'],
  'latissimus dorsi': ['lats'],
  'lower back': ['lower-back'],
  'lower-back': ['lower-back'],
  'middle back': ['upper-back', 'trapezius'],
  'upper back': ['upper-back', 'trapezius'],
  'upper-back': ['upper-back', 'trapezius'],
  neck: ['neck'],
  quadriceps: ['quadriceps'],
  quads: ['quadriceps'],
  shoulders: ['deltoids'],
  delts: ['deltoids'],
  deltoids: ['deltoids'],
  'front delts': ['deltoids'],
  'side delts': ['deltoids'],
  'rear delts': ['deltoids'],
  traps: ['trapezius'],
  trapezius: ['trapezius'],
  triceps: ['triceps'],
};

const VALID_SLUG_SET = new Set<string>([
  ...ALL_MUSCLE_SLUGS,
  'chest',
  'lats',
  'neck',
  'latissimus-dorsi',
]);

export function mapMusclesToSlugs(muscles: string[]): string[] {
  const slugs = new Set<string>();
  for (const m of muscles) {
    if (!m) continue;
    const norm = m.trim().toLowerCase();
    const mapped = EXERCISE_MUSCLE_TO_SLUG[norm];
    if (mapped) {
      mapped.forEach((s) => slugs.add(s));
      continue;
    }

    if (VALID_SLUG_SET.has(norm)) {
      slugs.add(norm);
      continue;
    }

    // Keyword match
    for (const [key, val] of Object.entries(EXERCISE_MUSCLE_TO_SLUG)) {
      if (norm.includes(key)) {
        val.forEach((s) => slugs.add(s));
      }
    }
  }
  return Array.from(slugs);
}

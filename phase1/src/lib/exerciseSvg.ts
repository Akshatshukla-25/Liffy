import exerciseSvgsData from '../../assets/exerciseSvgs.json';

const exerciseSvgs = exerciseSvgsData as Record<string, string>;
const svgSlugSet = new Set<string>(Object.keys(exerciseSvgs));

function cleanString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

// Common aliases mapping popular gym names to workout-guide vector SVG slugs.
// Place more specific variations BEFORE general patterns.
const COMMON_ALIASES: Array<{ pattern: RegExp; slug: string }> = [
  // Specific presses
  { pattern: /\bincline\s*dumbbell\b/i, slug: 'incline-dumbbell-press' },
  { pattern: /\bincline\s*(bench|press)\b/i, slug: 'incline-bench-press' },
  { pattern: /\bdecline\s*(barbell|dumbbell)?\s*(bench)?\s*(press)?\b/i, slug: 'decline-bench-press' },
  { pattern: /\bclose\s*grip\s*bench\b/i, slug: 'close-grip-bench-press' },
  { pattern: /\bdumbbell\s*bench\b/i, slug: 'dumbbell-bench-press' },
  { pattern: /\bbench\s*press\b/i, slug: 'bench-press' },

  // Specific deadlifts
  { pattern: /\bromanian\s*deadlift\b/i, slug: 'romanian-deadlift' },
  { pattern: /\bsumo\s*deadlift\b/i, slug: 'dumbbell-sumo-deadlift' },
  { pattern: /\bdeadlift\b/i, slug: 'deadlift' },

  // Specific squats
  { pattern: /\bgoblet\s*squat\b/i, slug: 'goblet-squat' },
  { pattern: /\bfront\s*squat\b/i, slug: 'front-squat' },
  { pattern: /\bhack\s*squat\b/i, slug: 'hack-squat' },
  { pattern: /\bbodyweight\s*squat\b/i, slug: 'bodyweight-squat' },
  { pattern: /\bsquat\b/i, slug: 'squat' in svgSlugSet ? 'squat' : 'bodyweight-squat' },

  // Overhead & shoulders
  { pattern: /\barnold\s*press\b/i, slug: 'arnold-press' },
  { pattern: /\boverhead\s*press\b|\bmilitary\s*press\b/i, slug: 'overhead-press' },

  // Pulls & Pushups
  { pattern: /\bchin[\s-]*up\b/i, slug: 'chin-up' },
  { pattern: /\bpull[\s-]*up\b/i, slug: 'pull-up' },
  { pattern: /\bdiamond\s*push[\s-]*up\b/i, slug: 'diamond-push-up' },
  { pattern: /\bdecline\s*push[\s-]*up\b/i, slug: 'decline-push-up' },
  { pattern: /\bpush[\s-]*up\b/i, slug: 'push-up' },

  // Rows
  { pattern: /\bdumbbell\s*(bent\s*over)?\s*row\b/i, slug: 'dumbbell-bent-over-row' },
  { pattern: /\bbarbell\s*row\b|\bbent\s*over\s*row\b/i, slug: 'barbell-row' },
  { pattern: /\blat\s*pull[\s-]*down\b/i, slug: 'banded-lat-pulldown' },

  // Arms & core
  { pattern: /\bhammer\s*curl\b/i, slug: 'hammer-curl' },
  { pattern: /\bbicep\s*curl\b|\bbarbell\s*curl\b|\bdumbbell\s*curl\b/i, slug: 'bicep-curl' },
  { pattern: /\btricep\s*dip\b|\bbench\s*dip\b/i, slug: 'bench-dip' },
  { pattern: /\bglute\s*bridge\b/i, slug: 'barbell-glute-bridge' },
  { pattern: /\bhip\s*thrust\b/i, slug: 'banded-hip-thrust' },
  { pattern: /\bplank\b/i, slug: 'plank' },
  { pattern: /\bcrunch\b/i, slug: 'cable-crunch' },
  { pattern: /\bface\s*pull\b/i, slug: 'banded-face-pull' },
  { pattern: /\blunge\b/i, slug: 'walking-lunge' },
];

export function getExerciseSvgSlug(name: string, id?: string): string | null {
  if (!name && !id) return null;

  const cleanName = cleanString(name || '');
  const cleanId = cleanString(id || '');
  const slugFromName = cleanName.replace(/\s+/g, '-');
  const slugFromId = cleanId.replace(/\s+/g, '-');

  // Exact slug match
  if (svgSlugSet.has(slugFromName)) return slugFromName;
  if (svgSlugSet.has(slugFromId)) return slugFromId;

  // Common exercise alias rule match
  for (const alias of COMMON_ALIASES) {
    if (alias.pattern.test(name) || (id && alias.pattern.test(id))) {
      if (svgSlugSet.has(alias.slug)) {
        return alias.slug;
      }
    }
  }

  // Token subset match
  for (const slug of svgSlugSet) {
    const slugWords = slug.split('-');
    if (slugWords.length >= 2 && slugWords.every((w) => cleanName.includes(w))) {
      return slug;
    }
  }

  return null;
}

export function getExerciseSvg(name: string, id?: string): string | null {
  const slug = getExerciseSvgSlug(name, id);
  if (!slug) return null;
  return exerciseSvgs[slug] || null;
}

export function hasExerciseSvg(name: string, id?: string): boolean {
  return getExerciseSvgSlug(name, id) !== null;
}

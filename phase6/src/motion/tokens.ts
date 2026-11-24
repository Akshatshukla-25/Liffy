/** Motion design tokens. Every animation in the app uses these: no ad-hoc numbers in components. */
export const spring = {
  snappy: { damping: 18, stiffness: 320, mass: 0.8 },   // press feedback, toggles, chips
  bouncy: { damping: 10, stiffness: 220, mass: 0.9 },   // pop-ins: check marks, badges, PR stamp
  gentle: { damping: 22, stiffness: 160, mass: 1 },     // sheets, cards, layout changes
} as const;

export const duration = { instant: 90, quick: 160, base: 240, slow: 380, count: 900, celebrate: 1600 } as const;

export const press = {
  scale: 0.96,        // whole-button scale while pressed
  chunkyDepth: 4,     // px of the "3D" bottom edge on primary buttons; it collapses to 1px while pressed
} as const;

export const stagger = { stepMs: 45, maxMs: 360, maxItems: 12 } as const; // only the first 12 rows animate in

/** Event -> haptic. Map to expo-haptics: light/medium = impactAsync(Light/Medium), success/warning = notificationAsync, select = selectionAsync. */
export const hapticFor = {
  tap: 'light', toggle: 'select', setDone: 'medium', restDone: 'success',
  pr: 'success', workoutFinished: 'success', error: 'warning',
} as const;
export type HapticEvent = keyof typeof hapticFor;

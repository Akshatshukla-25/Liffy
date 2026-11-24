export type Unit = 'kg' | 'lb';
const LB = 2.2046226218;

/** Storage is ALWAYS kg. Convert only at the display/input edge. */
export const kgToLb = (kg: number) => kg * LB;
export const lbToKg = (lb: number) => lb / LB;

/** Display weight in the user's unit: lb rounded to 0.5, kg to 0.25. No trailing zeros: "62.5", "100". */
export function formatWeight(kg: number, unit: Unit, withUnit = false): string {
  const v = unit === 'lb' ? Math.round(kgToLb(kg) * 2) / 2 : Math.round(kg * 4) / 4;
  return `${v}${withUnit ? ` ${unit}` : ''}`;
}

/** Parse what the user typed (accepts "62,5") into kg. Null if invalid or negative. */
export function parseWeightInput(text: string, unit: Unit): number | null {
  const n = Number(text.trim().replace(',', '.'));
  if (!text.trim() || !Number.isFinite(n) || n < 0 || n > 2000) return null;
  return unit === 'lb' ? Math.round(lbToKg(n) * 100) / 100 : n;
}

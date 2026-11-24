export const paceSecPerKm = (distanceM: number, durationS: number): number | null =>
  distanceM > 0 && durationS > 0 ? durationS / (distanceM / 1000) : null;

export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null) return '--:--';
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Five zones as % of max HR: 50-60, 60-70, 70-80, 80-90, 90-100. */
export function hrZone(hr: number, maxHr: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const pct = hr / maxHr;
  if (pct < 0.5) return 0;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

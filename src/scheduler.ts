// Pure scheduling engine: no React, no IndexedDB. All arithmetic is on calendar dates (YYYY-MM-DD).
export type Activity = 'resistance' | 'cardio' | 'rest';
export type Status = 'completed' | 'missed' | 'scheduled';
export interface Refs { resistance: string; cardio: string }
export interface DayPlan {
  date: string; activityType: Activity; status: Status;
  daysSinceLastResistance: number; daysSinceLastCardio: number;
  nextResistanceDate: string; nextCardioEligibleDate: string;
}
export const RESISTANCE_INTERVAL = 3;
export const CARDIO_INTERVAL = 7;

const pad = (n: number) => String(n).padStart(2, '0');
// Calendar day number: built from Y/M/D components in UTC, so DST can never skew it.
const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
export const toISODate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISODate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso: string, n: number) => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => dayNum(to) - dayNum(from);
const later = (a: string, b: string) => (a > b ? a : b);

/** Plan for one date, given the reference dates (last completed sessions) as they stood before that date. */
export function scheduleFor(date: string, refs: Refs, today: string, completedAs: Activity | null = null): DayPlan {
  const daysSinceLastResistance = daysBetween(refs.resistance, date);
  const daysSinceLastCardio = daysBetween(refs.cardio, date);
  const planned: Activity = daysSinceLastResistance >= RESISTANCE_INTERVAL ? 'resistance'
    : daysSinceLastCardio >= CARDIO_INTERVAL ? 'cardio' : 'rest';
  const activityType = completedAs ?? planned;
  const status: Status = completedAs ? 'completed' : activityType === 'rest' ? 'scheduled' : date < today ? 'missed' : 'scheduled';
  return {
    date, activityType, status, daysSinceLastResistance, daysSinceLastCardio,
    nextResistanceDate: later(addDays(refs.resistance, RESISTANCE_INTERVAL), date),
    nextCardioEligibleDate: later(addDays(refs.cardio, CARDIO_INTERVAL), date),
  };
}

/** Replays every day from `start` to `today`. Only completed sessions move the reference dates. */
export function buildTimeline(start: string, today: string, baseline: Refs, completed: Map<string, Activity>) {
  const refs = { ...baseline };
  const days: DayPlan[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const p = scheduleFor(d, refs, today, completed.get(d) ?? null);
    days.push(p);
    if (p.status === 'completed' && p.activityType !== 'rest') refs[p.activityType] = d;
  }
  return { days, refs };
}

/** First non-rest day after `from`, assuming no further completions. Used for "next up" copy. */
export function nextSession(from: string, refs: Refs): { date: string; activityType: Exclude<Activity, 'rest'> } | null {
  for (let i = 1; i <= 14; i++) {
    const d = addDays(from, i);
    const p = scheduleFor(d, refs, '0000-00-00');
    if (p.activityType !== 'rest') return { date: d, activityType: p.activityType };
  }
  return null;
}

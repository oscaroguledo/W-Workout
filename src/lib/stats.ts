import type { Exercise, Muscle, SetLog } from '../types';
import { MUSCLES } from '../types';

/** Epley estimated 1-rep max. Only meaningful up to ~12 reps. */
export const e1rm = (w: number, reps: number) => (reps <= 0 ? 0 : reps === 1 ? w : w * (1 + reps / 30));

export interface Bests {
  weight: number;
  e1rm: number;
  reps: number;
  seconds: number;
  distanceM: number;
}

export function bestsFor(ex: Exercise, sets: SetLog[]): Bests {
  const b: Bests = { weight: 0, e1rm: 0, reps: 0, seconds: 0, distanceM: 0 };
  for (const s of sets) {
    if (ex.kind === 'time') { b.seconds = Math.max(b.seconds, s.seconds); continue; }
    if (ex.kind === 'cardio') {
      b.seconds = Math.max(b.seconds, s.seconds);
      b.distanceM = Math.max(b.distanceM, s.distanceM ?? 0);
      continue;
    }
    b.reps = Math.max(b.reps, s.reps);
    if (!ex.assisted && s.reps > 0) {
      b.weight = Math.max(b.weight, s.weightKg);
      if (s.reps <= 12) b.e1rm = Math.max(b.e1rm, e1rm(s.weightKg, s.reps));
    }
  }
  return b;
}

/** Labels for any personal record this set beats compared with everything before it. */
export function prLabels(ex: Exercise, set: SetLog, prior: SetLog[]): string[] {
  if (prior.length === 0) return []; // first ever session isn't a "record"
  const b = bestsFor(ex, prior);
  const out: string[] = [];
  if (ex.kind === 'time') {
    if (set.seconds > b.seconds) out.push('Longest hold');
    return out;
  }
  if (ex.kind === 'cardio') {
    if ((set.distanceM ?? 0) > b.distanceM && b.distanceM > 0) out.push('Longest distance');
    else if (set.seconds > b.seconds) out.push('Longest session');
    return out;
  }
  const bodyweightOnly = ex.equipment === 'bodyweight' && set.weightKg === 0;
  if (!ex.assisted && !bodyweightOnly && set.weightKg > b.weight) out.push('Heaviest');
  else if (!ex.assisted && !bodyweightOnly && set.reps <= 12 && e1rm(set.weightKg, set.reps) > b.e1rm + 0.01) out.push('Best e1RM');
  if ((bodyweightOnly || ex.assisted) && set.reps > b.reps) out.push('Most reps');
  return out;
}

/** Monday 00:00 local time of the week containing `t`. */
export function weekStart(t: number = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

/** Hard sets per muscle: 1 for a primary mover, 0.5 for a secondary. */
export function muscleSets(sets: SetLog[], exMap: Record<string, Exercise>): Record<Muscle, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const s of sets) {
    const ex = exMap[s.exerciseId];
    if (!ex) continue;
    ex.primary.forEach((m) => (out[m] += 1));
    ex.secondary.forEach((m) => (out[m] += 0.5));
  }
  return out;
}

/** Cardio minutes in a set of logs. */
export function cardioMinutes(sets: SetLog[], exMap: Record<string, Exercise>) {
  return sets.reduce((m, s) => (exMap[s.exerciseId]?.kind === 'cardio' ? m + s.seconds / 60 : m), 0);
}

/** Shoulder-to-waist ratio. ~1.6 is the classic "V-taper" target. */
export const vTaperRatio = (shouldersCm?: number, waistCm?: number) =>
  shouldersCm && waistCm ? shouldersCm / waistCm : null;

/** Total load moved (kg × reps). Bodyweight/holds contribute nothing — set counts cover those. */
export function tonnage(sets: SetLog[], exMap: Record<string, Exercise>) {
  return sets.reduce((sum, s) => {
    const ex = exMap[s.exerciseId];
    if (!ex || ex.kind !== 'reps' || ex.assisted) return sum;
    return sum + s.weightKg * s.reps;
  }, 0);
}

import type { Exercise, Settings } from '../types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToUnit = (kg: number, unit: Settings['weightUnit']) => (unit === 'kg' ? kg : kg / KG_PER_LB);
export const unitToKg = (v: number, unit: Settings['weightUnit']) => (unit === 'kg' ? v : v * KG_PER_LB);
export const cmToUnit = (cm: number, unit: Settings['lengthUnit']) => (unit === 'cm' ? cm : cm / CM_PER_IN);
export const unitToCm = (v: number, unit: Settings['lengthUnit']) => (unit === 'cm' ? v : v * CM_PER_IN);

export const round = (v: number, step = 0.5) => Math.round(v / step) * step;

export function fmtWeight(kg: number, unit: Settings['weightUnit']) {
  const v = round(kgToUnit(kg, unit), unit === 'kg' ? 0.25 : 0.5);
  return `${+v.toFixed(2)} ${unit}`;
}

export function fmtLength(cm: number, unit: Settings['lengthUnit']) {
  return `${+cmToUnit(cm, unit).toFixed(1)} ${unit}`;
}

/** Load jump for an exercise, expressed in kg but sized to plates/dumbbells in the user's unit. */
export function incrementKg(ex: Exercise, unit: Settings['weightUnit']) {
  const base = ex.incrementKg || 2.5;
  if (unit === 'kg') return base;
  const lbs = Math.max(2.5, round(base / KG_PER_LB, 2.5));
  return unitToKg(lbs, 'lbs');
}

/** Stepper step for the weight input, in kg. */
export function weightStepKg(ex: Exercise, unit: Settings['weightUnit']) {
  if (ex.equipment === 'kettlebell') return unit === 'kg' ? 4 : unitToKg(5, 'lbs');
  if (unit === 'lbs') return unitToKg(ex.incrementKg && ex.incrementKg < 2 ? 2.5 : 5, 'lbs');
  return ex.incrementKg && ex.incrementKg < 2.5 ? ex.incrementKg : 2.5;
}

const M_PER_MI = 1609.344;
/** Distance unit follows the weight unit: kg → km, lbs → miles. */
export const distUnit = (unit: Settings['weightUnit']) => (unit === 'kg' ? 'km' : 'mi');
export const mToDist = (m: number, unit: Settings['weightUnit']) => (unit === 'kg' ? m / 1000 : m / M_PER_MI);
export const distToM = (d: number, unit: Settings['weightUnit']) => (unit === 'kg' ? d * 1000 : d * M_PER_MI);
export const fmtDist = (m: number, unit: Settings['weightUnit']) => `${+mToDist(m, unit).toFixed(2)} ${distUnit(unit)}`;

export function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

export function fmtClock(totalSec: number) {
  const s = Math.max(0, Math.ceil(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Parse a YYYY-MM-DD string as LOCAL midnight (new Date('YYYY-MM-DD') would be UTC). */
export const parseISODate = (iso: string) => new Date(`${iso}T00:00:00`).getTime();

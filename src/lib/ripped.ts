import type { BodyLog } from '../types';

// "Ripped" = low body fat on top of the muscle the program builds. Abs start to show
// around 12% and are sharp around 10% for most men, which is where the physiques this
// app aims for sit. This module estimates body fat from a tape measure and turns it
// into a phase, a calorie deficit and a rough timeline.

/** Target body fat for a ripped, visible-abs look. */
export const RIPPED_BF = 10;

/**
 * US Navy tape-measure body fat (men): uses waist at the navel, neck below the Adam's
 * apple, and height, all in cm. Typically within ~3–4% of a DEXA scan, and the trend
 * week to week is what matters. Returns null when it can't be computed.
 */
export function navyBodyFat(waistCm?: number, neckCm?: number, heightCm?: number): number | null {
  if (!waistCm || !neckCm || !heightCm || waistCm - neckCm <= 0) return null;
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  return Number.isFinite(bf) ? Math.max(3, Math.min(60, bf)) : null;
}

export interface Phase {
  id: 'lean-out' | 'get-ripped' | 'stay-ripped';
  name: string;
  /** Daily calories below maintenance. */
  deficit: number;
  cardioMin: number;
  steps: string;
  tip: string;
}

export const PHASES: Record<Phase['id'], Phase> = {
  'lean-out': {
    id: 'lean-out', name: 'Phase 1 · Lean out', deficit: 500, cardioMin: 150, steps: '8–10k',
    tip: 'Belly first: a steady 500 kcal deficit, heavy lifting to keep every bit of muscle, and lots of walking.',
  },
  'get-ripped': {
    id: 'get-ripped', name: 'Phase 2 · Get ripped', deficit: 400, cardioMin: 150, steps: '10–12k',
    tip: 'Abs start to show around 12%. Keep protein high (2.2 g/kg), keep the weights heavy, and stay patient.',
  },
  'stay-ripped': {
    id: 'stay-ripped', name: 'Phase 3 · Stay ripped & build', deficit: 0, cardioMin: 90, steps: '8–10k',
    tip: 'You’re there. Eat at maintenance, hold ~10%, and keep adding muscle to shoulders, back and arms.',
  },
};

/** Which phase to be in for a body-fat estimate (unknown = lean out, the safe default for a belly). */
export function phaseFor(bf: number | null): Phase {
  if (bf == null || bf > 15) return PHASES['lean-out'];
  if (bf > RIPPED_BF + 1.5) return PHASES['get-ripped'];
  return PHASES['stay-ripped'];
}

/**
 * Fat left to lose to reach the target, keeping current lean mass, and a timeline at a
 * sustainable 0.5–0.8% of bodyweight per week.
 */
export function roadToRipped(weightKg: number, bf: number, target = RIPPED_BF) {
  const lean = weightKg * (1 - bf / 100);
  const goalWeight = lean / (1 - target / 100);
  const fatToLose = Math.max(0, weightKg - goalWeight);
  const weeks = (pace: number) => (fatToLose <= 0 ? 0 : Math.ceil(fatToLose / (weightKg * pace)));
  return { leanKg: lean, goalWeightKg: goalWeight, fatToLoseKg: fatToLose, weeksMin: weeks(0.008), weeksMax: weeks(0.005) };
}

/** Body-fat estimate for each check-in that has a waist and neck, using the given height. */
export function bodyFatSeries(logs: BodyLog[], heightCm?: number) {
  return logs
    .map((b) => ({ date: b.date, bf: navyBodyFat(b.waistCm, b.neckCm ?? lastNeck(logs, b.date), heightCm) }))
    .filter((x): x is { date: string; bf: number } => x.bf != null);
}

/** Neck size barely changes, so reuse the latest one measured on or before a date. */
function lastNeck(logs: BodyLog[], date: string) {
  return [...logs].reverse().find((b) => b.neckCm != null && b.date <= date)?.neckCm;
}

/** Latest body-fat estimate, the first one (for progress) and the phase. */
export function ripStatus(logs: BodyLog[], heightCm?: number) {
  const series = bodyFatSeries(logs, heightCm);
  const latest = series[series.length - 1]?.bf ?? null;
  return { series, latest, first: series[0]?.bf ?? null, phase: phaseFor(latest) };
}

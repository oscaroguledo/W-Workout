import type { FoodLog, Settings } from '../types';

/** Calories from macros: 4 kcal/g protein & carbs, 9 kcal/g fat. */
export const kcalFromMacros = (protein: number, carbs: number, fat: number) => Math.round(protein * 4 + carbs * 4 + fat * 9);

export interface Targets {
  proteinG: number | null;
  kcal: number | null;
  /** Rough maintenance estimate (null without a bodyweight). */
  maintenance: number | null;
  estimated: boolean;
}

/**
 * Daily targets for a recomp:
 * - protein = bodyweight × settings.proteinPerKg (1.6–2.2 g/kg)
 * - calories = manual target if set, else maintenance − 400. Maintenance is a rough
 *   estimate (bodyweight × 31 kcal for someone training ~4×/week). Adjust it with
 *   the waist trend: if the waist isn't dropping after 3–4 weeks, eat ~150 kcal less.
 */
export function dailyTargets(settings: Settings, bodyweightKg?: number): Targets {
  const maintenance = bodyweightKg ? Math.round((bodyweightKg * 31) / 10) * 10 : null;
  return {
    proteinG: bodyweightKg ? Math.round(bodyweightKg * settings.proteinPerKg) : null,
    kcal: settings.kcalTarget ?? (maintenance ? maintenance - 400 : null),
    maintenance,
    estimated: settings.kcalTarget == null,
  };
}

export interface Totals { protein: number; carbs: number; fat: number; kcal: number }

export function totals(logs: FoodLog[]): Totals {
  return logs.reduce<Totals>((t, l) => ({
    protein: t.protein + l.protein * l.servings,
    carbs: t.carbs + l.carbs * l.servings,
    fat: t.fat + l.fat * l.servings,
    kcal: t.kcal + l.kcal * l.servings,
  }), { protein: 0, carbs: 0, fat: 0, kcal: 0 });
}

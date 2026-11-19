import { describe, expect, it } from '@jest/globals';
import { DEFAULT_FOODS, FOOD_CATEGORIES } from '../data/foods';
import { DEFAULT_SETTINGS, type FoodLog } from '../types';
import { dailyTargets, kcalFromMacros, totals } from './nutrition';

describe('nutrition', () => {
  it('derives protein and calorie targets from bodyweight', () => {
    const t = dailyTargets(DEFAULT_SETTINGS, 70);
    expect(t.proteinG).toBe(140);            // 2.0 g/kg
    expect(t.maintenance).toBe(2170);        // 70 × 31
    expect(t.kcal).toBe(1770);               // small deficit
    expect(t.estimated).toBe(true);
  });

  it('uses a manual calorie target and protein setting when given', () => {
    const t = dailyTargets({ ...DEFAULT_SETTINGS, kcalTarget: 2200, proteinPerKg: 1.6 }, 80);
    expect(t.kcal).toBe(2200);
    expect(t.proteinG).toBe(128);
    expect(t.estimated).toBe(false);
  });

  it('has no targets until a bodyweight is logged', () => {
    expect(dailyTargets(DEFAULT_SETTINGS).proteinG).toBeNull();
  });

  it('sums logged servings', () => {
    const log = (servings: number): FoodLog => ({ id: 'x', date: '2026-11-19', foodId: 'f', name: 'f', servings, protein: 20, carbs: 10, fat: 5, kcal: 165 });
    expect(totals([log(2), log(1)])).toEqual({ protein: 60, carbs: 30, fat: 15, kcal: 495 });
  });

  it('starter foods are sensible: every category filled, ids unique, calories roughly match macros', () => {
    for (const c of FOOD_CATEGORIES) expect(DEFAULT_FOODS.some((f) => f.category === c.id)).toBe(true);
    expect(new Set(DEFAULT_FOODS.map((f) => f.id)).size).toBe(DEFAULT_FOODS.length);
    // Alcohol's calories come from ethanol (7 kcal/g), not macros, so it's exempt.
    const off = DEFAULT_FOODS.filter((f) => f.kcal > 20 && !f.name.startsWith('Alcohol') && Math.abs(kcalFromMacros(f.protein, f.carbs, f.fat) - f.kcal) / f.kcal > 0.2)
      .map((f) => `${f.name}: ${f.kcal} vs ${kcalFromMacros(f.protein, f.carbs, f.fat)}`);
    expect(off).toEqual([]);
  });
});

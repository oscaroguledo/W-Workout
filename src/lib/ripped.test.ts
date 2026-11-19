import { describe, expect, it } from '@jest/globals';
import { bodyFatSeries, navyBodyFat, phaseFor, RIPPED_BF, roadToRipped } from './ripped';
import { dailyTargets } from './nutrition';
import { DEFAULT_SETTINGS } from '../types';

describe('road to ripped', () => {
  it('estimates body fat with the US Navy formula', () => {
    // 178 cm, waist 92, neck 38 → about 21–22%
    expect(navyBodyFat(92, 38, 178)).toBeGreaterThan(20);
    expect(navyBodyFat(92, 38, 178)).toBeLessThan(23);
    // a lean 178 cm man, waist 78, neck 39 → around 10%
    expect(navyBodyFat(78, 39, 178)).toBeGreaterThan(8);
    expect(navyBodyFat(78, 39, 178)).toBeLessThan(12.5);
    expect(navyBodyFat(92, undefined, 178)).toBeNull();
    expect(navyBodyFat(30, 40, 178)).toBeNull();
  });

  it('picks the phase from body fat', () => {
    expect(phaseFor(null).id).toBe('lean-out');
    expect(phaseFor(22).id).toBe('lean-out');
    expect(phaseFor(14).id).toBe('get-ripped');
    expect(phaseFor(10.5).id).toBe('stay-ripped');
  });

  it('works out the fat to lose and a sensible timeline', () => {
    const r = roadToRipped(82, 20);
    expect(r.leanKg).toBeCloseTo(65.6);
    expect(r.goalWeightKg).toBeCloseTo(72.9, 1);
    expect(r.fatToLoseKg).toBeCloseTo(9.1, 1);
    expect(r.weeksMin).toBeGreaterThan(10);
    expect(r.weeksMax).toBeGreaterThan(r.weeksMin);
    expect(roadToRipped(75, RIPPED_BF - 1).fatToLoseKg).toBe(0);
  });

  it('sets the calorie deficit from the phase', () => {
    const s = { ...DEFAULT_SETTINGS };
    expect(dailyTargets(s, 82, 20).kcal).toBe(dailyTargets(s, 82).maintenance! - 500);
    expect(dailyTargets(s, 82, 13).kcal).toBe(dailyTargets(s, 82).maintenance! - 400);
    expect(dailyTargets(s, 82, 10).kcal).toBe(dailyTargets(s, 82).maintenance!);
    expect(dailyTargets({ ...s, kcalTarget: 2000 }, 82, 20).kcal).toBe(2000);
  });

  it('reuses the last neck measurement for later check-ins', () => {
    const series = bodyFatSeries([
      { id: '1', date: '2026-11-01', waistCm: 94, neckCm: 38 },
      { id: '2', date: '2026-11-08', waistCm: 92 },
    ], 178);
    expect(series).toHaveLength(2);
    expect(series[1].bf).toBeLessThan(series[0].bf);
  });
});

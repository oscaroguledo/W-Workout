import { describe, expect, it } from '@jest/globals';
import { DEFAULT_FOODS, DEFAULT_MEALS } from '../data/foods';
import { DEFAULT_SETTINGS } from '../types';
import { before, currentMeal, mealsFor, MEAL_SHARE, toHM, toMin, todaySchedule } from './meals';

const times = DEFAULT_SETTINGS.mealTimes; // 08:00 / 13:00 / 19:00
const at = (h: number, m = 0) => new Date(2026, 10, 19, h, m); // a Thursday

describe('meal times', () => {
  it('converts clock strings', () => {
    expect(toMin('08:30')).toBe(510);
    expect(toHM(510)).toBe('08:30');
    expect(toHM(-30)).toBe('23:30');
    expect(toHM(1440 + 15)).toBe('00:15');
  });

  it('picks the meal you are most likely logging', () => {
    expect(currentMeal(at(7, 30), times)).toBe('breakfast');
    expect(currentMeal(at(10, 0), times)).toBe('breakfast');
    expect(currentMeal(at(11, 0), times)).toBe('lunch');
    expect(currentMeal(at(15, 30), times)).toBe('lunch');
    expect(currentMeal(at(17, 0), times)).toBe('dinner');
    expect(currentMeal(at(21, 30), times)).toBe('dinner');
    expect(currentMeal(at(23, 0), times)).toBe('snack');
    expect(currentMeal(at(3, 0), times)).toBe('snack');
  });

  it('schedules reminders before the meal, moving to the previous day across midnight', () => {
    expect(before('08:00', 30)).toEqual({ hour: 7, minute: 30, day: 0 });
    expect(before('18:00', 60, 4)).toEqual({ hour: 17, minute: 0, day: 4 });
    expect(before('00:15', 30, 0)).toEqual({ hour: 23, minute: 45, day: 6 });
  });

  it('meal shares add up to the whole day', () => {
    const sum = (k: 'protein' | 'kcal') => Object.values(MEAL_SHARE).reduce((a, s) => a + s[k], 0);
    expect(sum('protein')).toBeCloseTo(1);
    expect(sum('kcal')).toBeCloseTo(1);
  });

  it('every starter food (except the "limit" list) suits at least one meal', () => {
    const missing = DEFAULT_FOODS.filter((f) => f.category !== 'limit' && mealsFor({ ...f, meals: undefined }, DEFAULT_MEALS).length === 0);
    expect(missing.map((f) => f.name)).toEqual([]);
    expect(DEFAULT_FOODS.filter((f) => mealsFor(f, DEFAULT_MEALS).includes('breakfast')).length).toBeGreaterThan(5);
  });

  it('builds today’s schedule with the workout on training days only', () => {
    const thu = todaySchedule(DEFAULT_SETTINGS, at(12, 0)); // Thursday is a default training day
    expect(thu.items.map((i) => i.kind)).toEqual(['breakfast', 'lunch', 'workout', 'dinner']);
    expect(thu.items[thu.nextIdx].kind).toBe('lunch');
    const wed = todaySchedule(DEFAULT_SETTINGS, new Date(2026, 10, 18, 19, 15));
    expect(wed.items.map((i) => i.kind)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(wed.items[wed.nextIdx].kind).toBe('dinner'); // still "now" within 30 min
    expect(todaySchedule(DEFAULT_SETTINGS, new Date(2026, 10, 18, 22, 0)).nextIdx).toBe(-1);
  });
});

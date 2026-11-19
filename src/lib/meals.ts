import type { Food, FoodCategory, MainMeal, Meal, Settings } from '../types';

export const MEAL_INFO: Record<Meal, { label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' | 'cafe-outline'; tip: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', tip: 'Protein + slow carbs: oats with Greek yogurt and berries, or eggs on wholemeal toast.' },
  lunch: { label: 'Lunch', icon: 'partly-sunny-outline', tip: 'Palm of lean protein, fist of carbs, half the plate veg. Batch-cooked chicken and rice is perfect.' },
  dinner: { label: 'Dinner', icon: 'moon-outline', tip: 'Protein + lots of veg. More carbs on training days, fewer on rest days.' },
  snack: { label: 'Snacks', icon: 'cafe-outline', tip: 'High-protein snacks keep hunger down: skyr, cottage cheese, a shake, fruit.' },
};

/** Share of the daily protein / calorie targets each meal should cover. */
export const MEAL_SHARE: Record<Meal, { protein: number; kcal: number }> = {
  breakfast: { protein: 0.3, kcal: 0.25 },
  lunch: { protein: 0.3, kcal: 0.3 },
  dinner: { protein: 0.3, kcal: 0.35 },
  snack: { protein: 0.1, kcal: 0.1 },
};

/** "HH:MM" → minutes since midnight. */
export const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
/** Minutes since midnight (any integer, wraps) → "HH:MM". */
export const toHM = (min: number) => {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
/** Friendly clock label in the phone's locale, e.g. "8:00 AM" or "08:00". */
export const fmtHM = (hm: string) => {
  const d = new Date(2000, 0, 1, Math.floor(toMin(hm) / 60), toMin(hm) % 60);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** The meal you're most likely logging at this moment, given your meal times. */
export function currentMeal(now: Date, times: Record<MainMeal, string>): Meal {
  const t = now.getHours() * 60 + now.getMinutes();
  const b = toMin(times.breakfast), l = toMin(times.lunch), d = toMin(times.dinner);
  if (t < b - 180) return 'snack';           // middle of the night / very early
  if (t < (b + l) / 2) return 'breakfast';
  if (t < (l + d) / 2) return 'lunch';
  if (t < d + 180) return 'dinner';
  return 'snack';
}

/**
 * A reminder `lead` minutes before `hm` on JS weekday `day` (0 = Sunday).
 * Returns hour/minute plus the weekday it lands on (it moves to the previous day
 * if it crosses midnight).
 */
export function before(hm: string, lead: number, day = 0) {
  const raw = toMin(hm) - lead;
  const shift = raw < 0 ? -1 : 0;
  const v = toMin(toHM(raw));
  return { hour: Math.floor(v / 60), minute: v % 60, day: (day + shift + 7) % 7 };
}

const BY_CATEGORY: Record<FoodCategory, Meal[]> = {
  protein: ['lunch', 'dinner'], carbs: ['lunch', 'dinner'], veg: ['lunch', 'dinner'], fruit: ['breakfast', 'snack'],
  fats: ['lunch', 'dinner'], drinks: ['breakfast', 'lunch', 'dinner', 'snack'], limit: [],
};

/** Meals a food suits: what you set on it, else the starter suggestion, else by category. */
export const mealsFor = (f: Food, defaults: Record<string, Meal[] | undefined>): Meal[] =>
  f.meals ?? defaults[f.id] ?? BY_CATEGORY[f.category];

/** Upcoming items on today's schedule (meals + workout), sorted by time. */
export function todaySchedule(s: Settings, now: Date) {
  const items: { kind: Meal | 'workout'; hm: string }[] = (['breakfast', 'lunch', 'dinner'] as const)
    .map((m) => ({ kind: m, hm: s.mealTimes[m] }));
  if (s.workoutDays.includes(now.getDay())) items.push({ kind: 'workout', hm: s.workoutTime });
  items.sort((a, b) => toMin(a.hm) - toMin(b.hm));
  const t = now.getHours() * 60 + now.getMinutes();
  const nextIdx = items.findIndex((i) => toMin(i.hm) > t - 30);
  return { items, nextIdx };
}

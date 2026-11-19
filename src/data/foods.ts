import type { Food, FoodCategory, Meal } from '../types';

// Starter food list for a recomp (build muscle, lose belly fat). Values are typical
// per-serving figures from standard nutrition tables; brands vary, so edit any food
// to match the packet you actually buy.

export const FOOD_CATEGORIES: { id: FoodCategory; label: string; blurb: string }[] = [
  { id: 'protein', label: 'Protein', blurb: 'Base of every meal: a palm-sized portion 3–4 times a day.' },
  { id: 'carbs', label: 'Carbs', blurb: 'Fuel for training: a fist-sized portion, more on gym days, less on rest days.' },
  { id: 'veg', label: 'Veg', blurb: 'Fill half the plate. Very filling and low in calories, which makes the deficit easier.' },
  { id: 'fruit', label: 'Fruit', blurb: '1–3 a day. Good before training or as a sweet swap.' },
  { id: 'fats', label: 'Healthy fats', blurb: 'Needed, but calorie-dense: a thumb-sized portion per meal.' },
  { id: 'drinks', label: 'Drinks', blurb: '2–3 L of water a day; more on training days.' },
  { id: 'limit', label: 'Limit for now', blurb: 'Not banned, but these make the belly hardest to lose. Keep them occasional.' },
];

type Seed = Omit<Food, 'id' | 'order'>;
const F = (name: string, category: FoodCategory, serving: string, protein: number, carbs: number, fat: number, kcal: number, note?: string): Seed =>
  ({ name, category, serving, protein, carbs, fat, kcal, note });

const SEEDS: Seed[] = [
  // ---- protein
  F('Chicken breast', 'protein', '150 g cooked', 46, 0, 5, 240, 'Leanest everyday protein. Batch-cook for the week.'),
  F('Turkey breast', 'protein', '150 g cooked', 45, 0, 3, 210),
  F('Eggs', 'protein', '2 large', 13, 1, 10, 145, 'Cheap, filling breakfast.'),
  F('Egg whites', 'protein', '150 g', 16, 1, 0, 75, 'Mix with whole eggs for a bigger, leaner omelette.'),
  F('Greek yogurt 0% fat', 'protein', '200 g', 20, 8, 0, 115, 'Add berries and a few oats for a quick meal.'),
  F('Skyr', 'protein', '150 g', 16, 6, 0, 95),
  F('Cottage cheese (low fat)', 'protein', '200 g', 22, 7, 3, 145, 'Slow-digesting, a good evening snack.'),
  F('Tuna (canned in water)', 'protein', '1 can, drained (110 g)', 26, 0, 1, 115),
  F('Salmon fillet', 'protein', '120 g', 25, 0, 15, 240, 'Omega-3 fats. Aim for oily fish twice a week.'),
  F('White fish (cod, haddock)', 'protein', '150 g', 30, 0, 1, 135),
  F('Lean beef mince 5%', 'protein', '125 g raw', 26, 0, 6, 155, 'Iron + creatine. Great for bolognese or chilli.'),
  F('Whey protein shake', 'protein', '1 scoop (30 g) with water', 24, 3, 1.5, 120, 'Handy after training or when you are short on protein.'),
  F('Tofu (firm)', 'protein', '150 g', 18, 3, 9, 165),
  F('Lentils (cooked)', 'protein', '150 g', 13, 30, 1, 175, 'Protein + carbs + fibre in one.'),

  // ---- carbs
  F('Oats', 'carbs', '50 g dry', 6, 30, 4, 190, 'Slow-release. Breakfast 1–2 h before training.'),
  F('Basmati rice', 'carbs', '150 g cooked', 4, 42, 0.5, 190),
  F('Potatoes (boiled)', 'carbs', '200 g', 4, 34, 0.2, 150, 'One of the most filling foods per calorie.'),
  F('Sweet potato', 'carbs', '200 g', 3, 40, 0.3, 170),
  F('Wholemeal bread', 'carbs', '2 slices', 9, 30, 2.5, 180),
  F('Wholewheat pasta', 'carbs', '180 g cooked', 9, 50, 2, 255),
  F('Quinoa', 'carbs', '150 g cooked', 6, 32, 3, 180),
  F('Beans / chickpeas', 'carbs', '120 g drained', 9, 20, 3, 145, 'Fibre keeps you full.'),
  F('Rice cakes', 'carbs', '2 cakes', 2, 15, 0.5, 70, 'Quick pre-workout snack with a little peanut butter.'),

  // ---- veg
  F('Broccoli', 'veg', '100 g', 3, 4, 0.5, 35),
  F('Spinach', 'veg', '100 g', 3, 1.5, 0.4, 25, 'Wilt into eggs, curries, pasta.'),
  F('Peppers', 'veg', '100 g', 1, 5, 0.3, 30),
  F('Green beans', 'veg', '100 g', 2, 4, 0.2, 30),
  F('Carrots', 'veg', '100 g', 0.6, 8, 0.2, 40),
  F('Mixed salad', 'veg', '100 g', 1, 3, 0.2, 20),
  F('Tomatoes', 'veg', '100 g', 1, 3, 0.2, 20),
  F('Mushrooms', 'veg', '100 g', 3, 0.5, 0.5, 15),
  F('Frozen mixed veg', 'veg', '100 g', 3, 8, 0.5, 60, 'Cheap, keeps for months, no prep.'),

  // ---- fruit
  F('Banana', 'fruit', '1 medium', 1.3, 27, 0.4, 105, 'Perfect 30–60 min before the gym.'),
  F('Berries', 'fruit', '150 g', 1.5, 15, 0.5, 70, 'Frozen berries are cheaper and just as good.'),
  F('Apple', 'fruit', '1 medium', 0.5, 25, 0.3, 95),
  F('Orange', 'fruit', '1 medium', 1.2, 15, 0.2, 60),
  F('Kiwi', 'fruit', '2 fruits', 2, 20, 1, 85),

  // ---- healthy fats
  F('Avocado', 'fats', '½ avocado', 1.5, 6, 15, 160),
  F('Olive oil', 'fats', '1 tbsp', 0, 0, 13.5, 120, 'Measure it: free-poured oil is the #1 hidden calorie.'),
  F('Peanut butter', 'fats', '1 tbsp (15 g)', 4, 3, 8, 95),
  F('Almonds', 'fats', '25 g (small handful)', 5, 5, 13, 145),
  F('Chia seeds', 'fats', '15 g', 2.5, 6, 4.5, 75),

  // ---- drinks
  F('Water', 'drinks', '500 ml', 0, 0, 0, 0, 'Aim for 2–3 L a day.'),
  F('Semi-skimmed milk', 'drinks', '250 ml', 9, 12, 4, 120),
  F('Black coffee / tea', 'drinks', '1 cup', 0, 0, 0, 2, 'Fine pre-workout. Watch the sugar and syrups.'),
  F('Zero-sugar soft drink', 'drinks', '330 ml can', 0, 0, 0, 1, 'Better than full-sugar while you cut down.'),

  // ---- limit
  F('Sugary drinks / juice', 'limit', '330 ml', 0, 35, 0, 140, 'Liquid sugar does not fill you up. Swap for zero-sugar or water.'),
  F('Alcohol (pint of beer)', 'limit', '1 pint', 2, 18, 0, 210, 'Slows fat loss and recovery, and makes late-night food more likely.'),
  F('Fried takeaway', 'limit', '1 portion', 25, 80, 45, 850, 'One meal can wipe out a day’s deficit.'),
  F('Pastries / biscuits', 'limit', '1 pastry or 3 biscuits', 4, 30, 15, 270),
  F('Crisps', 'limit', '1 bag (40 g)', 2.5, 21, 13, 210),
];

// Which meals each starter food suits best (shown as suggestions on the Food tab).
const B: Meal = 'breakfast', L: Meal = 'lunch', D: Meal = 'dinner', S: Meal = 'snack';
const MEAL_FIT: Record<string, Meal[]> = {
  'Chicken breast': [L, D], 'Turkey breast': [L, D], 'Eggs': [B], 'Egg whites': [B], 'Greek yogurt 0% fat': [B, S], 'Skyr': [B, S],
  'Cottage cheese (low fat)': [S], 'Tuna (canned in water)': [L], 'Salmon fillet': [D], 'White fish (cod, haddock)': [D],
  'Lean beef mince 5%': [D], 'Whey protein shake': [B, S], 'Tofu (firm)': [L, D], 'Lentils (cooked)': [L, D],
  'Oats': [B], 'Basmati rice': [L, D], 'Potatoes (boiled)': [D], 'Sweet potato': [L, D], 'Wholemeal bread': [B, L],
  'Wholewheat pasta': [D], 'Quinoa': [L], 'Beans / chickpeas': [L, D], 'Rice cakes': [S],
  'Broccoli': [D], 'Spinach': [B, D], 'Peppers': [L, D], 'Green beans': [D], 'Carrots': [L, S], 'Mixed salad': [L],
  'Tomatoes': [L], 'Mushrooms': [B, D], 'Frozen mixed veg': [D],
  'Banana': [B, S], 'Berries': [B, S], 'Apple': [S], 'Orange': [S], 'Kiwi': [B, S],
  'Avocado': [B, L], 'Olive oil': [L, D], 'Peanut butter': [B, S], 'Almonds': [S], 'Chia seeds': [B],
  'Water': [B, L, D, S], 'Semi-skimmed milk': [B], 'Black coffee / tea': [B, S], 'Zero-sugar soft drink': [L, S],
};

let n = 0;
const counters: Record<string, number> = {};
export const DEFAULT_FOODS: Food[] = SEEDS.map((s) => {
  counters[s.category] = (counters[s.category] ?? 0) + 1;
  return { ...s, id: `food-${++n}`, order: counters[s.category], meals: MEAL_FIT[s.name] };
});

/** Starter meal suggestions by food id (applies to starter foods saved before meals existed). */
export const DEFAULT_MEALS: Record<string, Meal[] | undefined> = Object.fromEntries(DEFAULT_FOODS.map((f) => [f.id, f.meals]));

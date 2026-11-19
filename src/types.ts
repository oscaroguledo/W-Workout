// Core data model. All weights are stored in kg and all lengths in cm;
// conversion to lbs / inches happens only at display/input time.

export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'neck';

export const MUSCLES: Muscle[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'neck',
];

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'smith' | 'bodyweight' | 'band' | 'cardio';

export const EQUIPMENT: Equipment[] = ['machine', 'cable', 'dumbbell', 'barbell', 'kettlebell', 'smith', 'bodyweight', 'band', 'cardio'];

/**
 * 'reps'   = counted reps (with load)
 * 'time'   = isometric hold / carry, measured in seconds
 * 'cardio' = duration in minutes (+ optional distance); plan ranges are minutes
 */
export type ExerciseKind = 'reps' | 'time' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment;
  kind: ExerciseKind;
  /** Short coaching cues shown on demand during a set. */
  cues: string[];
  /** Exercise ids that train the same pattern — used when equipment is busy. */
  alternatives: string[];
  /** Bodyweight progression ladder: easier / harder variation ids. */
  easier?: string;
  harder?: string;
  /** Load jump in kg when progressing (per dumbbell for dumbbell work). */
  incrementKg: number;
  /** True if reps are counted per side (split squats, deadbugs…). */
  perSide?: boolean;
  /** Load is assistance (assisted pull-up machine): less weight = harder. */
  assisted?: boolean;
  custom?: boolean;
}

/** One exercise slot inside a routine or an active session. */
export interface PlanItem {
  exerciseId: string;
  sets: number;
  /** Reps; seconds for 'time' exercises; minutes for 'cardio'. */
  repMin: number;
  repMax: number;
  restSec: number;
  /** Set when the user swapped this slot to an alternative mid-workout. */
  originalExerciseId?: string;
}

export interface Routine {
  id: string;
  name: string;
  /** Short label like "A", "B", "C" shown in the rotation. */
  tag: string;
  focus: string;
  /** Position in the flexible A → B → C rotation. */
  order: number;
  items: PlanItem[];
}

export interface Session {
  id: string;
  routineId?: string;
  name: string;
  startedAt: number;
  /** undefined while the workout is in progress. */
  endedAt?: number;
  /** Snapshot of the plan (incl. swaps / added exercises) so a session can be resumed. */
  plan: PlanItem[];
  notes?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  /** Index of the slot in session.plan, to keep swapped exercises separate. */
  slot: number;
  setIndex: number;
  /** Load in kg. For bodyweight exercises this is *added* load (0 = bodyweight). */
  weightKg: number;
  reps: number;
  /** Used instead of reps for 'time' exercises, and as duration for 'cardio'. */
  seconds: number;
  /** Cardio distance in metres (0 when not tracked). */
  distanceM: number;
  completedAt: number;
}

export interface BodyLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg?: number;
  waistCm?: number;
  /** Shoulder circumference, for the shoulder-to-waist (V-taper) ratio. */
  shouldersCm?: number;
  notes?: string;
}

export type FoodCategory = 'protein' | 'carbs' | 'veg' | 'fruit' | 'fats' | 'drinks' | 'limit';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
/** Meals that have a set time of day (snacks are whenever). */
export type MainMeal = Exclude<Meal, 'snack'>;

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  /** Human serving description, e.g. "150 g cooked" or "2 large". */
  serving: string;
  /** Per serving. */
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  note?: string;
  /** Position within its category. */
  order: number;
  /** Meals this food suits; unset = the built-in suggestion for starter foods. */
  meals?: Meal[];
}

/** A logged serving. Macros are snapshotted so editing a food never rewrites history. */
export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  foodId: string;
  name: string;
  servings: number;
  /** Which meal it was eaten at. Older logs have none and show under snacks. */
  meal?: Meal;
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export interface Settings {
  id: 'settings';
  weightUnit: 'kg' | 'lbs';
  lengthUnit: 'cm' | 'in';
  heightCm?: number;
  defaultRestSec: number;
  sound: boolean;
  vibrate: boolean;
  /** Fallback target of working sets per muscle per week. */
  weeklySetTarget: number;
  /** Per-muscle weekly set targets set by the active program (priorities for the goal physique). */
  muscleTargets?: Partial<Record<Muscle, number>>;
  /** Weekly cardio target in minutes. */
  weeklyCardioMin: number;
  /** The program the routines were loaded from. */
  programId?: string;
  /** Daily protein target in grams per kg of bodyweight (1.6–2.2 for recomp). */
  proteinPerKg: number;
  /** Manual daily calorie target; when unset it's estimated from bodyweight. */
  kcalTarget?: number;
  /** Meal times as "HH:MM" (24 h). */
  mealTimes: Record<MainMeal, string>;
  /** Remind this many minutes before each meal (0 = off). */
  mealReminderMin: number;
  /** Training days, 0 = Sunday … 6 = Saturday. */
  workoutDays: number[];
  /** Usual training time "HH:MM". */
  workoutTime: string;
  /** Remind this many minutes before training (0 = off). */
  workoutReminderMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  weightUnit: 'kg',
  lengthUnit: 'cm',
  defaultRestSec: 90,
  sound: true,
  vibrate: true,
  weeklySetTarget: 10,
  weeklyCardioMin: 120,
  proteinPerKg: 2,
  mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '19:00' },
  mealReminderMin: 0,
  workoutDays: [1, 2, 4, 5],
  workoutTime: '18:00',
  workoutReminderMin: 0,
};

export const targetFor = (s: Settings, m: Muscle) => s.muscleTargets?.[m] ?? s.weeklySetTarget;

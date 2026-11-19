import * as SQLite from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { EXERCISES } from '../data/exercises';
import { DEFAULT_PROGRAM, type Program } from '../data/programs';
import type { BodyLog, Exercise, Food, FoodLog, Meal, PlanItem, Routine, Session, SetLog, Settings } from '../types';
import { DEFAULT_FOODS } from '../data/foods';
import { DEFAULT_SETTINGS } from '../types';

// On-device SQLite: every set is written the moment it's ticked, so logging
// works with zero signal. Weights in kg, lengths in cm.
// Opened asynchronously in migrate() (called once by the root layout before any screen
// renders): on web the SQLite engine boots in a worker and isn't ready synchronously.
let sqlite: SQLite.SQLiteDatabase;

const DB_VERSION = 3;

export async function migrate() {
  sqlite ??= await SQLite.openDatabaseAsync('recomp.db');
  const row = await sqlite.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DB_VERSION) return;
  if (current === 0) {
    await sqlite.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS custom_exercises (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY NOT NULL, ord INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL, routine_id TEXT, name TEXT NOT NULL,
        started_at INTEGER NOT NULL, ended_at INTEGER, plan TEXT NOT NULL, notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
        slot INTEGER NOT NULL, set_index INTEGER NOT NULL, weight_kg REAL NOT NULL,
        reps INTEGER NOT NULL, seconds INTEGER NOT NULL, completed_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id, completed_at);
      CREATE INDEX IF NOT EXISTS idx_sets_completed ON sets(completed_at);
      CREATE TABLE IF NOT EXISTS body_logs (
        id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, weight_kg REAL, waist_cm REAL, notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_body_date ON body_logs(date);
      CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
    `);
    await putRoutines(DEFAULT_PROGRAM.routines, false);
    await saveSettings(settingsForProgram(DEFAULT_SETTINGS, DEFAULT_PROGRAM), false);
  }
  if (current < 2) {
    // v2: cardio distance + shoulder measurement (V-taper ratio).
    await sqlite.execAsync(`
      ALTER TABLE sets ADD COLUMN distance_m REAL NOT NULL DEFAULT 0;
      ALTER TABLE body_logs ADD COLUMN shoulders_cm REAL;
    `);
  }
  if (current < 3) {
    // v3: editable food list + daily food log.
    await sqlite.execAsync(`
      CREATE TABLE IF NOT EXISTS foods (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS food_logs (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
    `);
    await seedFoods();
  }
  await sqlite.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

async function seedFoods() {
  for (const f of DEFAULT_FOODS) {
    await sqlite.runAsync('INSERT OR REPLACE INTO foods (id, data) VALUES (?, ?)', f.id, JSON.stringify(f));
  }
}

function settingsForProgram(s: Settings, p: Program): Settings {
  return { ...s, programId: p.id, muscleTargets: p.muscleTargets, weeklyCardioMin: p.weeklyCardioMin };
}

/** Replace all routines with a program's routines and adopt its weekly targets. */
export async function applyProgram(p: Program) {
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync('DELETE FROM routines');
    for (const r of p.routines) {
      await sqlite.runAsync('INSERT INTO routines (id, ord, data) VALUES (?, ?, ?)', r.id, r.order, JSON.stringify(r));
    }
  });
  await saveSettings(settingsForProgram(await getSettings(), p));
}

// ---------------------------------------------------------------- reactivity
// Tiny change-notification store: every write bumps a version, and useQuery
// re-runs its loader. Good enough for a single-user local database.
let version = 0;
const listeners = new Set<() => void>();
export function notify() {
  version++;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const v = useSyncExternalStore(subscribe, () => version);
  const [data, setData] = useState<T>();
  useEffect(() => {
    let alive = true;
    load().then((d) => alive && setData(d)).catch((e) => console.warn('query failed', e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);
  return data;
}

export const uid = () =>
  Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

// ---------------------------------------------------------------- settings
export async function getSettings(): Promise<Settings> {
  const row = await sqlite.getFirstAsync<{ data: string }>('SELECT data FROM settings WHERE id = ?', 'settings');
  return row ? { ...DEFAULT_SETTINGS, ...JSON.parse(row.data) } : DEFAULT_SETTINGS;
}
export async function saveSettings(s: Settings, emit = true) {
  await sqlite.runAsync('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)', 'settings', JSON.stringify(s));
  if (emit) notify();
}
export async function updateSettings(patch: Partial<Settings>) {
  await saveSettings({ ...(await getSettings()), ...patch });
}

// ---------------------------------------------------------------- exercises
export async function getExercises(): Promise<Exercise[]> {
  const rows = await sqlite.getAllAsync<{ data: string }>('SELECT data FROM custom_exercises');
  return [...EXERCISES, ...rows.map((r) => JSON.parse(r.data) as Exercise)];
}
export async function addCustomExercise(e: Exercise) {
  await sqlite.runAsync('INSERT OR REPLACE INTO custom_exercises (id, data) VALUES (?, ?)', e.id, JSON.stringify(e));
  notify();
}
export async function deleteCustomExercise(id: string) {
  await sqlite.runAsync('DELETE FROM custom_exercises WHERE id = ?', id);
  notify();
}

// ---------------------------------------------------------------- routines
export async function getRoutines(): Promise<Routine[]> {
  const rows = await sqlite.getAllAsync<{ data: string }>('SELECT data FROM routines ORDER BY ord');
  return rows.map((r) => JSON.parse(r.data));
}
export async function putRoutine(r: Routine) {
  await sqlite.runAsync('INSERT OR REPLACE INTO routines (id, ord, data) VALUES (?, ?, ?)', r.id, r.order, JSON.stringify(r));
  notify();
}
export async function putRoutines(rs: Routine[], emit = true) {
  for (const r of rs) {
    await sqlite.runAsync('INSERT OR REPLACE INTO routines (id, ord, data) VALUES (?, ?, ?)', r.id, r.order, JSON.stringify(r));
  }
  if (emit) notify();
}
export async function deleteRoutine(id: string) {
  await sqlite.runAsync('DELETE FROM routines WHERE id = ?', id);
  notify();
}

// ---------------------------------------------------------------- sessions
type SessionRow = { id: string; routine_id: string | null; name: string; started_at: number; ended_at: number | null; plan: string; notes: string | null };
const toSession = (r: SessionRow): Session => ({
  id: r.id, routineId: r.routine_id ?? undefined, name: r.name, startedAt: r.started_at,
  endedAt: r.ended_at ?? undefined, plan: JSON.parse(r.plan) as PlanItem[], notes: r.notes ?? undefined,
});

export async function getSession(id: string) {
  const r = await sqlite.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id);
  return r ? toSession(r) : null;
}
export async function getActiveSession() {
  const r = await sqlite.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC');
  return r ? toSession(r) : null;
}
export async function getLastFinishedSession() {
  const r = await sqlite.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC');
  return r ? toSession(r) : null;
}
export async function getFinishedSessions(limit = 200) {
  const rows = await sqlite.getAllAsync<SessionRow>('SELECT * FROM sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ?', limit);
  return rows.map(toSession);
}
export async function countFinishedSince(ts: number) {
  const r = await sqlite.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sessions WHERE ended_at IS NOT NULL AND started_at >= ?', ts);
  return r?.n ?? 0;
}
export async function addSession(s: Session) {
  await sqlite.runAsync(
    'INSERT INTO sessions (id, routine_id, name, started_at, ended_at, plan, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    s.id, s.routineId ?? null, s.name, s.startedAt, s.endedAt ?? null, JSON.stringify(s.plan), s.notes ?? null,
  );
  notify();
}
export async function updateSession(id: string, patch: Partial<Pick<Session, 'plan' | 'endedAt' | 'notes'>>) {
  if (patch.plan) await sqlite.runAsync('UPDATE sessions SET plan = ? WHERE id = ?', JSON.stringify(patch.plan), id);
  if ('endedAt' in patch) await sqlite.runAsync('UPDATE sessions SET ended_at = ? WHERE id = ?', patch.endedAt ?? null, id);
  if ('notes' in patch) await sqlite.runAsync('UPDATE sessions SET notes = ? WHERE id = ?', patch.notes ?? null, id);
  notify();
}
export async function deleteSession(id: string) {
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync('DELETE FROM sets WHERE session_id = ?', id);
    await sqlite.runAsync('DELETE FROM sessions WHERE id = ?', id);
  });
  notify();
}

// ---------------------------------------------------------------- sets
const setCols = (t = '') =>
  `${t}id AS id, ${t}session_id AS sessionId, ${t}exercise_id AS exerciseId, ${t}slot AS slot, ${t}set_index AS setIndex, ` +
  `${t}weight_kg AS weightKg, ${t}reps AS reps, ${t}seconds AS seconds, ${t}distance_m AS distanceM, ${t}completed_at AS completedAt`;
const SET_COLS = setCols();

export const getSetsForSession = (sessionId: string) =>
  sqlite.getAllAsync<SetLog>(`SELECT ${SET_COLS} FROM sets WHERE session_id = ? ORDER BY slot, set_index`, sessionId);

export function getSetsForExercises(ids: string[], excludeSession: string) {
  if (!ids.length) return Promise.resolve([] as SetLog[]);
  const qs = ids.map(() => '?').join(',');
  return sqlite.getAllAsync<SetLog>(
    `SELECT ${SET_COLS} FROM sets WHERE exercise_id IN (${qs}) AND session_id != ? ORDER BY completed_at`, ...ids, excludeSession);
}
export const getSetsSince = (ts: number, until = Number.MAX_SAFE_INTEGER) =>
  sqlite.getAllAsync<SetLog>(`SELECT ${SET_COLS} FROM sets WHERE completed_at >= ? AND completed_at < ?`, ts, until);

export const getFinishedSets = () =>
  sqlite.getAllAsync<SetLog>(`SELECT ${setCols('s.')} FROM sets s
    JOIN sessions ss ON ss.id = s.session_id WHERE ss.ended_at IS NOT NULL ORDER BY s.completed_at`);

export async function addSet(input: Omit<SetLog, 'completedAt'>) {
  const s: SetLog = { ...input, completedAt: Date.now() };
  await sqlite.runAsync(
    `INSERT INTO sets (id, session_id, exercise_id, slot, set_index, weight_kg, reps, seconds, distance_m, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.id, s.sessionId, s.exerciseId, s.slot, s.setIndex, s.weightKg, s.reps, s.seconds, s.distanceM ?? 0, s.completedAt,
  );
  notify();
  return s;
}
export async function updateSet(id: string, patch: Partial<Pick<SetLog, 'weightKg' | 'reps' | 'seconds' | 'distanceM'>>) {
  if (patch.distanceM !== undefined) await sqlite.runAsync('UPDATE sets SET distance_m = ? WHERE id = ?', patch.distanceM, id);
  if (patch.weightKg !== undefined) await sqlite.runAsync('UPDATE sets SET weight_kg = ? WHERE id = ?', patch.weightKg, id);
  if (patch.reps !== undefined) await sqlite.runAsync('UPDATE sets SET reps = ? WHERE id = ?', patch.reps, id);
  if (patch.seconds !== undefined) await sqlite.runAsync('UPDATE sets SET seconds = ? WHERE id = ?', patch.seconds, id);
  notify();
}
export async function deleteSet(id: string) {
  await sqlite.runAsync('DELETE FROM sets WHERE id = ?', id);
  notify();
}
/** Remove a slot from an in-progress session and shift later sets down. */
export async function removeSlot(sessionId: string, slot: number, plan: PlanItem[]) {
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync('UPDATE sets SET slot = slot - 1 WHERE session_id = ? AND slot > ?', sessionId, slot);
    await sqlite.runAsync('UPDATE sessions SET plan = ? WHERE id = ?', JSON.stringify(plan.filter((_, i) => i !== slot)), sessionId);
  });
  notify();
}

// ---------------------------------------------------------------- body logs
type BodyRow = { id: string; date: string; weight_kg: number | null; waist_cm: number | null; shoulders_cm: number | null; notes: string | null };
const toBody = (r: BodyRow): BodyLog => ({
  id: r.id, date: r.date, weightKg: r.weight_kg ?? undefined, waistCm: r.waist_cm ?? undefined,
  shouldersCm: r.shoulders_cm ?? undefined, notes: r.notes ?? undefined,
});
export async function getBodyLogs() {
  return (await sqlite.getAllAsync<BodyRow>('SELECT * FROM body_logs ORDER BY date, rowid')).map(toBody);
}
export async function addBodyLog(b: BodyLog) {
  await sqlite.runAsync('INSERT INTO body_logs (id, date, weight_kg, waist_cm, shoulders_cm, notes) VALUES (?, ?, ?, ?, ?, ?)',
    b.id, b.date, b.weightKg ?? null, b.waistCm ?? null, b.shouldersCm ?? null, b.notes ?? null);
  notify();
}
export async function deleteBodyLog(id: string) {
  await sqlite.runAsync('DELETE FROM body_logs WHERE id = ?', id);
  notify();
}

// ---------------------------------------------------------------- food
export async function getFoods(): Promise<Food[]> {
  const rows = await sqlite.getAllAsync<{ data: string }>('SELECT data FROM foods');
  return rows.map((r) => JSON.parse(r.data) as Food).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
export async function putFood(f: Food) {
  await sqlite.runAsync('INSERT OR REPLACE INTO foods (id, data) VALUES (?, ?)', f.id, JSON.stringify(f));
  notify();
}
export async function deleteFood(id: string) {
  await sqlite.runAsync('DELETE FROM foods WHERE id = ?', id);
  notify();
}
/** Restore the starter list (your own added foods are kept; edited starter foods are reset). */
export async function resetFoods() {
  await seedFoods();
  notify();
}

export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  const rows = await sqlite.getAllAsync<{ data: string }>('SELECT data FROM food_logs WHERE date = ? ORDER BY rowid', date);
  return rows.map((r) => JSON.parse(r.data));
}
export async function logFood(food: Food, date: string, meal: Meal, servings = 1) {
  const existing = (await getFoodLogs(date)).find((l) => l.foodId === food.id && (l.meal ?? 'snack') === meal);
  if (existing) return setFoodLogServings(existing, existing.servings + servings);
  const log: FoodLog = {
    id: uid(), date, foodId: food.id, name: food.name, servings, meal,
    protein: food.protein, carbs: food.carbs, fat: food.fat, kcal: food.kcal,
  };
  await sqlite.runAsync('INSERT INTO food_logs (id, date, data) VALUES (?, ?, ?)', log.id, date, JSON.stringify(log));
  notify();
}
export async function setFoodLogServings(log: FoodLog, servings: number) {
  if (servings <= 0) await sqlite.runAsync('DELETE FROM food_logs WHERE id = ?', log.id);
  else await sqlite.runAsync('UPDATE food_logs SET data = ? WHERE id = ?', JSON.stringify({ ...log, servings }), log.id);
  notify();
}

// ---------------------------------------------------------------- backup
export async function exportAll() {
  return {
    app: 'recomp', version: 1, exportedAt: new Date().toISOString(),
    exercises: (await getExercises()).filter((e) => e.custom),
    routines: await getRoutines(),
    sessions: (await sqlite.getAllAsync<SessionRow>('SELECT * FROM sessions')).map(toSession),
    sets: await sqlite.getAllAsync<SetLog>(`SELECT ${SET_COLS} FROM sets`),
    bodyLogs: await getBodyLogs(),
    settings: await getSettings(),
    foods: await getFoods(),
    foodLogs: (await sqlite.getAllAsync<{ data: string }>('SELECT data FROM food_logs')).map((r) => JSON.parse(r.data) as FoodLog),
  };
}
export type Backup = Awaited<ReturnType<typeof exportAll>>;

export async function importAll(data: Backup) {
  if (data?.app !== 'recomp') throw new Error('Not a Recomp backup');
  await sqlite.withTransactionAsync(async () => {
    await sqlite.execAsync('DELETE FROM custom_exercises; DELETE FROM routines; DELETE FROM sessions; DELETE FROM sets; DELETE FROM body_logs; DELETE FROM food_logs;');
    if (data.foods?.length) {
      await sqlite.execAsync('DELETE FROM foods;');
      for (const f of data.foods) await sqlite.runAsync('INSERT INTO foods (id, data) VALUES (?, ?)', f.id, JSON.stringify(f));
    }
    for (const l of data.foodLogs ?? []) await sqlite.runAsync('INSERT INTO food_logs (id, date, data) VALUES (?, ?, ?)', l.id, l.date, JSON.stringify(l));
    for (const e of data.exercises ?? []) await sqlite.runAsync('INSERT INTO custom_exercises (id, data) VALUES (?, ?)', e.id, JSON.stringify(e));
    for (const r of data.routines ?? []) await sqlite.runAsync('INSERT INTO routines (id, ord, data) VALUES (?, ?, ?)', r.id, r.order, JSON.stringify(r));
    for (const s of data.sessions ?? []) {
      await sqlite.runAsync('INSERT INTO sessions (id, routine_id, name, started_at, ended_at, plan, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        s.id, s.routineId ?? null, s.name, s.startedAt, s.endedAt ?? null, JSON.stringify(s.plan), s.notes ?? null);
    }
    for (const s of data.sets ?? []) {
      await sqlite.runAsync(`INSERT INTO sets (id, session_id, exercise_id, slot, set_index, weight_kg, reps, seconds, distance_m, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, s.id, s.sessionId, s.exerciseId, s.slot, s.setIndex, s.weightKg, s.reps, s.seconds, s.distanceM ?? 0, s.completedAt);
    }
    for (const b of data.bodyLogs ?? []) {
      await sqlite.runAsync('INSERT INTO body_logs (id, date, weight_kg, waist_cm, shoulders_cm, notes) VALUES (?, ?, ?, ?, ?, ?)',
        b.id, b.date, b.weightKg ?? null, b.waistCm ?? null, b.shouldersCm ?? null, b.notes ?? null);
    }
    await sqlite.runAsync('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)', 'settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...data.settings }));
  });
  notify();
}

export async function eraseAll() {
  await sqlite.execAsync('DELETE FROM custom_exercises; DELETE FROM routines; DELETE FROM sessions; DELETE FROM sets; DELETE FROM body_logs; DELETE FROM settings; DELETE FROM foods; DELETE FROM food_logs;');
  await seedFoods();
  await putRoutines(DEFAULT_PROGRAM.routines, false);
  await saveSettings(settingsForProgram(DEFAULT_SETTINGS, DEFAULT_PROGRAM), false);
  notify();
}

// ---------------------------------------------------------------- hooks
export function useSettings(): Settings {
  return useQuery(getSettings) ?? DEFAULT_SETTINGS;
}
const BUILTIN_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export function useExerciseMap(): Record<string, Exercise> {
  const all = useQuery(getExercises);
  return all ? Object.fromEntries(all.map((e) => [e.id, e])) : BUILTIN_MAP;
}

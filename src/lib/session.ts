import { addSession, getActiveSession, uid } from '../db';
import type { Exercise, PlanItem, Routine, Session } from '../types';

/** Flexible rotation: whatever routine you did last, offer the next one. */
export function nextRoutine(routines: Routine[], lastFinished?: Session | null): Routine | undefined {
  const sorted = [...routines].sort((a, b) => a.order - b.order);
  if (!sorted.length) return undefined;
  const idx = sorted.findIndex((r) => r.id === lastFinished?.routineId);
  return sorted[(idx + 1) % sorted.length];
}

/** Express = short on time: first 4 exercises, 2 sets each. */
export function expressPlan(items: PlanItem[]): PlanItem[] {
  return items.slice(0, 4).map((i) => ({ ...i, sets: Math.min(i.sets, 2) }));
}

export async function startSession(routine: Routine | null, opts: { express?: boolean } = {}) {
  const existing = await getActiveSession();
  if (existing) return existing.id;
  const plan = routine ? (opts.express ? expressPlan(routine.items) : routine.items) : [];
  const session: Session = {
    id: uid(),
    routineId: routine?.id,
    name: routine ? `${routine.tag} · ${routine.name}${opts.express ? ' (Express)' : ''}` : 'Freestyle',
    startedAt: Date.now(),
    plan: plan.map((i) => ({ ...i })),
  };
  await addSession(session);
  return session.id;
}

export function defaultPlanItem(ex: Exercise, restSec: number): PlanItem {
  if (ex.kind === 'cardio') return { exerciseId: ex.id, sets: 1, repMin: 15, repMax: 30, restSec: 0 };
  return ex.kind === 'time'
    ? { exerciseId: ex.id, sets: 3, repMin: 20, repMax: 40, restSec: 60 }
    : { exerciseId: ex.id, sets: 3, repMin: 8, repMax: 12, restSec };
}

export function estimateMinutes(items: PlanItem[]) {
  const sec = items.reduce((t, i) => t + (i.restSec === 0 && i.sets === 1 ? i.repMax * 60 : i.sets * (45 + i.restSec)), 0);
  return Math.round(sec / 60 / 5) * 5 || 5;
}

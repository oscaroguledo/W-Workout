import type { Exercise, PlanItem, SetLog, Settings } from '../types';
import { incrementKg, round } from './units';

// Double progression:
//   1. Work inside a rep range (e.g. 8–12) at a fixed load.
//   2. When EVERY working set hits the top of the range → add load, drop to the bottom.
//   3. Otherwise keep the load and beat last time by a rep.
//   4. Missed the bottom of the range two sessions in a row → ~10% deload.
// Bodyweight moves without added load progress to the next harder variation instead.

export type SuggestionType =
  | 'first-time' | 'increase-load' | 'increase-reps' | 'repeat' | 'deload' | 'harder-variation';

export interface Suggestion {
  type: SuggestionType;
  weightKg: number;
  /** Reps (or seconds for holds) to aim for on each set. */
  target: number;
  message: string;
  switchTo?: string;
}

const metric = (ex: Exercise, s: SetLog) => (ex.kind === 'time' ? s.seconds : ex.kind === 'cardio' ? s.seconds / 60 : s.reps);

/**
 * @param history  sets for this exercise grouped by past session, most recent first
 */
export function suggest(
  ex: Exercise,
  plan: PlanItem,
  history: SetLog[][],
  unit: Settings['weightUnit'],
  nameOf: (id: string) => string = (id) => id,
): Suggestion {
  if (ex.kind === 'cardio') return suggestCardio(ex, plan, history);
  const unitLabel = ex.kind === 'time' ? 's' : ' reps';
  const last = history[0];
  if (!last || last.length === 0) {
    return {
      type: 'first-time',
      weightKg: 0,
      target: plan.repMin,
      message: ex.kind === 'time'
        ? `First time: hold ${plan.repMin}–${plan.repMax}s with clean form.`
        : ex.equipment === 'bodyweight'
          ? `First time: aim for ${plan.repMin}–${plan.repMax}${unitLabel}, stop 1–2 reps before form breaks.`
          : `First time: pick a load you could lift ~2 more reps than ${plan.repMin}–${plan.repMax}.`,
    };
  }

  // Working load = heaviest (or, for assisted, lightest assistance) used last time.
  const weights = last.map((s) => s.weightKg);
  const topW = ex.assisted ? Math.min(...weights) : Math.max(...weights);
  const working = last.filter((s) => s.weightKg === topW);
  const vals = working.map((s) => metric(ex, s));
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const lastStr = vals.join('·');
  const loaded = ex.assisted || ex.equipment !== 'bodyweight' || topW > 0;
  const inc = incrementKg(ex, unit);

  const allHitTop = working.length >= plan.sets && vals.every((v) => v >= plan.repMax);
  const missedBottom = (sets: SetLog[] | undefined, w: number) =>
    !!sets && sets.length > 0 &&
    sets.filter((s) => s.weightKg === w).length > 0 &&
    sets.filter((s) => s.weightKg === w).every((s) => metric(ex, s) < plan.repMin);

  if (allHitTop) {
    if (loaded && ex.kind === 'reps') {
      const next = ex.assisted ? Math.max(0, topW - inc) : topW + inc;
      return {
        type: 'increase-load', weightKg: next, target: plan.repMin,
        message: ex.assisted
          ? `All sets hit ${plan.repMax} — drop the assistance and aim for ${plan.repMin}+.`
          : `All sets hit ${plan.repMax} last time (${lastStr}) — add load and aim for ${plan.repMin}+.`,
      };
    }
    if (ex.harder) {
      return {
        type: 'harder-variation', weightKg: 0, target: plan.repMax, switchTo: ex.harder,
        message: `You own this (${lastStr}). Ready for ${nameOf(ex.harder)} — tap Swap, or push for more${unitLabel} here.`,
      };
    }
    const bump = ex.kind === 'time' ? 5 : 1;
    return {
      type: 'increase-reps', weightKg: topW, target: maxVal + bump,
      message: ex.kind === 'time'
        ? `Top of range hit (${lastStr}s) — add ${bump}s per hold, or slow down & squeeze harder.`
        : `Top of range hit (${lastStr}) — add a rep, slow the tempo, or hold a dumbbell.`,
    };
  }

  if (missedBottom(last, topW)) {
    if (loaded && missedBottom(history[1], topW) && !ex.assisted) {
      const down = round(topW * 0.9, 0.5);
      return {
        type: 'deload', weightKg: down, target: plan.repMin,
        message: `Stuck under ${plan.repMin} two sessions in a row — drop ~10% and rebuild. Recovery & sleep matter here.`,
      };
    }
    return {
      type: 'repeat', weightKg: topW, target: plan.repMin,
      message: `Same load as last time (${lastStr}) — aim to reach ${plan.repMin}${unitLabel} on every set.`,
    };
  }

  const bump = ex.kind === 'time' ? 5 : 1;
  const target = Math.min(plan.repMax, minVal + bump);
  return {
    type: 'increase-reps', weightKg: topW, target,
    message: `Beat last time (${lastStr}${ex.kind === 'time' ? 's' : ''}) — same load, aim for ${target}${unitLabel} on every set.`,
  };
}

/**
 * Cardio: build duration through the planned range first, then improve distance
 * in the same time (i.e. go a little faster / steeper). `target` is minutes;
 * `weightKg` carries the distance target in metres (0 = not tracked).
 */
function suggestCardio(_ex: Exercise, plan: PlanItem, history: SetLog[][]): Suggestion {
  const last = history[0];
  if (!last || last.length === 0) {
    return {
      type: 'first-time', weightKg: 0, target: plan.repMin,
      message: `First time: ${plan.repMin}–${plan.repMax} min at an easy pace where you can still talk. Log distance if the machine shows it.`,
    };
  }
  const mins = Math.round(Math.max(...last.map((s) => s.seconds)) / 60);
  const dist = Math.max(...last.map((s) => s.distanceM ?? 0));
  if (mins < plan.repMax) {
    const target = Math.min(plan.repMax, mins + 2);
    return {
      type: 'increase-reps', weightKg: dist, target,
      message: `Last time ${mins} min — go ${target} min this time at the same easy pace.`,
    };
  }
  return {
    type: dist > 0 ? 'increase-load' : 'increase-reps', weightKg: dist > 0 ? Math.round(dist * 1.03) : 0, target: plan.repMax,
    message: dist > 0
      ? `You hit ${plan.repMax} min — now cover ~3% more distance in the same time (a bit faster or more incline).`
      : `You hit ${plan.repMax} min — keep the time, raise speed/incline slightly, and log distance to track it.`,
  };
}

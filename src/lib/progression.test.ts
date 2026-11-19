import { describe, expect, it } from '@jest/globals';
import { suggest } from './progression';
import { cardioMinutes, prLabels, muscleSets, vTaperRatio, weekStart } from './stats';
import { EXERCISE_MAP as X, EXERCISES } from '../data/exercises';
import { PROGRAMS } from '../data/programs';
import type { PlanItem, SetLog } from '../types';

let n = 0;
const set = (exerciseId: string, weightKg: number, reps: number, sessionId = 's1', seconds = 0): SetLog =>
  ({ id: String(n++), sessionId, exerciseId, slot: 0, setIndex: n, weightKg, reps, seconds, distanceM: 0, completedAt: n });
const plan = (exerciseId: string, sets = 3, repMin = 8, repMax = 12): PlanItem => ({ exerciseId, sets, repMin, repMax, restSec: 90 });

describe('suggest (double progression)', () => {
  const ex = X['incline-db-press'];
  it('first time gives guidance with no load', () => {
    expect(suggest(ex, plan(ex.id), [], 'kg').type).toBe('first-time');
  });
  it('adds load when every set hits the top of the range', () => {
    const s = suggest(ex, plan(ex.id), [[set(ex.id, 20, 12), set(ex.id, 20, 12), set(ex.id, 20, 12)]], 'kg');
    expect(s.type).toBe('increase-load');
    expect(s.weightKg).toBe(22);
    expect(s.target).toBe(8);
  });
  it('asks for +1 rep when inside the range', () => {
    const s = suggest(ex, plan(ex.id), [[set(ex.id, 20, 10), set(ex.id, 20, 9), set(ex.id, 20, 8)]], 'kg');
    expect(s.type).toBe('increase-reps');
    expect(s.weightKg).toBe(20);
    expect(s.target).toBe(9);
  });
  it('does not add load if fewer sets than planned were done', () => {
    const s = suggest(ex, plan(ex.id), [[set(ex.id, 20, 12), set(ex.id, 20, 12)]], 'kg');
    expect(s.type).toBe('increase-reps');
  });
  it('deloads ~10% after two sessions below the range', () => {
    const last = [set(ex.id, 30, 6, 'b'), set(ex.id, 30, 5, 'b'), set(ex.id, 30, 5, 'b')];
    const prev = [set(ex.id, 30, 7, 'a'), set(ex.id, 30, 6, 'a'), set(ex.id, 30, 6, 'a')];
    const s = suggest(ex, plan(ex.id), [last, prev], 'kg');
    expect(s.type).toBe('deload');
    expect(s.weightKg).toBe(27);
  });
  it('repeats load after one bad session', () => {
    const s = suggest(ex, plan(ex.id), [[set(ex.id, 30, 6), set(ex.id, 30, 5), set(ex.id, 30, 5)]], 'kg');
    expect(s.type).toBe('repeat');
  });
  it('bodyweight move maxed out → harder variation', () => {
    const p = X['push-up'];
    const s = suggest(p, plan(p.id, 3, 8, 15), [[set(p.id, 0, 15), set(p.id, 0, 15), set(p.id, 0, 16)]], 'kg');
    expect(s.type).toBe('harder-variation');
    expect(s.switchTo).toBe('decline-push-up');
  });
  it('assisted pull-up reduces assistance', () => {
    const a = X['assisted-pull-up'];
    const s = suggest(a, plan(a.id, 3, 5, 8), [[set(a.id, 30, 8), set(a.id, 30, 8), set(a.id, 30, 8)]], 'kg');
    expect(s.type).toBe('increase-load');
    expect(s.weightKg).toBe(25);
  });
  it('holds progress in seconds', () => {
    const h = X['plank'];
    const s = suggest(h, plan(h.id, 3, 20, 40), [[set(h.id, 0, 0, 's', 25), set(h.id, 0, 0, 's', 30), set(h.id, 0, 0, 's', 22)]], 'kg');
    expect(s.target).toBe(27);
  });
  it('lbs users get plate-friendly jumps', () => {
    const s = suggest(ex, plan(ex.id), [[set(ex.id, 20, 12), set(ex.id, 20, 12), set(ex.id, 20, 12)]], 'lbs');
    expect((s.weightKg - 20) / 0.45359237).toBeCloseTo(5, 5);
  });
});

describe('stats', () => {
  it('flags a heavier set as a PR, but not the very first session', () => {
    const ex = X['lat-pulldown'];
    expect(prLabels(ex, set(ex.id, 50, 8), [])).toEqual([]);
    expect(prLabels(ex, set(ex.id, 55, 6), [set(ex.id, 50, 10)])).toEqual(['Heaviest']);
    expect(prLabels(ex, set(ex.id, 50, 12), [set(ex.id, 50, 10)])).toEqual(['Best e1RM']);
  });
  it('counts primary sets as 1 and secondary as 0.5', () => {
    const ms = muscleSets([set('incline-db-press', 20, 10)], X);
    expect(ms.chest).toBe(1);
    expect(ms.triceps).toBe(0.5);
  });
  it('week starts on Monday', () => {
    expect(new Date(weekStart(new Date(2026, 10, 18, 15).getTime())).getDay()).toBe(1);
  });
});

describe('data integrity', () => {
  it('every referenced exercise id exists', () => {
    const missing: string[] = [];
    for (const e of EXERCISES) {
      for (const id of [...e.alternatives, e.easier, e.harder].filter(Boolean) as string[]) if (!X[id]) missing.push(`${e.id} → ${id}`);
    }
    for (const p of PROGRAMS) for (const r of p.routines) for (const i of r.items) if (!X[i.exerciseId]) missing.push(`${p.id}/${r.id} → ${i.exerciseId}`);
    expect(missing).toEqual([]);
  });
});

describe('cardio & physique', () => {
  const run = X['treadmill-run'];
  const cardio = (mins: number, distanceM = 0, sessionId = 's'): SetLog =>
    ({ ...set(run.id, 0, 0, sessionId, mins * 60), distanceM });

  it('builds cardio duration first, then distance', () => {
    const p = plan(run.id, 1, 15, 30);
    expect(suggest(run, p, [], 'kg').type).toBe('first-time');
    expect(suggest(run, p, [[cardio(20)]], 'kg').target).toBe(22);
    const s = suggest(run, p, [[cardio(30, 5000)]], 'kg');
    expect(s.type).toBe('increase-load');
    expect(s.weightKg).toBe(5150);
  });

  it('flags a longer run as a PR and sums weekly cardio minutes', () => {
    expect(prLabels(run, cardio(30, 5200), [cardio(30, 5000)])).toEqual(['Longest distance']);
    expect(cardioMinutes([cardio(20), cardio(25), set('push-up', 0, 10)], X)).toBe(45);
  });

  it('kettlebell loads progress in kettlebell-sized jumps', () => {
    const kb = X['kb-goblet-squat'];
    const s = suggest(kb, plan(kb.id, 3, 10, 15), [[set(kb.id, 16, 15), set(kb.id, 16, 15), set(kb.id, 16, 15)]], 'kg');
    expect(s.weightKg).toBe(20);
  });

  it('computes the shoulder-to-waist (V-taper) ratio', () => {
    expect(vTaperRatio(120, 80)).toBeCloseTo(1.5);
    expect(vTaperRatio(undefined, 80)).toBeNull();
  });

  it('the V-taper program prioritises shoulders and back', () => {
    const vt = PROGRAMS.find((p) => p.id === 'aesthetic-vtaper')!;
    expect(vt.muscleTargets.shoulders).toBeGreaterThan(vt.muscleTargets.quads);
    expect(vt.muscleTargets.back).toBeGreaterThan(vt.muscleTargets.hamstrings);
  });
});

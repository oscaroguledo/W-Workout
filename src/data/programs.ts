import type { Muscle, Routine } from '../types';

// Training programs. Each is a flexible rotation: whatever day you get to the gym,
// Today offers the next routine. Switching programs replaces your routines.

export interface Program {
  id: string;
  name: string;
  summary: string;
  /** Who / what it's for, shown in the program picker. */
  details: string[];
  routines: Routine[];
  /** Weekly hard-set targets per muscle: higher = priority for the look you're after. */
  muscleTargets: Record<Muscle, number>;
  weeklyCardioMin: number;
}

// Lean, athletic "fitness creator" physique: wide shoulders + lats (V-taper), full upper
// chest, defined arms, small waist with visible abs, athletic legs, plus regular running.
const AESTHETIC: Program = {
  id: 'aesthetic-vtaper',
  name: 'Aesthetic V-Taper',
  summary: '4-day rotation · shoulders, back, upper chest, arms & abs first · 2–3 runs a week',
  details: [
    'Builds the "fitness model" look: broad shoulders and back that make the waist look smaller.',
    'Extra sets for side/rear delts, lats and upper chest (they shape the V-taper).',
    'Arms trained directly twice per rotation; abs three times; neck + traps for a stronger jaw/neck line.',
    'Legs trained hard once per rotation plus kettlebell work, for an athletic not bulky lower body.',
    'Cardio (runs, incline walks, rower) to bring the waist down while you build muscle.',
  ],
  routines: [
    {
      id: 'vt-a', tag: 'A', order: 0, name: 'Chest & Back Width', focus: 'Upper chest · Lats · Side delts',
      items: [
        { exerciseId: 'incline-db-press', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'lat-pulldown', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'barbell-bench-press', sets: 3, repMin: 6, repMax: 10, restSec: 150 },
        { exerciseId: 'seated-cable-row', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { exerciseId: 'cable-fly', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
        { exerciseId: 'straight-arm-pulldown', sets: 2, repMin: 12, repMax: 15, restSec: 60 },
        { exerciseId: 'lateral-raise', sets: 3, repMin: 12, repMax: 20, restSec: 60 },
      ],
    },
    {
      id: 'vt-b', tag: 'B', order: 1, name: 'Legs & Abs', focus: 'Quads · Hamstrings · Glutes · Abs',
      items: [
        { exerciseId: 'hack-squat', sets: 3, repMin: 8, repMax: 12, restSec: 150 },
        { exerciseId: 'romanian-deadlift', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'walking-lunge', sets: 2, repMin: 10, repMax: 12, restSec: 90 },
        { exerciseId: 'leg-curl', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'leg-extension', sets: 2, repMin: 12, repMax: 15, restSec: 60 },
        { exerciseId: 'seated-calf-raise', sets: 4, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'hanging-leg-raise', sets: 3, repMin: 8, repMax: 15, restSec: 60 },
        { exerciseId: 'cable-crunch', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      ],
    },
    {
      id: 'vt-c', tag: 'C', order: 2, name: 'Shoulders & Arms', focus: 'Delts (side + rear) · Pull-ups · Biceps · Triceps',
      items: [
        { exerciseId: 'db-shoulder-press', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'assisted-pull-up', sets: 3, repMin: 6, repMax: 10, restSec: 120 },
        { exerciseId: 'cable-lateral-raise', sets: 4, repMin: 12, repMax: 20, restSec: 60 },
        { exerciseId: 'rear-delt-fly', sets: 3, repMin: 12, repMax: 20, restSec: 60 },
        { exerciseId: 'incline-db-curl', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
        { exerciseId: 'overhead-cable-extension', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'hammer-curl', sets: 2, repMin: 10, repMax: 12, restSec: 60 },
        { exerciseId: 'cable-pushdown', sets: 2, repMin: 12, repMax: 15, restSec: 60 },
        { exerciseId: 'db-shrug', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      ],
    },
    {
      id: 'vt-d', tag: 'D', order: 3, name: 'Kettlebell Conditioning & Run', focus: 'Swings · Carries · Core · Cardio',
      items: [
        { exerciseId: 'kb-swing', sets: 4, repMin: 15, repMax: 20, restSec: 60 },
        { exerciseId: 'kb-goblet-squat', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'kb-press', sets: 3, repMin: 8, repMax: 12, restSec: 60 },
        { exerciseId: 'kb-row', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
        { exerciseId: 'kb-farmer-carry', sets: 3, repMin: 30, repMax: 60, restSec: 60 },
        { exerciseId: 'ab-wheel', sets: 3, repMin: 6, repMax: 12, restSec: 60 },
        { exerciseId: 'neck-curl', sets: 2, repMin: 15, repMax: 20, restSec: 45 },
        { exerciseId: 'neck-extension', sets: 2, repMin: 15, repMax: 20, restSec: 45 },
        { exerciseId: 'treadmill-run', sets: 1, repMin: 15, repMax: 30, restSec: 0 },
      ],
    },
  ],
  muscleTargets: { shoulders: 16, back: 14, chest: 12, biceps: 12, triceps: 12, core: 12, quads: 10, hamstrings: 8, glutes: 8, calves: 6, neck: 4 },
  weeklyCardioMin: 120,
};

const RECOMP_3DAY: Program = {
  id: 'recomp-3day',
  name: 'Recomp Basics',
  summary: '3-day rotation · balanced full body · good for busy weeks',
  details: [
    'Simple Upper / Lower / Full-body rotation.',
    'Fewer exercises per day, still covers everything.',
    'Use it when you can only train 2–3 times a week.',
  ],
  routines: [
    {
      id: 'day-a', tag: 'A', order: 0, name: 'Upper Body', focus: 'Chest · Back · Shoulders · Arms',
      items: [
        { exerciseId: 'incline-db-press', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'lat-pulldown', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'db-shoulder-press', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        { exerciseId: 'seated-cable-row', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { exerciseId: 'cable-pushdown', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'lateral-raise', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
      ],
    },
    {
      id: 'day-b', tag: 'B', order: 1, name: 'Lower Body & Core', focus: 'Quads · Glutes · Hamstrings · Core',
      items: [
        { exerciseId: 'smith-squat', sets: 3, repMin: 6, repMax: 10, restSec: 120 },
        { exerciseId: 'bulgarian-split-squat', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        { exerciseId: 'romanian-deadlift', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'leg-curl', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'calf-raise', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'cable-crunch', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'deadbug', sets: 2, repMin: 6, repMax: 10, restSec: 60 },
      ],
    },
    {
      id: 'day-c', tag: 'C', order: 2, name: 'Full Body', focus: 'Machines · Pull-ups · Glutes · Core',
      items: [
        { exerciseId: 'leg-press', sets: 3, repMin: 10, repMax: 15, restSec: 90 },
        { exerciseId: 'machine-chest-press', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        { exerciseId: 'assisted-pull-up', sets: 3, repMin: 6, repMax: 10, restSec: 120 },
        { exerciseId: 'hip-thrust', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        { exerciseId: 'machine-row', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { exerciseId: 'db-curl', sets: 2, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'pallof-press', sets: 2, repMin: 10, repMax: 12, restSec: 60 },
      ],
    },
  ],
  muscleTargets: { shoulders: 10, back: 10, chest: 10, biceps: 8, triceps: 8, core: 10, quads: 10, hamstrings: 8, glutes: 8, calves: 6, neck: 0 },
  weeklyCardioMin: 90,
};

const KETTLEBELL: Program = {
  id: 'kettlebell-conditioning',
  name: 'Kettlebell & Conditioning',
  summary: '2-day rotation · only kettlebells + cardio · for packed gyms or training at home',
  details: [
    'Needs just a couple of kettlebells and a cardio machine (or the road).',
    'High-calorie full-body sessions — good for fat loss weeks.',
    'Pair it with the V-Taper program on days the gym floor is rammed.',
  ],
  routines: [
    {
      id: 'kb-a', tag: 'A', order: 0, name: 'KB Strength', focus: 'Squat · Press · Row · Carry',
      items: [
        { exerciseId: 'kb-goblet-squat', sets: 4, repMin: 8, repMax: 15, restSec: 90 },
        { exerciseId: 'kb-press', sets: 4, repMin: 6, repMax: 12, restSec: 90 },
        { exerciseId: 'kb-row', sets: 4, repMin: 8, repMax: 12, restSec: 60 },
        { exerciseId: 'kb-farmer-carry', sets: 3, repMin: 30, repMax: 60, restSec: 60 },
        { exerciseId: 'hanging-knee-raise', sets: 3, repMin: 8, repMax: 15, restSec: 60 },
      ],
    },
    {
      id: 'kb-b', tag: 'B', order: 1, name: 'KB Power & Cardio', focus: 'Swings · Lunges · Push-ups · Intervals',
      items: [
        { exerciseId: 'kb-swing', sets: 5, repMin: 15, repMax: 25, restSec: 60 },
        { exerciseId: 'reverse-lunge', sets: 3, repMin: 8, repMax: 12, restSec: 60 },
        { exerciseId: 'push-up', sets: 3, repMin: 8, repMax: 20, restSec: 60 },
        { exerciseId: 'ab-wheel', sets: 3, repMin: 6, repMax: 12, restSec: 60 },
        { exerciseId: 'assault-bike', sets: 1, repMin: 10, repMax: 20, restSec: 0 },
      ],
    },
  ],
  muscleTargets: { shoulders: 10, back: 10, chest: 8, biceps: 6, triceps: 6, core: 12, quads: 10, hamstrings: 8, glutes: 10, calves: 4, neck: 0 },
  weeklyCardioMin: 150,
};

export const PROGRAMS: Program[] = [AESTHETIC, RECOMP_3DAY, KETTLEBELL];
export const DEFAULT_PROGRAM = AESTHETIC;
export const programById = (id?: string) => PROGRAMS.find((p) => p.id === id) ?? DEFAULT_PROGRAM;

import type { Exercise, Muscle } from '../../types';
import type { Focus } from './render3d';

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', back: 'Back & lats', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Abs & core', neck: 'Neck & traps',
};

// Cardio machines don't count toward weekly muscle volume (no `primary`), but the demo
// still shows what they work, plus the heart and lungs.
const CARDIO: Record<string, Omit<Focus, 'cardio'>> = {
  'rowing-machine': { primary: ['back', 'quads'], secondary: ['biceps', 'hamstrings', 'glutes', 'core'] },
  'assault-bike': { primary: ['quads'], secondary: ['glutes', 'calves', 'shoulders', 'back'] },
  'stair-climber': { primary: ['glutes', 'quads'], secondary: ['calves', 'hamstrings'] },
  'incline-walk': { primary: ['glutes', 'calves'], secondary: ['hamstrings', 'quads'] },
};
const RUN: Omit<Focus, 'cardio'> = { primary: ['quads', 'calves'], secondary: ['glutes', 'hamstrings', 'core'] };

/** The muscles to highlight in an exercise's 3D demo. */
export function focusFor(ex: Pick<Exercise, 'id' | 'kind' | 'primary' | 'secondary'>): Focus {
  if (ex.kind === 'cardio') return { ...(CARDIO[ex.id] ?? RUN), cardio: true };
  return { primary: ex.primary, secondary: ex.secondary.filter((m) => !ex.primary.includes(m)) };
}

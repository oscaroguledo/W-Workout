import { describe, expect, it } from '@jest/globals';
import { EXERCISES } from '../../data/exercises';
import { DEMO_IDS, frame, patternFor, phase, skeleton, type SidePattern } from './poses';

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const STEPS = [0, 0.25, 0.5, 0.75, 1];

describe('exercise demos', () => {
  it('every built-in exercise has its own demo', () => {
    expect(EXERCISES.map((e) => e.id).filter((id) => !DEMO_IDS.includes(id))).toEqual([]);
  });

  it('produces finite, on-canvas coordinates for every exercise and frame', () => {
    const bad: string[] = [];
    for (const ex of EXERCISES) {
      for (const p of STEPS) {
        for (const pr of frame(patternFor(ex), p)) {
          const pts = pr.k === 'line' ? [pr.a, pr.b] : pr.k === 'circle' ? [pr.at] : [[pr.x, pr.y] as [number, number]];
          for (const [x, y] of pts) {
            if (!Number.isFinite(x) || !Number.isFinite(y) || x < -10 || x > 170 || y < -10 || y > 130) bad.push(`${ex.id}@${p}: ${x},${y}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps limb lengths constant through the rep (no stretching)', () => {
    const bad: string[] = [];
    for (const ex of EXERCISES) {
      const pt = patternFor(ex);
      if (pt.view !== 'side') continue;
      for (const p of STEPS) {
        const s = skeleton(pt, p);
        const checks: [string, number, number][] = [
          ['upper arm', dist(s.shoulder, s.elbow), 20], ['thigh', dist(s.hip, s.knee), 26],
          ['torso', dist(s.hip, s.shoulder), 34],
        ];
        for (const [name, got, want] of checks) if (Math.abs(got - want) > 0.5) bad.push(`${ex.id} ${name} ${got.toFixed(1)}`);
        if (dist(s.elbow, s.hand) > 19.5) bad.push(`${ex.id} forearm ${dist(s.elbow, s.hand).toFixed(1)}`);
        if (dist(s.knee, s.foot) > 25.5) bad.push(`${ex.id} shin ${dist(s.knee, s.foot).toFixed(1)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps planted feet planted', () => {
    const pt = patternFor({ id: 'smith-squat', primary: ['quads'], equipment: 'smith', kind: 'reps' }) as SidePattern;
    const feet = STEPS.map((p) => skeleton(pt, p).foot);
    for (const f of feet) expect(dist(f, feet[0])).toBeLessThan(0.5);
  });

  it('custom exercises fall back to a sensible demo', () => {
    expect(() => frame(patternFor({ id: 'custom-x', primary: ['chest'], equipment: 'machine', kind: 'reps' }), 0.5)).not.toThrow();
    expect(patternFor({ id: 'custom-y', primary: ['core'], equipment: 'bodyweight', kind: 'time' }).view).toBe('side');
  });

  it('phase ping-pongs between 0 and 1', () => {
    expect(phase(0, 2)).toBe(0);
    expect(phase(1, 2)).toBeCloseTo(1);
    expect(phase(2, 2)).toBeCloseTo(0);
  });
});

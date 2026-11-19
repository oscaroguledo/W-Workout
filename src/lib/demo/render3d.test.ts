import { describe, expect, it } from '@jest/globals';
import { EXERCISES } from '../../data/exercises';
import { patternFor } from './poses';
import { defaultYaw, fitView, render3d, type Shape } from './render3d';

describe('3D exercise demos', () => {
  it('renders every exercise from several camera angles with valid, on-screen shapes', () => {
    const bad: string[] = [];
    for (const ex of EXERCISES) {
      const pt = patternFor(ex);
      for (const dyaw of [-40, 0, 40]) {
        for (const p of [0, 0.5, 1]) {
          const shapes = render3d(pt, p, { yaw: defaultYaw(pt) + dyaw, pitch: 12 });
          if (shapes.length < 20) bad.push(`${ex.id}: only ${shapes.length} shapes`);
          for (const sh of shapes) {
            const pts = sh.k === 'poly' ? sh.pts : sh.k === 'sphere' ? [sh.at] : [sh.a, sh.b];
            for (const [x, y] of pts) {
              if (!Number.isFinite(x) || !Number.isFinite(y) || x < -40 || x > 200 || y < -20 || y > 150) {
                bad.push(`${ex.id} yaw${dyaw} p${p}: ${x.toFixed(1)},${y.toFixed(1)}`);
              }
            }
            if ('color' in sh && sh.color.includes('NaN')) bad.push(`${ex.id}: bad colour`);
            if (sh.k === 'poly' && sh.fill.includes('NaN')) bad.push(`${ex.id}: bad fill`);
          }
        }
      }
    }
    expect([...new Set(bad)].slice(0, 10)).toEqual([]);
  });

  it('draws far-away shapes before near ones (painter’s algorithm)', () => {
    const shapes = render3d(patternFor(EXERCISES[0]), 0.5, { yaw: -30, pitch: 12 });
    for (let i = 1; i < shapes.length; i++) expect(shapes[i].depth).toBeGreaterThanOrEqual(shapes[i - 1].depth);
  });

  it('frames every exercise so nothing is cut off through the whole rep', () => {
    const inside = (s: Shape, v: { x: number; y: number; w: number; h: number }) => {
      const pts = s.k === 'capsule' ? [s.a, s.b] : s.k === 'sphere' ? [s.at] : s.k === 'line' ? [s.a, s.b] : s.pts;
      return pts.every(([x, y]) => x >= v.x - 0.5 && x <= v.x + v.w + 0.5 && y >= v.y - 0.5 && y <= v.y + v.h + 0.5);
    };
    const bad: string[] = [];
    for (const ex of EXERCISES) {
      const pt = patternFor(ex);
      const yaw = defaultYaw(pt);
      const v = fitView(pt, yaw, 12, 30);
      expect(v.w / v.h).toBeCloseTo(160 / 112, 1);
      for (const dy of [-30, 0, 30]) {
        for (const p of [0, 0.5, 1]) {
          const off = render3d(pt, p, { yaw: yaw + dy, pitch: 12 }).filter((s) => s.depth > -990 && !inside(s, v));
          if (off.length) bad.push(`${ex.id} p=${p} yaw+${dy}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

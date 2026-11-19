import { describe, expect, it } from '@jest/globals';
import { EXERCISES } from '../../data/exercises';
import { patternFor } from './poses';
import { defaultYaw, render3d } from './render3d';

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
});

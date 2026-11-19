// 3D exercise demos. The 2D keyframe skeleton (poses.ts) is lifted into 3D — the
// body faces +x, up is −y, and left/right limbs sit at ±z — then rendered as a shaded
// mannequin with perspective, painter's-algorithm depth sorting, a floor + shadow and
// 3D equipment. Output is plain shapes in a 160×120 viewBox, so it renders anywhere
// (react-native-svg in the app, an SVG string in tests/previews).

import {
  FLOOR_Y, HEAD_R, skeleton, type FrontPattern, type Pattern, type Prop, type Pt, type SidePattern,
} from './poses';

export type V3 = [number, number, number];

export type Shape =
  | { k: 'capsule'; a: Pt; b: Pt; w: number; color: string; hi: string; depth: number }
  | { k: 'sphere'; at: Pt; r: number; color: string; hi: string; depth: number }
  | { k: 'poly'; pts: Pt[]; fill: string; stroke?: string; opacity?: number; depth: number }
  | { k: 'line'; a: Pt; b: Pt; w: number; color: string; dash?: boolean; depth: number };

export interface Camera {
  /** Degrees around the vertical axis. 0 = straight side view. */
  yaw: number;
  /** Degrees looking down. */
  pitch: number;
}

const SH_Z = 11;   // half shoulder width
const HIP_Z = 6.5; // half hip width
const CX = 80, CY = 64, FOCAL = 280;

// mannequin palette
const SHIRT = '#3d7fc4', SHORTS = '#2b303c', SKIN = '#d9ad86', SHOE = '#1b1e25';
const METAL = '#a3adbb', IRON = '#454c58', PAD = '#2c3d4f', PAD_EDGE = '#5d7fa0', FLOOR = '#1d222c';

// ------------------------------------------------------------------ colour helpers
function hexToRgb(h: string): V3 {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb(c: V3) {
  return `rgb(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')})`;
}
/** Darken/lighten a colour: f < 1 darker, f > 1 lighter (towards white). */
function shade(hex: string, f: number) {
  const c = hexToRgb(hex);
  return f <= 1 ? rgb([c[0] * f, c[1] * f, c[2] * f]) : rgb(c.map((v) => v + (255 - v) * (f - 1)) as V3);
}

// ------------------------------------------------------------------ camera
interface Projected { p: Pt; d: number; s: number }
function makeProjector(cam: Camera) {
  const yaw = (cam.yaw * Math.PI) / 180, pitch = (cam.pitch * Math.PI) / 180;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (v: V3): Projected => {
    const x = v[0] - 80, y = v[1] - CY, z = v[2];
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp + z1 * sp;
    const z2 = -y * sp + z1 * cp; // + = towards the camera
    const s = FOCAL / (FOCAL - z2);
    return { p: [CX + x1 * s, CY + y2 * s], d: z2, s };
  };
}

// ------------------------------------------------------------------ scene building
class Scene {
  shapes: Shape[] = [];
  private proj: (v: V3) => Projected;
  constructor(proj: (v: V3) => Projected) {
    this.proj = proj;
  }

  /** Light falls from the camera side: nearer = brighter. `bright` > 1 lifts it further (top faces). */
  private lit(base: string, d: number, bright = 1) {
    return shade(base, (0.62 + 0.38 * Math.max(0, Math.min(1, (d + 30) / 60))) * bright);
  }

  capsule(a: V3, b: V3, w: number, color: string) {
    const pa = this.proj(a), pb = this.proj(b);
    const d = (pa.d + pb.d) / 2;
    const s = (pa.s + pb.s) / 2;
    this.shapes.push({ k: 'capsule', a: pa.p, b: pb.p, w: w * s, color: this.lit(color, d), hi: shade(color, 1.35), depth: d });
  }
  sphere(c: V3, r: number, color: string, bias = 0) {
    const pc = this.proj(c);
    this.shapes.push({ k: 'sphere', at: pc.p, r: r * pc.s, color: this.lit(color, pc.d), hi: shade(color, 1.5), depth: pc.d + bias });
  }
  poly(pts: V3[], fill: string, opts: { stroke?: string; opacity?: number; depth?: number; flat?: boolean; bright?: number } = {}) {
    const pp = pts.map(this.proj);
    const d = opts.depth ?? pp.reduce((t, q) => t + q.d, 0) / pp.length;
    this.shapes.push({ k: 'poly', pts: pp.map((q) => q.p), fill: opts.flat ? fill : this.lit(fill, d, opts.bright), stroke: opts.stroke, opacity: opts.opacity, depth: d });
  }
  line(a: V3, b: V3, w: number, color: string, dash = false) {
    const pa = this.proj(a), pb = this.proj(b);
    this.shapes.push({ k: 'line', a: pa.p, b: pb.p, w: w * (pa.s + pb.s) / 2, color, dash, depth: (pa.d + pb.d) / 2 });
  }
  box(x: number, y: number, w: number, h: number, zHalf: number, color = PAD) {
    const X0 = x, X1 = x + w, Y0 = y, Y1 = y + h, Z0 = -zHalf, Z1 = zHalf;
    const faces: V3[][] = [
      [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1]], // top
      [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], // +z side
      [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], // -z side
      [[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], // back
      [[X1, Y0, Z0], [X1, Y0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], // front
    ];
    faces.forEach((f, i) => this.poly(f, color, { stroke: PAD_EDGE, bright: i === 0 ? 1.3 : 1 }));
  }
  sorted() {
    return this.shapes.sort((a, b) => a.depth - b.depth);
  }
}

const v3 = (p: Pt, z: number): V3 => [p[0], p[1], z];
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function floor(sc: Scene, shadowAt: Pt, spread: number) {
  const y = FLOOR_Y;
  sc.poly([[8, y, -40], [152, y, -40], [152, y, 40], [8, y, 40]], FLOOR, { depth: -999, flat: true, stroke: '#262c38' });
  for (let x = 26; x < 152; x += 18) sc.line([x, y, -40], [x, y, 40], 0.4, '#262c38');
  sc.shapes[sc.shapes.length - 1].depth = -998;
  for (const s of sc.shapes) if (s.k === 'line' && s.color === '#262c38') s.depth = -998;
  // soft contact shadow
  const pts: V3[] = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return [shadowAt[0] + Math.cos(a) * spread, y, Math.sin(a) * 16];
  });
  sc.poly(pts, '#000000', { opacity: 0.35, depth: -997, flat: true });
}

/** A body segment with clothing: `split` = fraction from `a` covered by `cloth`. */
function limb(sc: Scene, a: V3, b: V3, w: number, cloth: string, split: number, skin = SKIN, wEnd = w) {
  if (split >= 1) { sc.capsule(a, b, w, cloth); return; }
  const m = lerp3(a, b, split);
  if (split > 0) sc.capsule(a, m, w + 1, cloth);
  sc.capsule(m, b, wEnd, skin);
}

function addFigure(sc: Scene, j: {
  head: V3; neck: V3;
  shN: V3; elN: V3; haN: V3; shF: V3; elF: V3; haF: V3;
  hipN: V3; knN: V3; ftN: V3; hipF: V3; knF: V3; ftF: V3;
  forward: Pt; // direction the feet point (x, z-less)
}) {
  // torso: chest/back volume + width slab
  const shMid = lerp3(j.shN, j.shF, 0.5), hipMid = lerp3(j.hipN, j.hipF, 0.5);
  sc.capsule(hipMid, shMid, 15, SHIRT);
  sc.poly([j.shN, j.shF, j.hipF, j.hipN], SHIRT);
  sc.capsule(j.shN, j.shF, 9, SHIRT);
  sc.capsule(j.hipN, j.hipF, 10, SHORTS);
  sc.capsule(shMid, j.neck, 5, SKIN);
  sc.sphere(j.head, HEAD_R, SKIN, 0.5);
  // limbs
  for (const [sh, el, ha] of [[j.shN, j.elN, j.haN], [j.shF, j.elF, j.haF]] as V3[][]) {
    limb(sc, sh, el, 6.5, SHIRT, 0.45);
    sc.capsule(el, ha, 5.2, SKIN);
    sc.sphere(ha, 2.8, SKIN);
  }
  for (const [hp, kn, ft] of [[j.hipN, j.knN, j.ftN], [j.hipF, j.knF, j.ftF]] as V3[][]) {
    limb(sc, hp, kn, 8.5, SHORTS, 0.85, SKIN, 8);
    sc.capsule(kn, ft, 6.4, SKIN);
    sc.capsule(ft, [ft[0] + j.forward[0] * 7, ft[1] + j.forward[1] * 7, ft[2]], 5, SHOE);
  }
}

// ------------------------------------------------------------------ side patterns
function sideScene(pt: SidePattern, p: number, sc: Scene) {
  const s = skeleton(pt, p, [0, 0]);
  const back: Pt = [Math.sin(((s.t + 90) * Math.PI) / 180), Math.cos(((s.t + 90) * Math.PI) / 180)];
  const torsoDir: Pt = [Math.sin((s.t * Math.PI) / 180), Math.cos((s.t * Math.PI) / 180)];
  const props = pt.props ?? [];
  const bothHandsTogether = Math.hypot(s.hand[0] - s.hand2[0], s.hand[1] - s.hand2[1]) < 6;
  const handZ = SH_Z + 1;

  floor(sc, [s.hip[0] + 4, FLOOR_Y], 26);

  for (const pr of props) propSide(sc, pr, s, back, torsoDir, bothHandsTogether);

  addFigure(sc, {
    head: v3(s.head, 0), neck: v3([s.shoulder[0] + torsoDir[0] * 6, s.shoulder[1] + torsoDir[1] * 6], 0),
    shN: v3(s.shoulder, SH_Z), elN: v3(s.elbow, SH_Z + 1), haN: v3(s.hand, handZ),
    shF: v3(s.shoulder, -SH_Z), elF: v3(s.elbow2, -SH_Z - 1), haF: v3(s.hand2, -handZ),
    hipN: v3(s.hip, HIP_Z), knN: v3(s.knee, HIP_Z + 0.5), ftN: v3(s.foot, HIP_Z + 1),
    hipF: v3(s.hip, -HIP_Z), knF: v3(s.knee2, -HIP_Z - 0.5), ftF: v3(s.foot2, -HIP_Z - 1),
    forward: [1, 0.05],
  });

  for (const pr of props) if (pr.k === 'impl') implSide(sc, pr, s, back, bothHandsTogether, handZ);
}

type Sk = ReturnType<typeof skeleton>;

function propSide(sc: Scene, pr: Prop, s: Sk, back: Pt, torsoDir: Pt, together: boolean) {
  switch (pr.k) {
    case 'box': sc.box(pr.x, pr.y, pr.w, pr.h, 14); break;
    case 'step': sc.box(pr.x, FLOOR_Y - 8, pr.w, 8, 14); break;
    case 'bar':
      // rails/posts on both sides of the body
      for (const z of [-17, 17]) sc.capsule(v3(pr.a, z), v3(pr.b, z), 3, METAL);
      break;
    case 'crossbar': sc.capsule(v3(pr.at, -26), v3(pr.at, 26), 3.2, METAL); break;
    case 'cable': {
      const anchor = v3(pr.from, 0);
      sc.sphere(anchor, 3, IRON);
      const hands: V3[] = together ? [v3(mid(s.hand, s.hand2), 0)] : [v3(s.hand, SH_Z + 1), v3(s.hand2, -SH_Z - 1)];
      hands.forEach((h) => sc.line(anchor, h, 0.8, '#b6bdc8', true));
      break;
    }
    case 'backPad': {
      const a: Pt = [s.hip[0] + back[0] * 5 - torsoDir[0] * 4, s.hip[1] + back[1] * 5 - torsoDir[1] * 4];
      const b: Pt = [s.shoulder[0] + back[0] * 5 + torsoDir[0] * 6, s.shoulder[1] + back[1] * 5 + torsoDir[1] * 6];
      const a2: Pt = [a[0] + back[0] * 5, a[1] + back[1] * 5], b2: Pt = [b[0] + back[0] * 5, b[1] + back[1] * 5];
      sc.poly([v3(a, -13), v3(b, -13), v3(b, 13), v3(a, 13)], PAD, { stroke: PAD_EDGE });
      sc.poly([v3(a2, -13), v3(b2, -13), v3(b2, 13), v3(a2, 13)], PAD, { stroke: PAD_EDGE });
      break;
    }
    case 'seat': {
      const y = s.hip[1] + 6 + (pr.dy ?? 0);
      sc.box(s.hip[0] - 14, y, 26, 4, 13);
      sc.capsule([s.hip[0] - 2, y + 4, 0], [s.hip[0] - 2, FLOOR_Y, 0], 3.5, IRON);
      break;
    }
    case 'platform': {
      const d: Pt = [s.foot[0] - s.hip[0], s.foot[1] - s.hip[1]];
      const L = Math.hypot(d[0], d[1]) || 1;
      const n: Pt = [-d[1] / L, d[0] / L];
      const c: Pt = [s.foot[0] + (d[0] / L) * 2.5, s.foot[1] + (d[1] / L) * 2.5];
      const p1: Pt = [c[0] + n[0] * 16, c[1] + n[1] * 16], p2: Pt = [c[0] - n[0] * 16, c[1] - n[1] * 16];
      sc.poly([v3(p1, -16), v3(p2, -16), v3(p2, 16), v3(p1, 16)], PAD, { stroke: PAD_EDGE });
      break;
    }
    default: break;
  }
}

function dumbbell(sc: Scene, at: V3) {
  sc.capsule([at[0], at[1], at[2] - 5], [at[0], at[1], at[2] + 5], 2.4, METAL);
  for (const dz of [-5.5, 5.5]) sc.capsule([at[0], at[1], at[2] + dz - 1.2], [at[0], at[1], at[2] + dz + 1.2], 8.5, IRON);
}
function barbell(sc: Scene, c: Pt) {
  sc.capsule(v3(c, -32), v3(c, 32), 2.2, METAL);
  for (const z of [-27, 27]) sc.capsule(v3(c, z - 2), v3(c, z + 2), 12, IRON);
}
function kettlebell(sc: Scene, at: V3) {
  sc.sphere([at[0], at[1] + 6, at[2]], 5.5, IRON, 0.2);
  sc.capsule([at[0] - 2.5, at[1] + 1, at[2]], [at[0] + 2.5, at[1] + 1, at[2]], 1.8, IRON);
}

function implSide(sc: Scene, pr: Extract<Prop, { k: 'impl' }>, s: Sk, back: Pt, together: boolean, handZ: number) {
  if (pr.at === 'shoulder') { barbell(sc, [s.shoulder[0] + back[0] * 4, s.shoulder[1] + back[1] * 4]); return; }
  if (pr.at === 'hip') { barbell(sc, [s.hip[0] + 2, s.hip[1] - 6]); return; }
  if (pr.at === 'feet') { sc.capsule(v3(s.foot, -13), v3(s.foot, 13), 7, PAD); return; }
  const near = v3(s.hand, handZ), far = v3(s.hand2, -handZ);
  switch (pr.type) {
    case 'db': dumbbell(sc, near); dumbbell(sc, far); break;
    case 'barbell': barbell(sc, mid(s.hand, s.hand2)); break;
    case 'kb': kettlebell(sc, near); kettlebell(sc, far); break;
    case 'plate': kettlebell(sc, together ? v3(mid(s.hand, s.hand2), 0) : near); break;
    case 'handle':
      if (together) sc.capsule(v3(mid(s.hand, s.hand2), -SH_Z - 3), v3(mid(s.hand, s.hand2), SH_Z + 3), 2.6, IRON);
      else { sc.sphere(near, 2.6, IRON); sc.sphere(far, 2.6, IRON); }
      break;
  }
}

// ------------------------------------------------------------------ front patterns (lateral raises)
function frontScene(pt: FrontPattern, p: number, sc: Scene) {
  const a = ((pt.armA + (pt.armB - pt.armA) * p) * Math.PI) / 180;
  const x = 76;
  const hip = [x, 72] as Pt, sh = [x, 40] as Pt;
  floor(sc, [x, FLOOR_Y], 22);
  const arm = (side: 1 | -1) => {
    const shp: V3 = [x, sh[1], side * SH_Z];
    const el: V3 = [x + 2, sh[1] + Math.cos(a) * 20, side * (SH_Z + Math.sin(a) * 20)];
    const a2 = a + 0.14;
    const ha: V3 = [x + 4, el[1] + Math.cos(a2) * 19, el[2] + side * Math.sin(a2) * 19];
    return { shp, el, ha };
  };
  const n = arm(1), f = arm(-1);
  if (pt.cable) for (const [side, h] of [[1, f.ha], [-1, n.ha]] as [number, V3][]) {
    const anchor: V3 = [x, FLOOR_Y - 4, side * 42];
    sc.sphere(anchor, 3, IRON);
    sc.line(anchor, h, 0.8, '#b6bdc8', true);
  }
  addFigure(sc, {
    head: [x, 26, 0], neck: [x, 34, 0],
    shN: n.shp, elN: n.el, haN: n.ha, shF: f.shp, elF: f.el, haF: f.ha,
    hipN: [x, hip[1], HIP_Z], knN: [x + 1, 91, HIP_Z + 2], ftN: [x, FLOOR_Y, HIP_Z + 4],
    hipF: [x, hip[1], -HIP_Z], knF: [x + 1, 91, -HIP_Z - 2], ftF: [x, FLOOR_Y, -HIP_Z - 4],
    forward: [1, 0],
  });
  for (const h of [n.ha, f.ha]) {
    if (pt.impl === 'handle') sc.sphere(h, 2.6, IRON);
    else dumbbell(sc, h);
  }
}

// ------------------------------------------------------------------ public API
/** Best starting camera for a pattern: 3/4 view for side movements, near-front for lateral raises. */
export function defaultYaw(pt: Pattern) {
  return pt.view === 'front' ? 62 : -32;
}

export function render3d(pt: Pattern, p: number, cam: Camera): Shape[] {
  const sc = new Scene(makeProjector(cam));
  if (pt.view === 'front') frontScene(pt, p, sc);
  else sideScene(pt, p, sc);
  return sc.sorted();
}

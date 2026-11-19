// 3D exercise demos. The 2D keyframe skeleton (poses.ts) is lifted into 3D — the
// body faces +x, up is −y, and left/right limbs sit at ±z — then rendered as a shaded
// mannequin with perspective, painter's-algorithm depth sorting, a floor + shadow and
// 3D equipment. Output is plain shapes in a 160×120 viewBox, so it renders anywhere
// (react-native-svg in the app, an SVG string in tests/previews).

import type { Muscle } from '../../types';
import {
  FLOOR_Y, HEAD_R, skeleton, type FrontPattern, type Pattern, type Prop, type Pt, type SidePattern,
} from './poses';

export type V3 = [number, number, number];

export type Shape =
  | { k: 'capsule'; a: Pt; b: Pt; w: number; color: string; hi: string; depth: number; opacity?: number; edge?: boolean }
  | { k: 'sphere'; at: Pt; r: number; color: string; hi: string; depth: number; opacity?: number; edge?: boolean }
  | { k: 'poly'; pts: Pt[]; fill: string; stroke?: string; opacity?: number; depth: number }
  | { k: 'line'; a: Pt; b: Pt; w: number; color: string; dash?: boolean; depth: number };

export interface Camera {
  /** Degrees around the vertical axis. 0 = straight side view. */
  yaw: number;
  /** Degrees looking down. */
  pitch: number;
}

const SH_Z = 12.5; // half shoulder width (broad: V-taper)
const HIP_Z = 6.5; // half hip width
const CX = 80, CY = 64, FOCAL = 280;

// mannequin palette: a lean, shirtless athlete so the muscles read clearly
const SHORTS = '#2b303c', SKIN = '#c98f68', SKIN_DEF = '#a87150', SHOE = '#1b1e25', HAIR = '#231b16', TRIM = '#3d7fc4';
const OUTLINE = '#07080a';
/** Highlight colours for the muscles an exercise works. */
export const WORK_PRIMARY = '#ff4b3a';
export const WORK_SECONDARY = '#ffa63d';
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

  /** `detail` = surface detail (muscle definition): no outline, blends into the body. */
  capsule(a: V3, b: V3, w: number, color: string, opts: { bias?: number; opacity?: number; flat?: boolean; detail?: boolean } = {}) {
    const pa = this.proj(a), pb = this.proj(b);
    const d = (pa.d + pb.d) / 2;
    const s = (pa.s + pb.s) / 2;
    this.shapes.push({
      k: 'capsule', a: pa.p, b: pb.p, w: w * s, color: opts.flat ? color : this.lit(color, d), hi: shade(color, 1.35),
      depth: d + (opts.bias ?? 0), opacity: opts.opacity, edge: opts.detail || opts.opacity != null ? false : undefined,
    });
  }
  sphere(c: V3, r: number, color: string, bias = 0, opacity?: number, detail = false) {
    const pc = this.proj(c);
    this.shapes.push({
      k: 'sphere', at: pc.p, r: r * pc.s, color: opacity != null ? color : this.lit(color, pc.d), hi: shade(color, 1.5),
      depth: pc.d + bias, opacity, edge: detail || opacity != null ? false : undefined,
    });
  }
  /** Filled silhouette (convex hull) of a cloud of 3D points, e.g. a torso built from cross-sections. */
  hull(pts: V3[], fill: string, depth: number, stroke?: string) {
    const pp = pts.map((v) => this.proj(v).p);
    this.shapes.push({ k: 'poly', pts: convexHull(pp), fill: this.lit(fill, depth), stroke, depth });
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
  depthOf(v: V3) {
    return this.proj(v).d;
  }
  sorted() {
    return this.shapes.sort((a, b) => a.depth - b.depth);
  }
}

const v3 = (p: Pt, z: number): V3 => [p[0], p[1], z];

/** Monotone-chain convex hull of 2D points. */
function convexHull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [], upper: Pt[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
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

// ------------------------------------------------------------------ 3D vector helpers
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** Point offset from `o` by a·u + b·v + c·w. */
const at = (o: V3, u: V3, a: number, v: V3 = [0, 0, 0], b = 0, w: V3 = [0, 0, 0], c = 0): V3 =>
  add(add(add(o, mul(u, a)), mul(v, b)), mul(w, c));
/** The part of `pref` perpendicular to `dir` (falls back to `alt` when they're nearly parallel). */
function facing(dir: V3, pref: V3, alt: V3): V3 {
  const d = unit(dir);
  const p = sub(pref, mul(d, dot(pref, d)));
  if (len(p) > 0.35) return unit(p);
  return unit(sub(alt, mul(d, dot(alt, d))));
}

function mixHex(a: string, b: string, t: number) {
  const x = hexToRgb(a), y = hexToRgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Which muscles to light up on the mannequin. */
export interface Focus { primary: Muscle[]; secondary: Muscle[]; cardio?: boolean }

/** Colour for a muscle region: its base colour, or the working highlight (pulsing with the rep). */
function tone(focus: Focus | undefined, pulse: number) {
  const k = 0.86 + 0.14 * pulse;
  return (muscles: Muscle[], base: string) => {
    if (!focus) return { color: base, level: 0 };
    if (muscles.some((m) => focus.primary.includes(m))) return { color: mixHex(base, WORK_PRIMARY, k), level: 2 };
    if (muscles.some((m) => focus.secondary.includes(m))) return { color: mixHex(base, WORK_SECONDARY, 0.55 + 0.25 * pulse), level: 1 };
    return { color: base, level: 0 };
  };
}

interface Joints {
  head: V3; neck: V3;
  shN: V3; elN: V3; haN: V3; shF: V3; elF: V3; haF: V3;
  hipN: V3; knN: V3; ftN: V3; hipF: V3; knF: V3; ftF: V3;
  forward: Pt; // direction the feet point (x, z-less)
  /** Unit vector out of the chest. */
  front: V3;
}

/**
 * A lean, athletic mannequin built from shaded capsules and spheres: V-taper torso
 * (lats flaring from a narrow waist), pecs, six-pack, traps, round delts, biceps and
 * triceps, quads, hamstrings, glutes and calves. Muscles in `focus` glow red (main) or
 * amber (assisting), pulsing with the rep, with a soft halo on the main ones.
 */
function addFigure(sc: Scene, j: Joints, focus?: Focus, pulse = 0) {
  const T = tone(focus, pulse);
  const glow = (draw: (color: string, opts: { bias: number; opacity: number }) => void, level: number) => {
    if (level === 2) draw(WORK_PRIMARY, { bias: -0.6, opacity: 0.26 + 0.2 * pulse });
  };

  const shMid = lerp3(j.shN, j.shF, 0.5), hipMid = lerp3(j.hipN, j.hipF, 0.5);
  const up = unit(sub(shMid, hipMid));
  const side = unit(sub(j.shN, j.shF));
  const f = facing(j.front, j.front, up);
  const torsoLen = len(sub(shMid, hipMid));
  const tAt = (t: number) => lerp3(hipMid, shMid, t / torsoLen); // point `t` units up the torso

  // --- torso: one smooth silhouette lofted through cross-sections, narrow waist
  // widening to broad shoulders (the V-taper), then muscle detail on its surface.
  const sections: [number, number, number][] = [
    [0.5, 6.6, 4.6], [5, 6.1, 4.3], [torsoLen * 0.5, 7.8, 5], [torsoLen - 5, 10.6, 5.6], [torsoLen - 1, 10.8, 4.6],
  ];
  const ring: V3[] = [];
  for (const [h, w, dpt] of sections) {
    const c = tAt(h);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      ring.push(at(c, side, Math.cos(ang) * w, f, Math.sin(ang) * dpt));
    }
  }
  const torsoDepth = (sc.depthOf(hipMid) + sc.depthOf(shMid)) / 2;
  sc.hull(ring, SKIN, torsoDepth, OUTLINE);

  const DEF = mixHex(SKIN, SKIN_DEF, 0.95); // shadow tone for muscle separations
  const LIGHT = mixHex(SKIN, '#f2c7a2', 0.45); // catch-light on the fullest part of a muscle

  // back: lats flaring into the V, erectors either side of the spine
  const back = T(['back'], mixHex(SKIN, SKIN_DEF, 0.25));
  for (const sd of [1, -1]) {
    const top = at(shMid, up, -4, side, sd * 7.6, f, -3.4);
    const bottom = at(tAt(8), side, sd * 3.6, f, -3.2);
    glow((c, o) => sc.capsule(top, bottom, 10, c, { ...o, flat: true }), back.level);
    sc.capsule(top, bottom, 6.4, back.color, { detail: true, bias: 0.05 });
    sc.capsule(at(tAt(2.5), side, sd * 1.6, f, -3.9), at(tAt(14), side, sd * 1.6, f, -4.3), 2.6, back.level ? back.color : DEF, { detail: true, bias: 0.06 });
  }

  // traps sloping from the neck to the shoulders
  const traps = T(['neck', 'back'], SKIN);
  for (const shp of [j.shN, j.shF]) {
    glow((c, o) => sc.capsule(at(j.neck, up, -1.5, f, -1), at(shp, up, 1, f, -1), 6.5, c, { ...o, flat: true }), traps.level);
    sc.capsule(at(j.neck, up, -1.5, f, -1), at(shp, up, 0.8, f, -1), 4.4, traps.color);
  }

  // chest: two pec plates with a shadow line underneath
  const chest = T(['chest'], SKIN);
  for (const sd of [1, -1]) {
    const c = at(shMid, up, -5.6, side, sd * 4.4, f, 3.3);
    glow((col, o) => sc.sphere(c, 8, col, o.bias, o.opacity), chest.level);
    sc.capsule(at(c, up, -2.6, side, sd * -2.6, f, 0.5), at(c, up, -3, side, sd * 2.8, f, 0.2), 1.3, DEF, { detail: true, bias: 0.08 });
    sc.capsule(at(c, side, sd * -2), at(c, side, sd * 2.2, up, 0.6), chest.level ? 7.4 : 6.4, chest.level ? chest.color : LIGHT, { detail: true, bias: 0.1 });
  }

  // abs: rectus with a six-pack, obliques at the sides
  const core = T(['core'], SKIN);
  const absLo = at(tAt(2.5), f, 3.4), absHi = at(shMid, up, -10, f, 3.9);
  glow((c, o) => sc.capsule(absLo, absHi, 10.5, c, { ...o, flat: true }), core.level);
  sc.capsule(absLo, absHi, 6.8, core.color, { detail: true, bias: 0.08 });
  for (const sd of [1, -1]) {
    sc.capsule(at(tAt(3), side, sd * 5.1, f, 1.6), at(tAt(13), side, sd * 6.6, f, 2.2), 3, core.level ? core.color : DEF, { detail: true, bias: 0.07 });
  }
  const bump = core.level ? mixHex(core.color, '#ffffff', 0.14) : LIGHT;
  for (let r = 0; r < 3; r++) {
    const c = lerp3(absLo, absHi, 0.16 + r * 0.31);
    for (const sd of [1, -1]) sc.sphere(at(c, side, sd * 1.8, f, 1.3), 1.6, bump, 0.12, undefined, true);
    // tendinous line under each row
    const lo = lerp3(absLo, absHi, 0.01 + r * 0.31);
    sc.capsule(at(lo, side, -3, f, 1.3), at(lo, side, 3, f, 1.3), 0.5, core.level ? shade(core.color, 0.75) : DEF, { detail: true, bias: 0.11 });
  }
  sc.capsule(at(absLo, f, 1.6), at(absHi, f, 1.6), 0.45, core.level ? shade(core.color, 0.8) : SKIN_DEF, { detail: true, bias: 0.15 });

  // --- shorts with a coloured waistband
  sc.capsule(j.hipN, j.hipF, 11.5, SHORTS);
  sc.capsule(at(hipMid, up, 2.6, side, 6.3), at(hipMid, up, 2.6, side, -6.3), 2.2, TRIM, { bias: 0.3, detail: true });

  // --- glutes (under the shorts, but they light up when worked)
  const glutes = T(['glutes'], SHORTS);
  for (const [hp, sd] of [[j.hipN, 1], [j.hipF, -1]] as [V3, number][]) {
    const c = at(hp, f, -3.6, up, 0.6, side, sd * 0.4);
    glow((col, o) => sc.sphere(c, 7.4, col, o.bias, o.opacity), glutes.level);
    sc.sphere(c, 5.6, glutes.color, -0.1);
  }

  // --- neck and head (with hair)
  const neck = T(['neck'], SKIN);
  sc.capsule(at(shMid, up, -1), j.neck, 5.6, neck.color);
  const headUp = unit(sub(j.head, j.neck));
  sc.sphere(at(j.head, headUp, 1.4, f, -1.6), HEAD_R * 0.96, HAIR, -0.15, undefined, true);
  sc.sphere(j.head, HEAD_R, SKIN, 0.5);
  // nose and ears so you can tell which way he faces
  sc.sphere(at(j.head, f, HEAD_R * 0.92, headUp, -0.6), 1.2, SKIN_DEF, 0.55, undefined, true);
  for (const sd of [1, -1]) sc.sphere(at(j.head, side, sd * HEAD_R * 0.93, f, -0.6), 1.5, SKIN_DEF, 0.52, undefined, true);

  // --- arms: delts, biceps (front), triceps (back), forearms
  const delts = T(['shoulders'], SKIN);
  const bi = T(['biceps'], SKIN), tri = T(['triceps'], SKIN);
  for (const [sh, el, ha] of [[j.shN, j.elN, j.haN], [j.shF, j.elF, j.haF]] as V3[][]) {
    const dir = sub(el, sh);
    const armFront = facing(dir, f, mul(up, -1));
    // Whole upper arm lights up for biceps or triceps (reads clearly from any angle).
    const arm = bi.level >= tri.level ? bi : tri;
    glow((c, o) => sc.capsule(sh, el, 9.5, c, { ...o, flat: true }), arm.level);
    sc.capsule(sh, el, 6.2, arm.level ? arm.color : SKIN);
    const m = lerp3(sh, el, 0.5);
    const bc = at(m, armFront, 1.2), tc = at(m, armFront, -1.3);
    glow((c, o) => sc.sphere(bc, 4.9, c, o.bias, o.opacity), bi.level);
    glow((c, o) => sc.sphere(tc, 4.8, c, o.bias, o.opacity), tri.level);
    sc.sphere(bc, 3.1, bi.color, 0.05, undefined, true);
    sc.sphere(tc, 3, tri.color, 0.05, undefined, true);
    const dc = lerp3(sh, el, 0.12);
    glow((c, o) => sc.sphere(dc, 6.4, c, o.bias, o.opacity), delts.level);
    sc.sphere(dc, 4.7, delts.color, 0.1);
    sc.capsule(el, ha, 4.6, SKIN);
    sc.capsule(lerp3(el, ha, 0.1), lerp3(el, ha, 0.45), 5.2, SKIN, { detail: true }); // forearm belly
    sc.sphere(ha, 2.6, SKIN);
  }

  // --- legs: shorts over the top of the thigh, quads (front), hamstrings (back), calves
  const quads = T(['quads'], SKIN), hams = T(['hamstrings'], SKIN), calves = T(['calves'], SKIN);
  for (const [hp, kn, ft] of [[j.hipN, j.knN, j.ftN], [j.hipF, j.knF, j.ftF]] as V3[][]) {
    const dir = sub(kn, hp);
    const legFront = facing(dir, f, up);
    const shortsEnd = lerp3(hp, kn, 0.38);
    sc.capsule(hp, shortsEnd, 10, SHORTS);
    const thigh = quads.level >= hams.level ? quads : hams;
    glow((c, o) => sc.capsule(shortsEnd, kn, 10.5, c, { ...o, flat: true }), thigh.level);
    sc.capsule(shortsEnd, kn, 7.4, thigh.level ? thigh.color : SKIN);
    const qc = at(lerp3(hp, kn, 0.58), legFront, 1.3), hc = at(lerp3(hp, kn, 0.55), legFront, -1.4);
    glow((c, o) => sc.sphere(qc, 6.6, c, o.bias, o.opacity), quads.level);
    glow((c, o) => sc.sphere(hc, 6, c, o.bias, o.opacity), hams.level);
    sc.sphere(qc, 4.2, quads.color, 0.05, undefined, true);
    sc.sphere(hc, 3.8, hams.color, 0.05, undefined, true);
    const shinDir = sub(ft, kn);
    const calfBack = facing(shinDir, mul(f, -1), mul(up, -1));
    glow((c, o) => sc.capsule(kn, ft, 8, c, { ...o, flat: true }), calves.level);
    sc.capsule(kn, ft, 5.2, calves.level ? calves.color : SKIN);
    const cc = at(lerp3(kn, ft, 0.3), calfBack, 1.2);
    glow((c, o) => sc.sphere(cc, 5.2, c, o.bias, o.opacity), calves.level);
    sc.sphere(cc, 3.3, calves.color, 0.05, undefined, true);
    sc.capsule(ft, [ft[0] + j.forward[0] * 7, ft[1] + j.forward[1] * 7, ft[2]], 5, SHOE);
  }

  // --- cardio: heart and lungs working
  if (focus?.cardio) sc.sphere(at(shMid, up, -6, f, 2, side, 1.5), 7 + 2 * pulse, WORK_PRIMARY, 0.6, 0.12 + 0.18 * pulse);
}

// ------------------------------------------------------------------ side patterns
function sideScene(pt: SidePattern, p: number, sc: Scene, focus?: Focus) {
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
    front: [-back[0], -back[1], 0],
  }, focus, Math.sin(Math.PI * p));

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
function frontScene(pt: FrontPattern, p: number, sc: Scene, focus?: Focus) {
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
    front: [1, 0, 0],
  }, focus, Math.sin(Math.PI * p));
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

/** Look down more on lying/flat movements (bench press, planks) so the working muscles face the camera. */
export function defaultPitch(pt: Pattern) {
  if (pt.view === 'front') return 12;
  const t = (skeleton(pt, 0.5, [0, 0]).t * Math.PI) / 180;
  return Math.abs(Math.sin(t)) > 0.75 ? 30 : 12;
}

export function render3d(pt: Pattern, p: number, cam: Camera, focus?: Focus): Shape[] {
  const sc = new Scene(makeProjector(cam));
  if (pt.view === 'front') frontScene(pt, p, sc, focus);
  else sideScene(pt, p, sc, focus);
  return sc.sorted();
}

/** Points a shape covers on screen (floor and its shadow excluded by the caller). */
function extent(s: Shape): [number, number, number, number] {
  switch (s.k) {
    case 'capsule': {
      const r = s.w / 2;
      return [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r];
    }
    case 'sphere':
      return [s.at[0] - s.r, s.at[1] - s.r, s.at[0] + s.r, s.at[1] + s.r];
    case 'line':
      return [Math.min(s.a[0], s.b[0]), Math.min(s.a[1], s.b[1]), Math.max(s.a[0], s.b[0]), Math.max(s.a[1], s.b[1])];
    case 'poly': {
      const xs = s.pts.map((q) => q[0]), ys = s.pts.map((q) => q[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
  }
}

export interface ViewBox { x: number; y: number; w: number; h: number }

/**
 * A viewBox that keeps the whole movement in frame: samples the rep from start to
 * finish across the camera's swing (`yaw ± swing`), takes the bounds of the body and
 * equipment (not the floor), pads them, and widens to the given aspect ratio so the
 * demo fills its card without anything being cut off.
 */
export function fitView(pt: Pattern, yaw: number, pitch: number, swing = 30, aspect = 160 / 112): ViewBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const dy of [-swing, 0, swing]) {
    for (let i = 0; i <= 8; i++) {
      for (const s of render3d(pt, i / 8, { yaw: yaw + dy, pitch })) {
        if (s.depth < -990) continue; // floor grid + contact shadow
        const [a, b, c, d] = extent(s);
        x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
      }
    }
  }
  const pad = 6;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad + 6; // a little extra below so the floor shows
  let w = x1 - x0, h = y1 - y0;
  // Never zoom in so far that a small figure looks blown up.
  if (h < 72) { y0 -= (72 - h) * 0.6; h = 72; }
  if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y0 -= (nh - h) * 0.6; h = nh; }
  return { x: +x0.toFixed(1), y: +y0.toFixed(1), w: +w.toFixed(1), h: +h.toFixed(1) };
}

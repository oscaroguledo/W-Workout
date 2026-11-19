// Exercise demo animations: a side-view stick figure driven by two keyframes
// (start / end of the rep). Each keyframe gives the hip position, torso angle and
// where the hands and feet should be; elbows and knees are solved with 2-link IK
// so hands stay on handles and feet stay planted while the body moves.
//
// Pure TypeScript (no React) so it can be unit-tested and rendered anywhere.
// Coordinates: viewBox 0 0 160 120, y grows downward, figure faces RIGHT, floor y=110.

import type { Exercise } from '../../types';

export type Pt = [number, number];

// Segment lengths
const TORSO = 34, UPPER_ARM = 20, FOREARM = 19, THIGH = 26, SHIN = 25, NECK = 13;
export const HEAD_R = 7;
export const FLOOR_Y = 110;

const rad = (d: number) => (d * Math.PI) / 180;
/** Unit vector for an absolute angle: 0 = straight down, 90 = forward (right), 180 = up. */
export const dir = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))];
/** Inverse of dir(). */
export const angleOf = (v: Pt) => (Math.atan2(v[0], v[1]) * 180) / Math.PI;
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const len = (a: Pt) => Math.hypot(a[0], a[1]);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerpPt = (a: Pt, b: Pt, p: number): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

/** Where a hand/foot goes: absolute, or relative to the shoulder / hip. */
export type Target = { abs: Pt } | { sh: Pt } | { hip: Pt };

export interface Key {
  hip: Pt;
  /** Torso angle (hip → shoulder). 180 = upright. */
  t: number;
  hand: Target;
  foot: Target;
  hand2?: Target;
  foot2?: Target;
}

export type Prop =
  | { k: 'box'; x: number; y: number; w: number; h: number }
  | { k: 'bar'; a: Pt; b: Pt }
  | { k: 'cable'; from: Pt; both?: boolean }
  | { k: 'backPad' }
  | { k: 'seat'; dy?: number }
  | { k: 'platform' }
  | { k: 'impl'; type: 'db' | 'plate' | 'handle' | 'barbell' | 'kb'; at: 'hands' | 'shoulder' | 'hip' | 'feet' }
  /** Horizontal bar running across the body (pull-up bar, Smith bar). */
  | { k: 'crossbar'; at: Pt }
  | { k: 'step'; x: number; w: number };

export interface SidePattern {
  view: 'side';
  a: Key;
  b: Key;
  /** IK bend direction (+1 / -1) for near/far elbows and knees. */
  elbow: 1 | -1;
  knee: 1 | -1;
  elbow2?: 1 | -1;
  knee2?: 1 | -1;
  props?: Prop[];
  /** Seconds for one full rep (there and back). */
  period?: number;
}
export interface FrontPattern {
  view: 'front';
  /** Arm angle from hanging (0) to out sideways (90). */
  armA: number;
  armB: number;
  impl?: 'db' | 'handle';
  cable?: boolean;
  period?: number;
}
export type Pattern = SidePattern | FrontPattern;

export type Prim =
  | { k: 'line'; a: Pt; b: Pt; w: number; c: 'body' | 'far' | 'equip' | 'cable' | 'floor' }
  | { k: 'circle'; at: Pt; r: number; c: 'head' | 'equip' | 'equipFar' | 'joint' }
  | { k: 'rect'; x: number; y: number; w: number; h: number; c: 'equip' };

// ------------------------------------------------------------------ IK
function ik(root: Pt, target: Pt, l1: number, l2: number, bend: number): { joint: Pt; end: Pt } {
  let v = sub(target, root);
  let d = len(v);
  const maxR = l1 + l2 - 0.01;
  if (d > maxR) { v = mul(v, maxR / d); d = maxR; }
  const minR = Math.abs(l1 - l2) + 0.5;
  if (d < minR) { v = d === 0 ? [0, minR] : mul(v, minR / d); d = minR; }
  const base = Math.atan2(v[1], v[0]);
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const ang = base + bend * Math.acos(cosA);
  const joint: Pt = [root[0] + l1 * Math.cos(ang), root[1] + l1 * Math.sin(ang)];
  const end = add(root, v);
  return { joint, end };
}

const resolve = (tg: Target, shoulder: Pt, hip: Pt): Pt =>
  'abs' in tg ? tg.abs : 'sh' in tg ? add(shoulder, tg.sh) : add(hip, tg.hip);

const lerpTarget = (a: Target, b: Target, p: number, shoulder: Pt, hip: Pt): Pt => {
  // Interpolate in the target's own frame when both keys use the same frame (keeps
  // e.g. a hanging dumbbell glued to the shoulder), otherwise in absolute space.
  if ('abs' in a && 'abs' in b) return lerpPt(a.abs, b.abs, p);
  if ('sh' in a && 'sh' in b) return add(shoulder, lerpPt(a.sh, b.sh, p));
  if ('hip' in a && 'hip' in b) return add(hip, lerpPt(a.hip, b.hip, p));
  return lerpPt(resolve(a, shoulder, hip), resolve(b, shoulder, hip), p);
};

const FAR_OFFSET: Pt = [-3, -1];

// ------------------------------------------------------------------ frames
export interface SkeletonFrame {
  hip: Pt; shoulder: Pt; head: Pt;
  elbow: Pt; hand: Pt; knee: Pt; foot: Pt;
  elbow2: Pt; hand2: Pt; knee2: Pt; foot2: Pt;
  t: number;
}

/** `farOffset` nudges far-side limbs in 2D for a depth hint; the 3D renderer passes [0, 0]. */
export function skeleton(pt: SidePattern, p: number, farOffset: Pt = FAR_OFFSET): SkeletonFrame {
  const { a, b } = pt;
  const hip = lerpPt(a.hip, b.hip, p);
  const t = lerp(a.t, b.t, p);
  const shoulder = add(hip, mul(dir(t), TORSO));
  const head = add(shoulder, mul(dir(t), NECK));

  const handT = lerpTarget(a.hand, b.hand, p, shoulder, hip);
  const footT = lerpTarget(a.foot, b.foot, p, shoulder, hip);
  const hand2T = a.hand2 && b.hand2 ? lerpTarget(a.hand2, b.hand2, p, shoulder, hip) : add(handT, farOffset);
  const foot2T = a.foot2 && b.foot2 ? lerpTarget(a.foot2, b.foot2, p, shoulder, hip) : add(footT, farOffset);

  const arm = ik(shoulder, handT, UPPER_ARM, FOREARM, pt.elbow);
  const leg = ik(hip, footT, THIGH, SHIN, pt.knee);
  const sh2 = add(shoulder, farOffset), hip2 = add(hip, farOffset);
  const arm2 = ik(sh2, hand2T, UPPER_ARM, FOREARM, pt.elbow2 ?? pt.elbow);
  const leg2 = ik(hip2, foot2T, THIGH, SHIN, pt.knee2 ?? pt.knee);

  return {
    hip, shoulder, head, t,
    elbow: arm.joint, hand: arm.end, knee: leg.joint, foot: leg.end,
    elbow2: arm2.joint, hand2: arm2.end, knee2: leg2.joint, foot2: leg2.end,
  };
}

/** Ease in-out ping-pong: 0 → 1 → 0 over one period, with a short pause at each end. */
export function phase(seconds: number, period: number) {
  const x = ((seconds % period) + period) % period / period;
  const half = x < 0.5 ? x * 2 : (1 - x) * 2;
  const held = Math.min(1, Math.max(0, (half - 0.08) / 0.84));
  return held * held * (3 - 2 * held);
}

export function periodOf(pt: Pattern) {
  return pt.period ?? 2.8;
}

export function frame(pt: Pattern, p: number): Prim[] {
  return pt.view === 'front' ? frontFrame(pt, p) : sideFrame(pt, p);
}

function sideFrame(pt: SidePattern, p: number): Prim[] {
  const s = skeleton(pt, p);
  const out: Prim[] = [{ k: 'line', a: [4, FLOOR_Y], b: [156, FLOOR_Y], w: 1.5, c: 'floor' }];
  const props = pt.props ?? [];
  const torsoDir = dir(s.t);
  const back = dir(s.t + 90); // the side of the torso facing away from the chest

  // fixed & body-attached equipment, drawn behind the figure
  for (const pr of props) {
    if (pr.k === 'box') out.push({ k: 'rect', x: pr.x, y: pr.y, w: pr.w, h: pr.h, c: 'equip' });
    if (pr.k === 'bar') out.push({ k: 'line', a: pr.a, b: pr.b, w: 3, c: 'equip' });
    if (pr.k === 'crossbar') out.push({ k: 'line', a: [pr.at[0] - 30, pr.at[1]], b: [pr.at[0] + 30, pr.at[1]], w: 3, c: 'equip' });
    if (pr.k === 'step') out.push({ k: 'rect', x: pr.x, y: FLOOR_Y - 8, w: pr.w, h: 8, c: 'equip' });
    if (pr.k === 'backPad') {
      const from = add(add(s.hip, mul(back, 5)), mul(torsoDir, -4));
      const to = add(add(s.shoulder, mul(back, 5)), mul(torsoDir, 6));
      out.push({ k: 'line', a: from, b: to, w: 5, c: 'equip' });
    }
    if (pr.k === 'seat') {
      const y = s.hip[1] + 6 + (pr.dy ?? 0);
      out.push({ k: 'line', a: [s.hip[0] - 14, y], b: [s.hip[0] + 12, y], w: 5, c: 'equip' });
      out.push({ k: 'line', a: [s.hip[0] - 2, y], b: [s.hip[0] - 2, FLOOR_Y], w: 3, c: 'equip' });
    }
    if (pr.k === 'platform') {
      const legDir = sub(s.foot, s.hip);
      const n: Pt = mul([-legDir[1], legDir[0]], 1 / (len(legDir) || 1));
      out.push({ k: 'line', a: add(add(s.foot, mul(n, 14)), mul(legDir, 0.06)), b: add(add(s.foot, mul(n, -14)), mul(legDir, 0.06)), w: 4, c: 'equip' });
    }
    if (pr.k === 'cable') {
      out.push({ k: 'line', a: pr.from, b: s.hand2, w: 1, c: 'cable' });
      out.push({ k: 'line', a: pr.from, b: s.hand, w: 1.2, c: 'cable' });
      out.push({ k: 'circle', at: pr.from, r: 3, c: 'equip' });
    }
  }

  // far limbs
  out.push({ k: 'line', a: add(s.hip, FAR_OFFSET), b: s.knee2, w: 5, c: 'far' });
  out.push({ k: 'line', a: s.knee2, b: s.foot2, w: 5, c: 'far' });
  out.push({ k: 'line', a: s.foot2, b: add(s.foot2, [6, 0.5]), w: 4, c: 'far' });
  out.push({ k: 'line', a: add(s.shoulder, FAR_OFFSET), b: s.elbow2, w: 4.5, c: 'far' });
  out.push({ k: 'line', a: s.elbow2, b: s.hand2, w: 4, c: 'far' });

  // torso + head
  out.push({ k: 'line', a: s.hip, b: s.shoulder, w: 7, c: 'body' });
  out.push({ k: 'circle', at: s.head, r: HEAD_R, c: 'head' });

  // near limbs
  out.push({ k: 'line', a: s.hip, b: s.knee, w: 6, c: 'body' });
  out.push({ k: 'line', a: s.knee, b: s.foot, w: 5.5, c: 'body' });
  out.push({ k: 'line', a: s.foot, b: add(s.foot, [7, 0.5]), w: 4.5, c: 'body' });
  out.push({ k: 'line', a: s.shoulder, b: s.elbow, w: 5, c: 'body' });
  out.push({ k: 'line', a: s.elbow, b: s.hand, w: 4.5, c: 'body' });

  // implements in hand / on body, drawn on top
  for (const pr of props) {
    if (pr.k !== 'impl') continue;
    const at = pr.at === 'hands' ? s.hand : pr.at === 'shoulder' ? add(s.shoulder, mul(back, 4)) : pr.at === 'hip' ? add(s.hip, [2, -6]) : s.foot;
    if (pr.type === 'db' || pr.type === 'kb') {
      if (pr.at === 'hands') out.push({ k: 'circle', at: s.hand2, r: 4.5, c: 'equipFar' });
      out.push({ k: 'circle', at, r: 5, c: 'equip' });
    } else if (pr.type === 'plate' || pr.type === 'barbell') {
      out.push({ k: 'circle', at, r: pr.type === 'barbell' ? 9 : 7, c: 'equip' });
    } else {
      out.push({ k: 'circle', at, r: 3, c: 'equip' });
    }
  }
  return out;
}

function frontFrame(pt: FrontPattern, p: number): Prim[] {
  const out: Prim[] = [{ k: 'line', a: [4, FLOOR_Y], b: [156, FLOOR_Y], w: 1.5, c: 'floor' }];
  const cx = 80;
  const shL: Pt = [cx - 13, 40], shR: Pt = [cx + 13, 40];
  const hipL: Pt = [cx - 8, 72], hipR: Pt = [cx + 8, 72];
  out.push({ k: 'line', a: [cx, 74], b: [cx, 40], w: 7, c: 'body' });
  out.push({ k: 'line', a: shL, b: shR, w: 6, c: 'body' });
  out.push({ k: 'line', a: hipL, b: hipR, w: 6, c: 'body' });
  out.push({ k: 'circle', at: [cx, 25], r: HEAD_R, c: 'head' });
  out.push({ k: 'line', a: hipL, b: [cx - 12, 91], w: 6, c: 'body' });
  out.push({ k: 'line', a: [cx - 12, 91], b: [cx - 14, FLOOR_Y], w: 5.5, c: 'body' });
  out.push({ k: 'line', a: hipR, b: [cx + 12, 91], w: 6, c: 'body' });
  out.push({ k: 'line', a: [cx + 12, 91], b: [cx + 14, FLOOR_Y], w: 5.5, c: 'body' });
  const ang = lerp(pt.armA, pt.armB, p);
  for (const side of [-1, 1] as const) {
    const sh = side < 0 ? shL : shR;
    const upper: Pt = [Math.sin(rad(ang)) * side, Math.cos(rad(ang))];
    const fore: Pt = [Math.sin(rad(ang + 8)) * side, Math.cos(rad(ang + 8))];
    const elbow = add(sh, mul(upper, UPPER_ARM));
    const hand = add(elbow, mul(fore, FOREARM));
    out.push({ k: 'line', a: sh, b: elbow, w: 5, c: 'body' });
    out.push({ k: 'line', a: elbow, b: hand, w: 4.5, c: 'body' });
    if (pt.cable) out.push({ k: 'line', a: [cx - side * 40, FLOOR_Y - 4], b: hand, w: 1.2, c: 'cable' });
    out.push({ k: 'circle', at: hand, r: pt.impl === 'handle' ? 3 : 5, c: 'equip' });
  }
  return out;
}

// ------------------------------------------------------------------ pattern library
/**
 * Straight-body movements (push-ups, planks, inverted rows): the body is a rigid line
 * pivoting on the feet; hA/hB = height of the shoulder above the hand at each end
 * (negative = below, e.g. hanging under a bar). dx = shoulder x relative to the hand at A.
 */
const plank = (footY: number, hand: Pt, hA: number, hB: number, extra: Partial<SidePattern> = {}, dx = -2): SidePattern => {
  const body = TORSO + THIGH + SHIN - 1;
  const legLen = THIGH + SHIN - 0.5;
  const elev = (h: number) => Math.asin(Math.min(1, Math.max(-1, (footY - (hand[1] - h)) / body)));
  const foot: Pt = [hand[0] + dx - body * Math.cos(elev(hA)), footY];
  const key = (h: number): Key => {
    const th = elev(h);
    const u: Pt = [Math.cos(th), -Math.sin(th)];
    return { hip: add(foot, mul(u, legLen)), t: angleOf(u), hand: { abs: hand }, foot: { abs: foot } };
  };
  return { view: 'side', a: key(hA), b: key(hB), elbow: 1, knee: -1, ...extra };
};

const standing = (t = 180): Pick<Key, 'hip' | 't' | 'foot'> => ({ hip: [74, 59], t, foot: { abs: [78, FLOOR_Y] } });

export const PATTERNS = {
  squat: (impl: 'goblet' | 'bar' | 'none'): SidePattern => ({
    view: 'side', elbow: impl === 'bar' ? -1 : 1, knee: -1,
    a: { hip: [74, 60], t: 178, foot: { abs: [82, FLOOR_Y] }, hand: impl === 'bar' ? { sh: [-6, -2] } : { sh: [12, 10] } },
    b: { hip: [56, 84], t: 142, foot: { abs: [82, FLOOR_Y] }, hand: impl === 'bar' ? { sh: [-6, -2] } : { sh: [12, 10] } },
    props: impl === 'goblet' ? [{ k: 'impl', type: 'db', at: 'hands' }] : impl === 'bar' ? [{ k: 'impl', type: 'barbell', at: 'shoulder' }] : [],
  }),
  legPress: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 3,
    a: { hip: [52, 84], t: -128, foot: { abs: [84, 58] }, hand: { abs: [62, 88] } },
    b: { hip: [52, 84], t: -128, foot: { abs: [100, 44] }, hand: { abs: [62, 88] } },
    props: [{ k: 'backPad' }, { k: 'platform' }, { k: 'box', x: 30, y: 92, w: 40, h: 18 }],
  }),
  splitSquat: (rearOnBench: boolean): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: 1,
    a: { hip: [70, 58], t: 180, foot: { abs: [94, FLOOR_Y] }, foot2: { abs: rearOnBench ? [38, 82] : [44, FLOOR_Y] }, hand: { sh: [1, 38] } },
    b: { hip: [66, 80], t: 176, foot: { abs: [94, FLOOR_Y] }, foot2: { abs: rearOnBench ? [38, 82] : [44, FLOOR_Y] }, hand: { sh: [1, 38] } },
    props: [...(rearOnBench ? [{ k: 'box', x: 22, y: 84, w: 28, h: 26 } as Prop] : []), { k: 'impl', type: 'db', at: 'hands' }],
  }),
  lunge: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: 1,
    a: { hip: [74, 59], t: 180, foot: { abs: [80, FLOOR_Y] }, foot2: { abs: [74, FLOOR_Y] }, hand: { sh: [1, 38] } },
    b: { hip: [66, 82], t: 176, foot: { abs: [92, FLOOR_Y] }, foot2: { abs: [38, FLOOR_Y] }, hand: { sh: [1, 38] } },
    props: [{ k: 'impl', type: 'db', at: 'hands' }],
  }),
  hinge: (singleLeg: boolean): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 3.2,
    a: { hip: [68, 59], t: 180, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [2, 38] }, ...(singleLeg ? { foot2: { abs: [70, FLOOR_Y] } } : {}) },
    b: { hip: [50, 63], t: 102, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [0, 38] }, ...(singleLeg ? { foot2: { hip: [-50, 8] } } : {}) },
    props: [{ k: 'impl', type: 'db', at: 'hands' }],
  }),
  legCurl: (extension: boolean): SidePattern => {
    const straight: Target = { abs: [110, 94] }, bent: Target = { abs: [76, 108] };
    return {
      view: 'side', elbow: 1, knee: 1,
      a: { hip: [60, 80], t: 172, foot: extension ? bent : straight, hand: { abs: [70, 82] } },
      b: { hip: [60, 80], t: 172, foot: extension ? straight : bent, hand: { abs: [70, 82] } },
      props: [{ k: 'backPad' }, { k: 'seat' }, { k: 'impl', type: 'plate', at: 'feet' }],
    };
  },
  calfRaise: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 2,
    a: { hip: [74, 58], t: 180, foot: { abs: [78, FLOOR_Y - 9] }, hand: { sh: [2, 36] } },
    b: { hip: [74, 50], t: 180, foot: { abs: [78, FLOOR_Y - 17] }, hand: { sh: [2, 36] } },
    props: [{ k: 'step', x: 74, w: 26 }],
  }),
  hipThrust: (bench: boolean): SidePattern => bench ? {
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [96, 99], t: -118, foot: { abs: [116, FLOOR_Y] }, hand: { hip: [2, -5] } },
    b: { hip: [90, 84], t: -90, foot: { abs: [116, FLOOR_Y] }, hand: { hip: [2, -5] } },
    props: [{ k: 'box', x: 34, y: 88, w: 30, h: 22 }, { k: 'impl', type: 'plate', at: 'hip' }],
  } : {
    view: 'side', elbow: -1, knee: -1,
    a: { hip: [76, 104], t: -90, foot: { abs: [102, FLOOR_Y] }, foot2: { abs: [102, FLOOR_Y] }, hand: { abs: [70, 108] } },
    b: { hip: [76, 90], t: -68, foot: { abs: [102, FLOOR_Y] }, foot2: { hip: [48, -12] }, hand: { abs: [70, 108] } },
  },
  inclinePress: (impl: 'db' | 'barbell'): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [82, 80], t: -122, foot: { abs: [108, FLOOR_Y] }, hand: { sh: [6, 3] } },
    b: { hip: [82, 80], t: -122, foot: { abs: [108, FLOOR_Y] }, hand: { sh: [18, -32] } },
    props: [{ k: 'backPad' }, { k: 'box', x: 70, y: 86, w: 18, h: 24 }, { k: 'impl', type: impl === 'db' ? 'db' : 'plate', at: 'hands' }],
  }),
  chestPress: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [60, 78], t: 180, foot: { abs: [90, FLOOR_Y] }, hand: { sh: [10, 6] } },
    b: { hip: [60, 78], t: 180, foot: { abs: [90, FLOOR_Y] }, hand: { sh: [37, 6] } },
    props: [{ k: 'backPad' }, { k: 'seat' }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  overheadPress: (impl: 'db' | 'handle'): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [66, 78], t: 180, foot: { abs: [96, FLOOR_Y] }, hand: { sh: [8, -2] } },
    b: { hip: [66, 78], t: 180, foot: { abs: [96, FLOOR_Y] }, hand: { sh: [4, -37] } },
    props: [{ k: 'backPad' }, { k: 'seat' }, { k: 'impl', type: impl, at: 'hands' }],
  }),
  pushUp: (variant: 'floor' | 'incline' | 'decline'): SidePattern => {
    if (variant === 'incline') return plank(FLOOR_Y, [116, 84], 37, 14, { props: [{ k: 'box', x: 108, y: 86, w: 40, h: 24 }] });
    if (variant === 'decline') return plank(80, [112, FLOOR_Y], 37, 14, { props: [{ k: 'box', x: 4, y: 82, w: 34, h: 28 }] });
    return plank(FLOOR_Y, [108, FLOOR_Y], 37, 14);
  },
  pikePushUp: (elevated: boolean): SidePattern => {
    const foot: Pt = elevated ? [40, 80] : [46, FLOOR_Y];
    return {
      view: 'side', elbow: 1, knee: -1,
      a: { hip: elevated ? [78, 50] : [62, 60], t: elevated ? 40 : 66, foot: { abs: foot }, hand: { abs: [100, FLOOR_Y] } },
      b: { hip: elevated ? [82, 52] : [70, 64], t: elevated ? 18 : 32, foot: { abs: foot }, hand: { abs: [100, FLOOR_Y] } },
      props: elevated ? [{ k: 'box', x: 18, y: 82, w: 30, h: 28 }] : [],
    };
  },
  lateralRaise: (cable: boolean): FrontPattern => ({ view: 'front', armA: 10, armB: 84, impl: cable ? 'handle' : 'db', cable }),
  dip: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [76, 55], t: 176, foot: { hip: [-14, 44] }, hand: { abs: [80, 60] } },
    b: { hip: [72, 70], t: 158, foot: { hip: [-20, 36] }, hand: { abs: [80, 60] } },
    props: [{ k: 'bar', a: [66, 62], b: [104, 62] }, { k: 'bar', a: [100, 62], b: [100, FLOOR_Y] }],
  }),
  benchDip: (): SidePattern => ({
    view: 'side', elbow: -1, knee: -1,
    a: { hip: [68, 76], t: 180, foot: { abs: [106, FLOOR_Y] }, hand: { abs: [62, 82] } },
    b: { hip: [70, 92], t: 178, foot: { abs: [106, FLOOR_Y] }, hand: { abs: [62, 82] } },
    props: [{ k: 'box', x: 34, y: 84, w: 32, h: 26 }],
  }),
  pushdown: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { ...standing(174), hand: { sh: [14, 8] } },
    b: { ...standing(174), hand: { sh: [6, 37] } },
    props: [{ k: 'cable', from: [104, 4] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  curl: (cable: boolean): SidePattern => ({
    view: 'side', elbow: -1, knee: -1,
    a: { ...standing(), hand: { sh: [3, 38] } },
    b: { ...standing(), hand: { sh: [12, 4] } },
    props: cable ? [{ k: 'cable', from: [116, FLOOR_Y - 2] }, { k: 'impl', type: 'handle', at: 'hands' }] : [{ k: 'impl', type: 'db', at: 'hands' }],
  }),
  pulldown: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [72, 82], t: 176, foot: { abs: [102, FLOOR_Y] }, hand: { sh: [8, -37] } },
    b: { hip: [72, 82], t: 168, foot: { abs: [102, FLOOR_Y] }, hand: { sh: [10, -2] } },
    props: [{ k: 'seat' }, { k: 'cable', from: [82, 2] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  pullUp: (): SidePattern => ({
    view: 'side', elbow: -1, knee: -1, period: 3,
    // Hanging well clear of the floor: feet dangle at the bottom of the rep.
    a: { hip: [85, 63], t: 182, foot: { hip: [-20, 26] }, hand: { abs: [88, -10] } },
    b: { hip: [84, 36], t: 176, foot: { hip: [-20, 26] }, hand: { abs: [88, -10] } },
    props: [{ k: 'crossbar', at: [88, -10] }, { k: 'bar', a: [118, -10], b: [118, FLOOR_Y] }],
  }),
  hangingKneeRaise: (): SidePattern => ({
    view: 'side', elbow: -1, knee: -1, period: 2.6,
    a: { hip: [85, 61], t: 182, foot: { hip: [-10, 26] }, hand: { abs: [88, -12] } },
    b: { hip: [87, 58], t: 188, foot: { hip: [26, 24] }, hand: { abs: [88, -12] } },
    props: [{ k: 'crossbar', at: [88, -12] }, { k: 'bar', a: [118, -12], b: [118, FLOOR_Y] }],
  }),
  cableRow: (machine: boolean): SidePattern => ({
    view: 'side', elbow: -1, knee: -1,
    a: { hip: [56, 86], t: machine ? 170 : 160, foot: { abs: [104, 96] }, hand: { sh: [36, 8] } },
    b: { hip: [56, 86], t: 182, foot: { abs: [104, 96] }, hand: { sh: [4, 24] } },
    props: machine
      ? [{ k: 'seat' }, { k: 'box', x: 92, y: 40, w: 6, h: 34 }, { k: 'impl', type: 'handle', at: 'hands' }]
      : [{ k: 'box', x: 104, y: 86, w: 5, h: 24 }, { k: 'cable', from: [130, 96] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  dbRow: (): SidePattern => ({
    view: 'side', elbow: -1, knee: -1,
    a: { hip: [58, 60], t: 98, foot: { abs: [66, FLOOR_Y] }, foot2: { abs: [40, FLOOR_Y] }, hand: { sh: [0, 38] }, hand2: { abs: [98, 82] } },
    b: { hip: [58, 60], t: 98, foot: { abs: [66, FLOOR_Y] }, foot2: { abs: [40, FLOOR_Y] }, hand: { sh: [-16, 14] }, hand2: { abs: [98, 82] } },
    props: [{ k: 'box', x: 86, y: 84, w: 44, h: 26 }, { k: 'impl', type: 'plate', at: 'hands' }],
  }),
  invertedRow: (): SidePattern => {
    return plank(106, [104, 50], -37, -8, { elbow: -1, props: [{ k: 'crossbar', at: [104, 50] }, { k: 'bar', a: [124, 50], b: [124, FLOOR_Y] }] });
  },
  facePull: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { ...standing(), hand: { sh: [36, -8] } },
    b: { ...standing(), hand: { sh: [8, -14] } },
    props: [{ k: 'cable', from: [150, 26] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  deadbug: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1, period: 3.2,
    a: { hip: [90, 103], t: -90, foot: { hip: [24, -26] }, foot2: { hip: [22, -27] }, hand: { sh: [0, -38] }, hand2: { sh: [0, -38] } },
    b: { hip: [90, 103], t: -90, foot: { hip: [24, -26] }, foot2: { hip: [50, -4] }, hand: { sh: [0, -38] }, hand2: { sh: [-38, -4] } },
  }),
  hollow: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 3.6,
    a: { hip: [88, 104], t: -82, foot: { hip: [50, -8] }, hand: { sh: [-37, -10] } },
    b: { hip: [88, 104], t: -76, foot: { hip: [49, -13] }, hand: { sh: [-36, -14] } },
  }),
  plank: (side: boolean): SidePattern => {
    return plank(FLOOR_Y, [118, FLOOR_Y], side ? 22 : 20, side ? 27 : 21.5, { elbow: 1, period: 3.6 }, -19);
  },
  cableCrunch: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [66, 82], t: 176, foot: { abs: [40, FLOOR_Y - 2] }, hand: { sh: [4, -5] } },
    b: { hip: [70, 83], t: 108, foot: { abs: [40, FLOOR_Y - 2] }, hand: { sh: [6, -4] } },
    props: [{ k: 'cable', from: [124, 2] }],
  }),
  pallof: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { ...standing(), hand: { sh: [10, 12] } },
    b: { ...standing(), hand: { sh: [37, 10] } },
    props: [{ k: 'cable', from: [150, 46] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  woodchop: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { ...standing(176), hand: { sh: [-22, -20] } },
    b: { ...standing(164), hand: { sh: [30, 26] } },
    props: [{ k: 'cable', from: [10, 6] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  flatPress: (impl: 'db' | 'barbell'): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [96, 82], t: -90, foot: { abs: [118, FLOOR_Y] }, hand: { sh: [4, 2] } },
    b: { hip: [96, 82], t: -90, foot: { abs: [118, FLOOR_Y] }, hand: { sh: [3, -37] } },
    props: [{ k: 'box', x: 40, y: 88, w: 66, h: 6 }, { k: 'box', x: 70, y: 94, w: 8, h: 16 }, { k: 'impl', type: impl === 'db' ? 'db' : 'barbell', at: 'hands' }],
  }),
  cableFly: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { ...standing(172), hand: { sh: [-12, 34] } },
    b: { ...standing(176), hand: { sh: [34, -6] } },
    props: [{ k: 'cable', from: [16, 106] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  straightArmPulldown: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [64, 60], t: 160, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [30, -24] } },
    b: { hip: [64, 60], t: 160, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [6, 37] } },
    props: [{ k: 'cable', from: [130, 4] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  rearDelt: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1,
    a: { hip: [66, 78], t: 174, foot: { abs: [94, FLOOR_Y] }, hand: { sh: [37, 4] } },
    b: { hip: [66, 78], t: 174, foot: { abs: [94, FLOOR_Y] }, hand: { sh: [-30, 6] } },
    props: [{ k: 'seat' }, { k: 'box', x: 84, y: 40, w: 6, h: 34 }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  overheadExtension: (): SidePattern => ({
    view: 'side', elbow: -1, knee: -1,
    a: { hip: [70, 80], t: 170, foot: { abs: [100, FLOOR_Y] }, hand: { sh: [-12, -4] } },
    b: { hip: [70, 80], t: 170, foot: { abs: [100, FLOOR_Y] }, hand: { sh: [10, -37] } },
    props: [{ k: 'seat' }, { k: 'cable', from: [20, 104] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  abWheel: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 3.2,
    a: { hip: [62, 82], t: 120, foot: { abs: [36, FLOOR_Y - 2] }, hand: { abs: [92, 104] } },
    b: { hip: [70, 96], t: 98, foot: { abs: [36, FLOOR_Y - 2] }, hand: { abs: [126, 104] } },
    props: [{ k: 'impl', type: 'plate', at: 'hands' }],
  }),
  kbSwing: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 1.6,
    a: { hip: [54, 64], t: 112, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [-22, 30] } },
    b: { hip: [70, 59], t: 182, foot: { abs: [72, FLOOR_Y] }, hand: { sh: [37, 4] } },
    props: [{ k: 'impl', type: 'plate', at: 'hands' }],
  }),
  // Half-kneeling (keeps the overhead lockout inside the frame, and is a great core variation).
  standingPress: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1,
    a: { hip: [70, 84], t: 180, foot: { abs: [44, FLOOR_Y - 2] }, foot2: { abs: [98, FLOOR_Y] }, hand: { sh: [8, -2] } },
    b: { hip: [70, 84], t: 180, foot: { abs: [44, FLOOR_Y - 2] }, foot2: { abs: [98, FLOOR_Y] }, hand: { sh: [3, -37] } },
    props: [{ k: 'impl', type: 'plate', at: 'hands' }],
  }),
  carry: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 1.2,
    a: { hip: [76, 60], t: 180, foot: { abs: [90, FLOOR_Y] }, foot2: { abs: [62, FLOOR_Y] }, hand: { sh: [1, 38] } },
    b: { hip: [76, 59], t: 180, foot: { abs: [62, FLOOR_Y] }, foot2: { abs: [90, FLOOR_Y] }, hand: { sh: [1, 38] } },
    props: [{ k: 'impl', type: 'kb', at: 'hands' }],
  }),
  run: (treadmill: boolean): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1, period: 0.8,
    a: { hip: [76, 58], t: 172, foot: { abs: [96, 102] }, foot2: { abs: [50, 92] }, hand: { sh: [-12, 26] }, hand2: { sh: [16, 22] } },
    b: { hip: [76, 56], t: 172, foot: { abs: [50, 92] }, foot2: { abs: [96, 102] }, hand: { sh: [16, 22] }, hand2: { sh: [-12, 26] } },
    props: treadmill ? [{ k: 'box', x: 20, y: 104, w: 120, h: 6 }, { k: 'bar', a: [128, 104], b: [134, 50] }] : [],
  }),
  walkIncline: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1, period: 1.4,
    a: { hip: [76, 54], t: 174, foot: { abs: [92, 102] }, foot2: { abs: [60, 106] }, hand: { sh: [-8, 34] }, hand2: { sh: [10, 33] } },
    b: { hip: [76, 54], t: 174, foot: { abs: [60, 106] }, foot2: { abs: [92, 102] }, hand: { sh: [10, 33] }, hand2: { sh: [-8, 34] } },
    props: [{ k: 'bar', a: [20, 108], b: [140, 98] }, { k: 'bar', a: [128, 99], b: [134, 46] }],
  }),
  rower: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 2.2,
    a: { hip: [62, 94], t: 150, foot: { abs: [104, 98] }, hand: { sh: [34, 10] } },
    b: { hip: [40, 94], t: 198, foot: { abs: [104, 98] }, hand: { sh: [10, 24] } },
    props: [{ k: 'bar', a: [16, 102], b: [120, 102] }, { k: 'box', x: 112, y: 84, w: 24, h: 26 }, { k: 'cable', from: [114, 92] }, { k: 'impl', type: 'handle', at: 'hands' }],
  }),
  bike: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1, period: 1.1,
    a: { hip: [62, 66], t: 158, foot: { abs: [92, 96] }, foot2: { abs: [76, 104] }, hand: { abs: [104, 50] } },
    b: { hip: [62, 66], t: 158, foot: { abs: [76, 104] }, foot2: { abs: [92, 96] }, hand: { abs: [104, 50] } },
    props: [{ k: 'seat' }, { k: 'bar', a: [84, 100], b: [104, 50] }, { k: 'box', x: 76, y: 94, w: 18, h: 16 }],
  }),
  shrug: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 2,
    a: { hip: [74, 60], t: 180, foot: { abs: [78, FLOOR_Y] }, hand: { sh: [1, 38] } },
    b: { hip: [74, 60], t: 180, foot: { abs: [78, FLOOR_Y] }, hand: { sh: [1, 35] } },
    props: [{ k: 'impl', type: 'db', at: 'hands' }],
  }),
  /** Lying on a bench, head off the end, plate held to the head (face-up curl / face-down extension). */
  neck: (prone: boolean): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, period: 2.6,
    a: { hip: prone ? [52, 82] : [96, 82], t: prone ? 90 : -90, foot: { abs: prone ? [30, FLOOR_Y] : [118, FLOOR_Y] }, hand: { sh: prone ? [8, -6] : [-8, -6] } },
    b: { hip: prone ? [52, 82] : [96, 82], t: prone ? 104 : -104, foot: { abs: prone ? [30, FLOOR_Y] : [118, FLOOR_Y] }, hand: { sh: prone ? [9, -9] : [-9, -9] } },
    props: [{ k: 'box', x: prone ? 40 : 54, y: 88, w: 66, h: 6 }, { k: 'box', x: prone ? 80 : 82, y: 94, w: 8, h: 16 }, { k: 'impl', type: 'plate', at: 'hands' }],
  }),
  stairs: (): SidePattern => ({
    view: 'side', elbow: 1, knee: -1, knee2: -1, period: 1.4,
    a: { hip: [72, 54], t: 172, foot: { abs: [88, 92] }, foot2: { abs: [66, 104] }, hand: { abs: [102, 62] } },
    b: { hip: [72, 54], t: 172, foot: { abs: [66, 104] }, foot2: { abs: [88, 92] }, hand: { abs: [102, 62] } },
    props: [{ k: 'box', x: 56, y: 104, w: 22, h: 6 }, { k: 'box', x: 78, y: 92, w: 22, h: 18 }, { k: 'bar', a: [102, 62], b: [114, 110] }],
  }),
};

// ------------------------------------------------------------------ exercise → pattern
const BY_ID: Record<string, () => Pattern> = {
  'incline-db-press': () => PATTERNS.inclinePress('db'),
  'incline-smith-press': () => PATTERNS.inclinePress('barbell'),
  'machine-chest-press': () => PATTERNS.chestPress(),
  'pec-deck': () => PATTERNS.chestPress(),
  'incline-push-up': () => PATTERNS.pushUp('incline'),
  'push-up': () => PATTERNS.pushUp('floor'),
  'close-grip-push-up': () => PATTERNS.pushUp('floor'),
  'decline-push-up': () => PATTERNS.pushUp('decline'),
  'pike-push-up': () => PATTERNS.pikePushUp(false),
  'elevated-pike-push-up': () => PATTERNS.pikePushUp(true),
  'db-shoulder-press': () => PATTERNS.overheadPress('db'),
  'machine-shoulder-press': () => PATTERNS.overheadPress('handle'),
  'lateral-raise': () => PATTERNS.lateralRaise(false),
  'cable-lateral-raise': () => PATTERNS.lateralRaise(true),
  'dip': () => PATTERNS.dip(),
  'bench-dip': () => PATTERNS.benchDip(),
  'cable-pushdown': () => PATTERNS.pushdown(),
  'lat-pulldown': () => PATTERNS.pulldown(),
  'negative-pull-up': () => ({ ...PATTERNS.pullUp(), period: 4 }),
  'assisted-pull-up': () => PATTERNS.pullUp(),
  'pull-up': () => PATTERNS.pullUp(),
  'seated-cable-row': () => PATTERNS.cableRow(false),
  'machine-row': () => PATTERNS.cableRow(true),
  'one-arm-db-row': () => PATTERNS.dbRow(),
  'inverted-row': () => PATTERNS.invertedRow(),
  'face-pull': () => PATTERNS.facePull(),
  'db-curl': () => PATTERNS.curl(false),
  'cable-curl': () => PATTERNS.curl(true),
  'smith-squat': () => PATTERNS.squat('bar'),
  'barbell-squat': () => PATTERNS.squat('bar'),
  'leg-press': () => PATTERNS.legPress(),
  'leg-extension': () => PATTERNS.legCurl(true),
  'goblet-squat': () => PATTERNS.squat('goblet'),
  'bodyweight-squat': () => ({ ...PATTERNS.squat('none'), period: 4 }),
  'bulgarian-split-squat': () => PATTERNS.splitSquat(true),
  'reverse-lunge': () => PATTERNS.lunge(),
  'romanian-deadlift': () => PATTERNS.hinge(false),
  'single-leg-rdl': () => PATTERNS.hinge(true),
  'leg-curl': () => PATTERNS.legCurl(false),
  'hip-thrust': () => PATTERNS.hipThrust(true),
  'glute-bridge': () => PATTERNS.hipThrust(false),
  'calf-raise': () => PATTERNS.calfRaise(),
  'single-leg-calf-raise': () => PATTERNS.calfRaise(),
  'deadbug': () => PATTERNS.deadbug(),
  'hollow-hold': () => PATTERNS.hollow(),
  'plank': () => PATTERNS.plank(false),
  'side-plank': () => PATTERNS.plank(true),
  'hanging-knee-raise': () => PATTERNS.hangingKneeRaise(),
  'cable-crunch': () => PATTERNS.cableCrunch(),
  'pallof-press': () => PATTERNS.pallof(),
  'cable-woodchop': () => PATTERNS.woodchop(),
  'barbell-bench-press': () => PATTERNS.flatPress('barbell'),
  'flat-db-press': () => PATTERNS.flatPress('db'),
  'cable-fly': () => PATTERNS.cableFly(),
  'straight-arm-pulldown': () => PATTERNS.straightArmPulldown(),
  'rear-delt-fly': () => PATTERNS.rearDelt(),
  'incline-db-curl': () => PATTERNS.curl(false),
  'hammer-curl': () => PATTERNS.curl(false),
  'ez-bar-curl': () => PATTERNS.curl(false),
  'overhead-cable-extension': () => PATTERNS.overheadExtension(),
  'hack-squat': () => ({ ...PATTERNS.squat('none'), props: [{ k: 'backPad' }] }),
  'walking-lunge': () => PATTERNS.lunge(),
  'seated-calf-raise': () => PATTERNS.calfRaise(),
  'ab-wheel': () => PATTERNS.abWheel(),
  'hanging-leg-raise': () => PATTERNS.hangingKneeRaise(),
  'kb-swing': () => PATTERNS.kbSwing(),
  'kb-goblet-squat': () => PATTERNS.squat('goblet'),
  'kb-press': () => PATTERNS.standingPress(),
  'kb-row': () => PATTERNS.dbRow(),
  'kb-farmer-carry': () => PATTERNS.carry(),
  'treadmill-run': () => PATTERNS.run(true),
  'outdoor-run': () => PATTERNS.run(false),
  'incline-walk': () => PATTERNS.walkIncline(),
  'rowing-machine': () => PATTERNS.rower(),
  'assault-bike': () => PATTERNS.bike(),
  'stair-climber': () => PATTERNS.stairs(),
  'db-shrug': () => PATTERNS.shrug(),
  'neck-curl': () => PATTERNS.neck(false),
  'neck-extension': () => PATTERNS.neck(true),
};

/** Pattern for any exercise. Custom exercises fall back by main muscle + equipment. */
export function patternFor(ex: Pick<Exercise, 'id' | 'primary' | 'equipment' | 'kind'>): Pattern {
  const byId = BY_ID[ex.id];
  if (byId) return byId();
  if (ex.kind === 'cardio') return PATTERNS.run(true);
  if (ex.equipment === 'kettlebell') return PATTERNS.kbSwing();
  const m = ex.primary[0];
  const cable = ex.equipment === 'cable';
  switch (m) {
    case 'chest': return ex.equipment === 'bodyweight' ? PATTERNS.pushUp('floor') : ex.equipment === 'dumbbell' ? PATTERNS.inclinePress('db') : PATTERNS.chestPress();
    case 'back': return ex.equipment === 'dumbbell' ? PATTERNS.dbRow() : PATTERNS.cableRow(!cable);
    case 'shoulders': return PATTERNS.overheadPress(ex.equipment === 'dumbbell' ? 'db' : 'handle');
    case 'biceps': return PATTERNS.curl(cable);
    case 'triceps': return cable ? PATTERNS.pushdown() : PATTERNS.dip();
    case 'quads': return ex.equipment === 'machine' ? PATTERNS.legPress() : PATTERNS.squat(ex.equipment === 'bodyweight' ? 'none' : 'goblet');
    case 'hamstrings': return ex.equipment === 'machine' ? PATTERNS.legCurl(false) : PATTERNS.hinge(false);
    case 'glutes': return PATTERNS.hipThrust(ex.equipment !== 'bodyweight');
    case 'calves': return PATTERNS.calfRaise();
    default: return ex.kind === 'time' ? PATTERNS.plank(false) : cable ? PATTERNS.cableCrunch() : PATTERNS.deadbug();
  }
}

export const DEMO_IDS = Object.keys(BY_ID);

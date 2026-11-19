import { memo, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { patternFor, periodOf, phase } from '../lib/demo/poses';
import { focusFor, MUSCLE_LABEL } from '../lib/demo/muscles';
import { defaultPitch, defaultYaw, fitView, render3d, WORK_PRIMARY, WORK_SECONDARY, type Shape } from '../lib/demo/render3d';
import { C } from '../theme';
import type { Exercise } from '../types';

/** How far the camera drifts left/right on its own (degrees). */
const ORBIT = 22;
/** Idle time left between animation frames (ms). */
const FRAME_GAP_MS = 28;
/** Thin dark rim under every part: separates overlapping limbs and muscles. */
const OUTLINE = '#07080a';

/**
 * 3D animated demo of an exercise: a shaded mannequin doing the rep while the camera
 * slowly orbits. Drag sideways to spin the view yourself.
 */
export const ExerciseDemo = memo(function ExerciseDemo(props: {
  exercise: Pick<Exercise, 'id' | 'name' | 'primary' | 'secondary' | 'equipment' | 'kind'>;
  height?: number;
  /** false = a still 3D frame (for small thumbnails in lists). */
  animate?: boolean;
  /** Freeze the animation (e.g. while a sheet covers it) so it costs nothing. */
  paused?: boolean;
}) {
  const { exercise, height = 170, animate = true, paused = false } = props;
  const pattern = useMemo(() => patternFor(exercise), [exercise]);
  const focus = useMemo(() => focusFor(exercise), [exercise]);
  const baseYaw = defaultYaw(pattern);
  const pitch = defaultPitch(pattern);
  // Frame the whole movement (e.g. hands on a pull-up bar) instead of a fixed window.
  const vb = useMemo(() => fitView(pattern, baseYaw, pitch, ORBIT + 8), [pattern, baseYaw, pitch]);
  const [view, setView] = useState({ p: 0.5, yaw: baseYaw });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hint, setHint] = useState(true);

  // User rotation: a mutable box written by gesture handlers and read by the animation loop.
  const [drag] = useState(() => ({ offset: 0, start: 0, touched: false }));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Pause while the app is in the background.
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setActive(st === 'active'));
    return () => sub.remove();
  }, []);

  // Animation clock: each frame is scheduled only after the previous one has rendered,
  // plus a fixed gap. However heavy a frame is on a slow phone, the JS thread always gets
  // idle time for taps, saves and timers (a back-to-back loop could starve them).
  const [clock] = useState(() => ({ start: 0 }));
  useEffect(() => {
    if (!animate || paused || !active) return;
    const period = periodOf(pattern);
    const id = setTimeout(() => {
      const now = Date.now();
      if (!clock.start) clock.start = now;
      const t = (now - clock.start) / 1000;
      const orbit = reduceMotion || drag.touched ? 0 : Math.sin(t * 0.35) * ORBIT;
      setView({ p: reduceMotion ? 0.5 : phase(t, period), yaw: baseYaw + orbit + drag.offset });
    }, FRAME_GAP_MS);
    return () => clearTimeout(id);
  }, [animate, paused, active, view, reduceMotion, pattern, baseYaw, drag, clock]);

  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => {
      drag.touched = true;
      drag.start = drag.offset;
      setHint(false);
    },
    onPanResponderMove: (_, g) => { drag.offset = drag.start + g.dx * 0.8; },
    onPanResponderTerminationRequest: () => false,
  }));

  const shapes = useMemo(
    () => render3d(pattern, animate ? view.p : 0.5, { yaw: animate ? view.yaw : baseYaw, pitch }, focus),
    [pattern, view, animate, baseYaw, pitch, focus],
  );

  return (
    <View {...(animate ? pan.panHandlers : {})}
      accessible accessibilityRole="image"
      accessibilityLabel={`3D animation showing how to do ${exercise.name}. Works ${[...focus.primary, ...focus.secondary].map((m) => MUSCLE_LABEL[m]).join(', ')}`}
      accessibilityHint={animate ? 'Drag sideways to rotate the view' : undefined}
      style={{ height, backgroundColor: '#121418', borderRadius: 14, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet">
        {shapes.map((s, i) => <ShapeEl key={i} s={s} />)}
      </Svg>
      {animate && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 8, top: 8, right: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {focus.primary.map((m) => <MuscleTag key={m} label={MUSCLE_LABEL[m]} color={WORK_PRIMARY} />)}
          {focus.secondary.map((m) => <MuscleTag key={m} label={MUSCLE_LABEL[m]} color={WORK_SECONDARY} />)}
          {focus.cardio && <MuscleTag label="Heart & lungs" color={WORK_PRIMARY} />}
        </View>
      )}
      {animate && hint && (
        <Text style={{ position: 'absolute', right: 10, bottom: 8, color: C.faint, fontSize: 11, fontWeight: '500' }}>Drag to rotate</Text>
      )}
    </View>
  );
});

function MuscleTag(props: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(10,11,13,0.72)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: props.color }} />
      <Text style={{ color: '#e8eaee', fontSize: 10, fontWeight: '600' }}>{props.label}</Text>
    </View>
  );
}

function ShapeEl({ s }: { s: Shape }) {
  switch (s.k) {
    case 'capsule': {
      const o = s.w * 0.18;
      if (s.opacity != null) {
        return <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeOpacity={s.opacity} strokeWidth={s.w} strokeLinecap="round" />;
      }
      return (
        <>
          {s.edge !== false && <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={OUTLINE} strokeOpacity={0.6} strokeWidth={s.w + 1} strokeLinecap="round" />}
          <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeWidth={s.w} strokeLinecap="round" />
          {s.w > 3 && s.edge !== false && (
            <Line x1={s.a[0] - o} y1={s.a[1] - o} x2={s.b[0] - o} y2={s.b[1] - o} stroke={s.hi} strokeOpacity={0.22}
              strokeWidth={s.w * 0.28} strokeLinecap="round" />
          )}
        </>
      );
    }
    case 'sphere':
      if (s.opacity != null) return <Circle cx={s.at[0]} cy={s.at[1]} r={s.r} fill={s.color} fillOpacity={s.opacity} />;
      return (
        <>
          {s.edge !== false && <Circle cx={s.at[0]} cy={s.at[1]} r={s.r + 0.5} fill={OUTLINE} fillOpacity={0.55} />}
          <Circle cx={s.at[0]} cy={s.at[1]} r={s.r} fill={s.color} />
          {s.edge !== false && <Circle cx={s.at[0] - s.r * 0.32} cy={s.at[1] - s.r * 0.32} r={s.r * 0.36} fill={s.hi} fillOpacity={0.2} />}
        </>
      );
    case 'poly':
      return (
        <Polygon points={s.pts.map((q) => `${q[0]},${q[1]}`).join(' ')} fill={s.fill}
          fillOpacity={s.opacity ?? 1} stroke={s.stroke} strokeWidth={s.stroke ? 0.7 : 0} strokeLinejoin="round" />
      );
    case 'line':
      return (
        <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeWidth={s.w}
          strokeDasharray={s.dash ? '2,1.5' : undefined} />
      );
  }
}

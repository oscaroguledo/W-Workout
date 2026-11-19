import { memo, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { patternFor, periodOf, phase } from '../lib/demo/poses';
import { defaultYaw, render3d, type Shape } from '../lib/demo/render3d';
import { C } from '../theme';
import type { Exercise } from '../types';

const PITCH = 12;
/** How far the camera drifts left/right on its own (degrees). */
const ORBIT = 22;

/**
 * 3D animated demo of an exercise: a shaded mannequin doing the rep while the camera
 * slowly orbits. Drag sideways to spin the view yourself.
 */
export const ExerciseDemo = memo(function ExerciseDemo(props: {
  exercise: Pick<Exercise, 'id' | 'name' | 'primary' | 'equipment' | 'kind'>;
  height?: number;
  /** false = a still 3D frame (for small thumbnails in lists). */
  animate?: boolean;
}) {
  const { exercise, height = 170, animate = true } = props;
  const pattern = useMemo(() => patternFor(exercise), [exercise]);
  const baseYaw = defaultYaw(pattern);
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

  useEffect(() => {
    if (!animate) return;
    const period = periodOf(pattern);
    let raf = 0;
    let start: number | null = null;
    let last = 0;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      if (ts - last > 33) {
        last = ts;
        const t = (ts - start) / 1000;
        const d = drag;
        const orbit = reduceMotion || d.touched ? 0 : Math.sin(t * 0.35) * ORBIT;
        setView({ p: reduceMotion ? 0.5 : phase(t, period), yaw: baseYaw + orbit + d.offset });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, reduceMotion, pattern, baseYaw, drag]);

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
    () => render3d(pattern, animate ? view.p : 0.5, { yaw: animate ? view.yaw : baseYaw, pitch: PITCH }),
    [pattern, view, animate, baseYaw],
  );

  return (
    <View {...(animate ? pan.panHandlers : {})}
      accessible accessibilityRole="image" accessibilityLabel={`3D animation showing how to do ${exercise.name}`}
      accessibilityHint={animate ? 'Drag sideways to rotate the view' : undefined}
      style={{ height, backgroundColor: '#121418', borderRadius: 14, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 6 160 112" preserveAspectRatio="xMidYMid meet">
        {shapes.map((s, i) => <ShapeEl key={i} s={s} />)}
      </Svg>
      {animate && hint && (
        <Text style={{ position: 'absolute', right: 10, bottom: 8, color: C.faint, fontSize: 11, fontWeight: '500' }}>Drag to rotate</Text>
      )}
    </View>
  );
});

function ShapeEl({ s }: { s: Shape }) {
  switch (s.k) {
    case 'capsule': {
      const o = s.w * 0.18;
      return (
        <>
          <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeWidth={s.w} strokeLinecap="round" />
          <Line x1={s.a[0] - o} y1={s.a[1] - o} x2={s.b[0] - o} y2={s.b[1] - o} stroke={s.hi} strokeOpacity={0.35}
            strokeWidth={s.w * 0.3} strokeLinecap="round" />
        </>
      );
    }
    case 'sphere':
      return (
        <>
          <Circle cx={s.at[0]} cy={s.at[1]} r={s.r} fill={s.color} />
          <Circle cx={s.at[0] - s.r * 0.3} cy={s.at[1] - s.r * 0.3} r={s.r * 0.4} fill={s.hi} fillOpacity={0.35} />
        </>
      );
    case 'poly':
      return (
        <Polygon points={s.pts.map((q) => `${q[0]},${q[1]}`).join(' ')} fill={s.fill}
          fillOpacity={s.opacity ?? 1} stroke={s.stroke} strokeWidth={s.stroke ? 0.5 : 0} />
      );
    case 'line':
      return (
        <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeWidth={s.w}
          strokeDasharray={s.dash ? '2,1.5' : undefined} />
      );
  }
}

// Small UI animation helpers built on React Native's core Animated API
// (native driver where possible, so they stay smooth while the JS thread is busy).
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { C } from '../theme';

const useValue = (initial: number) => useState(() => new Animated.Value(initial))[0];

/** Fades + slides its children in on mount. Re-mount (change `key`) to replay. */
export function FadeIn(props: { children: ReactNode; delay?: number; dy?: number; dx?: number; style?: StyleProp<ViewStyle> }) {
  const { delay = 0, dy = 12, dx = 0 } = props;
  const v = useValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[props.style, {
      opacity: v,
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
      ],
    }]}>
      {props.children}
    </Animated.View>
  );
}

/** Springy scale "pop" every time `trigger` turns truthy / changes to a new truthy value. */
export function Pop(props: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useValue(1);
  useEffect(() => {
    if (!props.trigger) return;
    v.setValue(0.6);
    Animated.spring(v, { toValue: 1, friction: 3.5, tension: 220, useNativeDriver: true }).start();
  }, [props.trigger, v]);
  return <Animated.View style={[props.style, { transform: [{ scale: v }] }]}>{props.children}</Animated.View>;
}

/** Fades a tinted overlay in/out (e.g. a set row turning green when completed). */
export function Glow(props: { on: boolean; color: string; radius?: number }) {
  const v = useValue(props.on ? 1 : 0);
  useEffect(() => {
    Animated.timing(v, { toValue: props.on ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  }, [props.on, v]);
  return (
    <Animated.View pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: props.color, opacity: v, borderRadius: props.radius ?? 0 }]} />
  );
}

/** Gentle repeating pulse while `active`. */
export function Pulse(props: { active: boolean; children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number }) {
  const v = useValue(0);
  useEffect(() => {
    if (!props.active) { v.stopAnimation(); v.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [props.active, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, props.scale ?? 1.08] });
  return <Animated.View style={[props.style, { transform: [{ scale }] }]}>{props.children}</Animated.View>;
}

/** Horizontal bar whose fill animates to `pct` (0–100). */
export function AnimatedBar(props: { pct: number; color: string; delay?: number }) {
  const v = useValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: props.pct, duration: 600, delay: props.delay ?? 0, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [props.pct, props.delay, v]);
  const width = v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return <Animated.View style={{ width, height: '100%', borderRadius: 7, backgroundColor: props.color }} />;
}

// Deterministic "random" spread so the burst looks organic without impure render code.
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * Math.PI * 2 + ((i * 37) % 11) / 20,
  dist: 70 + ((i * 53) % 5) * 16,
  size: 6 + (i % 3) * 2,
  color: [C.accent, C.accent2, C.warn, '#f27cc4'][i % 4],
  spin: (i % 2 ? 1 : -1) * (180 + (i % 5) * 60),
}));

/** Confetti burst, replayed whenever `trigger` changes to a new truthy value. */
export function Burst(props: { trigger: unknown; style?: StyleProp<ViewStyle> }) {
  const v = useValue(0);
  useEffect(() => {
    if (!props.trigger) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [props.trigger, v]);
  if (!props.trigger) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, props.style]}>
      {PARTICLES.map((pt, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: pt.size, height: pt.size * 1.6, borderRadius: 2, backgroundColor: pt.color,
          opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(pt.angle) * pt.dist] }) },
            { translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(pt.angle) * pt.dist * 0.8, Math.sin(pt.angle) * pt.dist + 40] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${pt.spin}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

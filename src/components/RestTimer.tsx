import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { FadeIn, Pulse } from './anim';
import { cancelRestEnd, restDoneBuzz, scheduleRestEnd } from '../lib/alerts';
import { fmtClock } from '../lib/units';
import { useNow } from '../lib/useNow';
import { C, R } from '../theme';
import { Chip, Icon, Row } from './ui';

export interface RestState {
  endsAt: number;
  total: number;
}

const restFor = (sec: number): RestState => ({ endsAt: Date.now() + sec * 1000, total: sec });
const secondsUntil = (t: number) => (t - Date.now()) / 1000;

// Timestamp-based so it stays correct when the phone locks. A local notification is
// scheduled for the end time so you still get the alert with the app in the background.
export function useRestTimer(sound: boolean) {
  const [rest, setRestState] = useState<RestState | null>(null);
  const apply = useCallback((r: RestState | null) => {
    setRestState(r);
    if (r) void scheduleRestEnd(secondsUntil(r.endsAt), sound);
    else void cancelRestEnd();
  }, [sound]);
  const start = useCallback((sec: number) => apply(restFor(sec)), [apply]);
  const clear = useCallback(() => apply(null), [apply]);
  const adjust = useCallback((d: number) => {
    if (rest) apply({ endsAt: rest.endsAt + d * 1000, total: Math.max(1, rest.total + d) });
  }, [rest, apply]);
  useEffect(() => () => void cancelRestEnd(), []);
  return { rest, start, adjust, clear };
}

export function RestTimerBar(props: {
  timer: ReturnType<typeof useRestTimer>; vibrate: boolean; suggestedSec: number;
}) {
  const { timer, vibrate, suggestedSec } = props;
  const { rest, start, adjust, clear } = timer;
  const insets = useSafeAreaInsets();
  // Tick only while a rest is running: an idle bar shouldn't re-render (battery).
  const now = useNow(rest ? 200 : null);
  const fired = useRef<number | null>(null);

  const remaining = rest ? Math.min(rest.total, (rest.endsAt - now) / 1000) : 0;
  const done = !!rest && remaining <= 0;

  useEffect(() => {
    if (done && rest && fired.current !== rest.endsAt) {
      fired.current = rest.endsAt;
      if (AppState.currentState === 'active') restDoneBuzz(vibrate);
    }
    if (done && remaining < -20) clear();
  }, [done, rest, remaining, vibrate, clear]);

  const pad = { paddingBottom: insets.bottom + 10 };

  if (!rest) {
    const presets = [60, 90, 120];
    return (
      <View style={[st.bar, st.idle, pad]}>
        <Row style={{ gap: 6, marginRight: 4 }}>
          <Icon name="timer-outline" size={16} color={C.muted} />
          <Text style={st.muted}>Rest</Text>
        </Row>
        {presets.map((sec) => <Chip key={sec} label={fmtClock(sec)} on={sec === suggestedSec} onPress={() => start(sec)} />)}
        {!presets.includes(suggestedSec) && <Chip label={fmtClock(suggestedSec)} on onPress={() => start(suggestedSec)} />}
      </View>
    );
  }

  const pct = done ? 100 : Math.max(0, Math.min(100, (1 - remaining / rest.total) * 100));
  return (
    <FadeIn dy={30} style={[st.bar, done && st.done, pad]}>
      <Pulse active={done} scale={1.08}>
        <View style={st.ring}>
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={C.surface3} strokeWidth={4} fill="none" />
            <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={C.accent} strokeWidth={4} fill="none"
              strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - pct / 100)} strokeLinecap="round"
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />
          </Svg>
          {done ? <Icon name="flash" size={22} color={C.accent} /> : <Icon name="timer-outline" size={20} color={C.muted} />}
        </View>
      </Pulse>
      <View style={{ flex: 1 }}>
        <Text style={[st.clockText, done && { color: C.accent }]} accessibilityLiveRegion="polite">{done ? 'Go' : fmtClock(remaining)}</Text>
        <Text style={st.muted}>{done ? 'Rest over, next set' : `Resting · ${fmtClock(rest.total)}`}</Text>
      </View>
      <Pressable style={({ pressed }) => [st.adj, pressed && { opacity: 0.6 }]} onPress={() => adjust(-15)} accessibilityLabel="Remove 15 seconds"><Text style={st.adjText}>−15</Text></Pressable>
      <Pressable style={({ pressed }) => [st.adj, pressed && { opacity: 0.6 }]} onPress={() => adjust(15)} accessibilityLabel="Add 15 seconds"><Text style={st.adjText}>+15</Text></Pressable>
      <Pressable style={({ pressed }) => [st.adj, st.skip, pressed && { opacity: 0.8 }]} onPress={clear} accessibilityLabel={done ? 'Dismiss' : 'Skip rest'}>
        <Text style={[st.adjText, { color: C.accentInk }]}>{done ? 'OK' : 'Skip'}</Text>
      </Pressable>
    </FadeIn>
  );
}

const RING = 52, RADIUS = 23, CIRC = 2 * Math.PI * RADIUS;

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  idle: { justifyContent: 'center' },
  done: { backgroundColor: '#18200F' },
  muted: { color: C.muted, fontSize: 12, fontWeight: '500' },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  clockText: { color: C.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  adj: { minWidth: 50, minHeight: 48, paddingHorizontal: 8, borderRadius: R.md, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' },
  adjText: { color: C.text, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
  skip: { backgroundColor: C.accent },
});

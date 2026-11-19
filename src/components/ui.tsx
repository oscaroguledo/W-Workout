import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Alert, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput,
  View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, TAP } from '../theme';
import { tapFeedback } from '../lib/alerts';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon(props: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={props.name} size={props.size ?? 18} color={props.color ?? C.text} style={props.style} />;
}

export function Screen(props: {
  title?: string; subtitle?: string; right?: ReactNode; onBack?: () => void; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.screenInner, { paddingTop: insets.top + 14 }]}
      keyboardShouldPersistTaps="handled">
      {props.onBack && (
        <Pressable onPress={props.onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}
          style={({ pressed }) => [s.backLink, pressed && { opacity: 0.6 }]}>
          <Icon name="chevron-back" size={20} color={C.muted} />
          <Text style={[s.small, s.muted]}>Back</Text>
        </Pressable>
      )}
      {props.title && (
        <View style={s.pageHead}>
          <View style={{ flex: 1 }}>
            {props.subtitle && <Text style={s.overline}>{props.subtitle}</Text>}
            <Text style={s.h1} accessibilityRole="header">{props.title}</Text>
          </View>
          {props.right}
        </View>
      )}
      {props.children}
    </ScrollView>
  );
}

export function Card(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, props.style]}>{props.children}</View>;
}

/** A titled group: small label above, content card below (iOS grouped-list style). */
export function Section(props: {
  title: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; bare?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle} accessibilityRole="header">{props.title}</Text>
        {props.right}
      </View>
      {props.bare ? props.children : <Card style={props.style}>{props.children}</Card>}
    </View>
  );
}

export function T(props: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; small?: boolean; bold?: boolean; numberOfLines?: number }) {
  return (
    <Text numberOfLines={props.numberOfLines}
      style={[s.text, props.small && s.small, props.muted && s.muted, props.bold && s.bold, props.style]}>
      {props.children}
    </Text>
  );
}
export const H2 = (p: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h2, p.style]}>{p.children}</Text>;
export const H3 = (p: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h3, p.style]}>{p.children}</Text>;
export const H4 = (p: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.overline, { marginTop: 10 }, p.style]}>{p.children}</Text>;

type BtnVariant = 'default' | 'primary' | 'danger' | 'ghost';
export function Btn(props: {
  label: string; onPress: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: IconName; iconRight?: IconName;
  disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { variant = 'default', size = 'md' } = props;
  const color = variant === 'primary' ? C.accentInk : variant === 'danger' ? C.danger : variant === 'ghost' ? C.muted : C.text;
  const iconSize = size === 'lg' ? 20 : size === 'sm' ? 15 : 17;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? props.label}
      disabled={props.disabled}
      onPress={() => { tapFeedback(); props.onPress(); }}
      style={({ pressed }) => [
        s.btn, size === 'sm' && s.btnSm, size === 'lg' && s.btnLg, s[`btn_${variant}`],
        props.disabled && { opacity: 0.35 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, props.style,
      ]}>
      {props.icon && <Icon name={props.icon} size={iconSize} color={color} />}
      <Text style={[s.btnText, size === 'sm' && { fontSize: 14 }, size === 'lg' && { fontSize: 16 }, { color }]} numberOfLines={1}>
        {props.label}
      </Text>
      {props.iconRight && <Icon name={props.iconRight} size={iconSize} color={color} />}
    </Pressable>
  );
}

export function Chip(props: { label: string; on?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" accessibilityState={{ selected: !!props.on }}
      style={({ pressed }) => [s.chip, props.on && s.chipOn, pressed && { opacity: 0.75 }]}>
      {props.icon && <Icon name={props.icon} size={14} color={props.on ? C.accent : C.muted} />}
      <Text style={[s.chipText, props.on && s.chipTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

/** Segmented control: one row of equal-width options. */
export function Segmented<V extends string | number>(props: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={s.segment}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Pressable key={String(o.value)} onPress={() => props.onChange(o.value)} accessibilityRole="button"
            accessibilityState={{ selected: on }} style={[s.segmentItem, on && s.segmentOn]}>
            <Text style={[s.segmentText, on && { color: C.text }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Switch with consistent colours on iOS, Android and web. */
export function Toggle(props: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const webColors = Platform.OS === 'web' ? { activeThumbColor: '#ffffff', activeTrackColor: C.accent } : {};
  return (
    <Switch value={props.value} onValueChange={props.onChange} accessibilityLabel={props.label}
      trackColor={{ true: C.accent, false: C.surface3 }} thumbColor="#ffffff" ios_backgroundColor={C.surface3} {...webColors} />
  );
}

export function Row(props: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[s.row, props.wrap && { flexWrap: 'wrap' }, props.style]}>{props.children}</View>;
}

export const Divider = () => <View style={s.divider} />;

export function Field(props: TextInputProps & { label: string; hint?: string }) {
  const { label, hint, style, ...rest } = props;
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6, marginVertical: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...rest} style={[s.input, focus && { borderColor: C.borderStrong }, style]}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }} />
      {hint ? <Text style={[s.small, s.muted]}>{hint}</Text> : null}
    </View>
  );
}

/** Big −/value/+ control for one-thumb logging between sets. Hold a button to repeat. */
export function Stepper(props: {
  value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; label: string; display?: (v: number) => string;
  compact?: boolean;
}) {
  const { value, onChange, step, min = 0, max = Infinity, label, display } = props;
  const valRef = useRef(value);
  useEffect(() => { valRef.current = value; }, [value]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bump = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, +(valRef.current + dir * step).toFixed(3)));
    valRef.current = next;
    onChange(next);
  };
  const startRepeat = (dir: 1 | -1) => { timer.current = setInterval(() => bump(dir), 110); };
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  const btn = (dir: 1 | -1) => (
    <Pressable style={({ pressed }) => [s.stepBtn, pressed && s.stepBtnPressed]}
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`} hitSlop={4}
      onPress={() => { tapFeedback(); bump(dir); }} onLongPress={() => startRepeat(dir)} onPressOut={stop}>
      <Icon name={dir > 0 ? 'add' : 'remove'} size={20} color={C.muted} />
    </Pressable>
  );
  return (
    <View style={[s.stepper, props.compact && { minHeight: 52 }]}>
      {btn(-1)}
      <View style={s.stepVal}>
        <Text style={s.stepValText} numberOfLines={1} adjustsFontSizeToFit>{display ? display(value) : value}</Text>
        <Text style={s.stepLabel} numberOfLines={1}>{label}</Text>
      </View>
      {btn(1)}
    </View>
  );
}

/** Bottom sheet: backdrop fades in, sheet springs up from the bottom. */
export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(500));
  useEffect(() => {
    if (!props.open) return;
    y.setValue(500);
    Animated.spring(y, { toValue: 0, damping: 24, stiffness: 240, mass: 0.9, useNativeDriver: true }).start();
  }, [props.open, y]);
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={props.onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={s.backdrop} onPress={props.onClose} accessibilityLabel="Close" />
        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: y }] }]}>
          <View style={s.grabber} />
          <View style={s.sheetHead}>
            <Text style={[s.h2, { flex: 1 }]} numberOfLines={2}>{props.title}</Text>
            <IconBtn icon="close" label="Close" onPress={props.onClose} round />
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {props.children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function IconBtn(props: {
  label: string; icon: IconName; onPress: () => void; disabled?: boolean; round?: boolean; plain?: boolean; color?: string; size?: number;
}) {
  return (
    <Pressable onPress={props.onPress} disabled={props.disabled} accessibilityLabel={props.label} accessibilityRole="button" hitSlop={4}
      style={({ pressed }) => [s.iconBtn, props.round && { borderRadius: 999, minWidth: 36, minHeight: 36 }, props.plain && { backgroundColor: 'transparent' },
        props.disabled && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}>
      <Icon name={props.icon} size={props.size ?? (props.round ? 18 : 20)} color={props.color ?? C.text} />
    </Pressable>
  );
}

export function Stat(props: { value: string; label: string; sub?: string; subColor?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel} numberOfLines={1}>{props.label}</Text>
      <Text style={s.statVal} numberOfLines={1} adjustsFontSizeToFit>{props.value}</Text>
      {props.sub ? <Text style={[s.statSub, props.subColor ? { color: props.subColor } : null]} numberOfLines={1}>{props.sub}</Text> : null}
    </View>
  );
}

/** Thin progress track with an animated-free fill (use AnimatedBar for animated fills). */
export function Track(props: { children: ReactNode; height?: number }) {
  const h = props.height ?? 8;
  return <View style={{ height: h, borderRadius: h / 2, backgroundColor: C.surface3, overflow: 'hidden' }}>{props.children}</View>;
}

/** SVG line chart with a soft area fill and min/max guides. */
export function LineChart(props: { points: { x: number; y: number }[]; format: (y: number) => string; color?: string; height?: number }) {
  const { points, format, color = C.accent, height = 132 } = props;
  const [gid] = useState(() => `g${Math.random().toString(36).slice(2, 8)}`);
  if (!points.length) {
    return (
      <View style={[s.chartBox, { height: 84, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[s.small, s.muted]}>No data yet</Text>
      </View>
    );
  }
  const W = 320, H = height, P = 12;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const sx = (x: number) => (maxX === minX ? W / 2 : P + ((x - minX) / (maxX - minX)) * (W - 2 * P));
  const sy = (y: number) => H - P - ((y - minY) / (maxY - minY)) * (H - 2 * P);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${line} L${sx(maxX).toFixed(1)},${H} L${sx(minX).toFixed(1)},${H} Z` : '';
  const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const last = points[points.length - 1];
  return (
    <View style={{ gap: 6 }}>
      <View style={s.chartBox}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />)}
          {area ? <Path d={area} fill={`url(#${gid})`} /> : null}
          <Path d={line} stroke={color} strokeWidth={2.25} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 24 && points.map((p, i) => <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === points.length - 1 ? 4 : 2.5} fill={i === points.length - 1 ? color : C.surface2} stroke={color} strokeWidth={1.5} />)}
        </Svg>
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={s.caption}>{fmtDate(points[0].x)}</Text>
        <Text style={s.caption}>low {format(Math.min(...ys))} · high {format(Math.max(...ys))} · now <Text style={{ color: C.text }}>{format(last.y)}</Text></Text>
        <Text style={s.caption}>{fmtDate(last.x)}</Text>
      </Row>
    </View>
  );
}

/** Slides down from the top while `visible`; keeps its text while sliding out. */
export function Toast(props: { message: string; visible: boolean }) {
  const insets = useSafeAreaInsets();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (props.visible) Animated.spring(v, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }).start();
    else Animated.timing(v, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [props.visible, v]);
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[s.toast, { top: insets.top + 12, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
      <Text style={s.toastText}>{props.message}</Text>
    </Animated.View>
  );
}

export function confirm(title: string, message: string, okLabel = 'OK', destructive = false): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
}

/** Tappable row. Tonal by default; `flat` for rows inside a card (separated by hairlines). */
export function ListBtn(props: {
  title: ReactNode; subtitle?: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; leading?: ReactNode;
  trailing?: ReactNode; chevron?: boolean; flat?: boolean; accessibilityLabel?: string;
}) {
  const { chevron = true } = props;
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel}
      style={({ pressed }) => [s.listBtn, props.flat && s.listFlat, pressed && { opacity: 0.7 }, props.style]}>
      {props.leading}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof props.title === 'string' ? <Text style={[s.text, s.semibold]} numberOfLines={2}>{props.title}</Text> : props.title}
        {props.subtitle != null && (typeof props.subtitle === 'string' ? <Text style={[s.small, s.muted]} numberOfLines={3}>{props.subtitle}</Text> : props.subtitle)}
      </View>
      {props.trailing}
      {chevron && <Icon name="chevron-forward" size={18} color={C.faint} />}
    </Pressable>
  );
}

/** Small square letter badge for routine tags (A, B, C…). */
export function Tag(props: { children: string; muted?: boolean; size?: number }) {
  const size = props.size ?? 30;
  return (
    <View style={[s.tag, { width: size, height: size, borderRadius: size * 0.3 }, props.muted && { backgroundColor: C.surface3 }]}>
      <Text style={[s.tagText, { fontSize: size * 0.48 }, props.muted && { color: C.text }]}>{props.children}</Text>
    </View>
  );
}

/** Rounded square holding an icon, used as a leading visual in rows. */
export function IconTile(props: { name: IconName; color?: string; bg?: string; size?: number }) {
  const size = props.size ?? 36;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: props.bg ?? C.surface3, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={props.name} size={size * 0.5} color={props.color ?? C.text} />
    </View>
  );
}

/** Small rounded status label. */
export function Pill(props: { label: string; color?: string; bg?: string; icon?: IconName }) {
  const color = props.color ?? C.muted;
  return (
    <View style={[s.pill, { backgroundColor: props.bg ?? C.surface3 }]}>
      {props.icon && <Icon name={props.icon} size={12} color={color} />}
      <Text style={[s.pillText, { color }]} numberOfLines={1}>{props.label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenInner: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
  pageHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: -4 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6, marginBottom: -12, alignSelf: 'flex-start', minHeight: 32 },
  h1: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  h2: { color: C.text, fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  h3: { color: C.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  overline: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, minHeight: 22 },
  sectionTitle: { color: C.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  text: { color: C.text, fontSize: 15, lineHeight: 21 },
  muted: { color: C.muted },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { color: C.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  card: { backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: R.lg, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong, marginVertical: 2 },
  btn: { minHeight: 46, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnSm: { minHeight: 36, paddingHorizontal: 12, borderRadius: R.sm, gap: 6 },
  btnLg: { minHeight: 56, alignSelf: 'stretch', borderRadius: 14 },
  btn_default: {},
  btn_primary: { backgroundColor: C.accent },
  btn_danger: { backgroundColor: C.dangerSoft },
  btn_ghost: { backgroundColor: 'transparent' },
  btnText: { fontWeight: '700', fontSize: 15, letterSpacing: -0.1 },
  chip: { minHeight: 34, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', backgroundColor: C.surface2, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 5 },
  chipOn: { backgroundColor: C.accentSoft, borderColor: 'rgba(197,240,106,0.45)' },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  chipTextOn: { color: C.accent },
  segment: { alignSelf: 'stretch', flexDirection: 'row', backgroundColor: C.surface2, borderRadius: R.sm, padding: 3, gap: 2 },
  segmentItem: { flex: 1, minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentOn: { backgroundColor: C.surface3 },
  segmentText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  fieldLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2, color: C.text, fontSize: 16 },
  stepper: { flex: 1, flexDirection: 'row', minHeight: 58, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.surface2 },
  stepBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  stepBtnPressed: { backgroundColor: C.surface3 },
  stepVal: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  stepValText: { color: C.text, fontSize: 21, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  stepLabel: { color: C.faint, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { maxHeight: '90%', backgroundColor: C.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong, paddingHorizontal: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 14 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: C.surface3, marginTop: 8 },
  iconBtn: { minWidth: 40, minHeight: 40, borderRadius: R.sm, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, backgroundColor: C.surface2, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  statVal: { color: C.text, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  statLabel: { color: C.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  statSub: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  chartBox: { backgroundColor: C.surface2, borderRadius: R.md, overflow: 'hidden' },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: C.surface3, borderWidth: 1, borderColor: C.doneBorder, borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  toastText: { color: C.text, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  listBtn: { minHeight: TAP + 4, paddingHorizontal: 14, paddingVertical: 12, borderRadius: R.md, backgroundColor: C.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listFlat: { backgroundColor: 'transparent', paddingHorizontal: 0, borderRadius: 0, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  tag: { backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  tagText: { color: C.accentInk, fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

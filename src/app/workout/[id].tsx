import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNow } from '@/lib/useNow';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addSet, deleteSession, deleteSet, getSession, getSetsForExercises, getSetsForSession, removeSlot, uid,
  updateSession, updateSet, useExerciseMap, useQuery, useSettings,
} from '@/db';
import { setDoneFeedback } from '@/lib/alerts';
import { suggest } from '@/lib/progression';
import { defaultPlanItem } from '@/lib/session';
import { prLabels, tonnage } from '@/lib/stats';
import { distToM, distUnit, fmtClock, fmtDist, fmtDuration, fmtWeight, kgToUnit, mToDist, round, weightStepKg } from '@/lib/units';
import { RestTimerBar, useRestTimer } from '@/components/RestTimer';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { Burst, FadeIn, Glow, Pop } from '@/components/anim';
import { ExercisePicker } from '@/components/ExercisePicker';
import {
  Btn, Field, H3, H4, Icon, IconBtn, IconTile, ListBtn, Pill, Row, Sheet, Stat, Stepper, T, Toast, confirm, s as ui, type IconName,
} from '@/components/ui';
import { C, R } from '@/theme';
import type { Exercise, PlanItem, SetLog } from '@/types';

type Draft = { w: number; v: number };

export default function WorkoutScreen() {
  useKeepAwake();
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const exMap = useExerciseMap();

  const session = useQuery(() => getSession(sessionId), [sessionId]);
  const sets = useQuery(() => getSetsForSession(sessionId), [sessionId]) ?? [];
  const idKey = [...new Set(session?.plan.map((p) => p.exerciseId) ?? [])].sort().join(',');
  const historyRaw = useQuery(() => getSetsForExercises(idKey ? idKey.split(',') : [], sessionId), [idKey, sessionId]);
  const history = useMemo(() => historyRaw ?? [], [historyRaw]);

  const [slot, setSlot] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const timer = useRestTimer(settings.sound);
  const [howTo, setHowTo] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState<null | 'swap' | 'add' | 'finish'>(null);
  const [toastState, setToastState] = useState({ text: '', visible: false, n: 0 });
  const [prBurst, setPrBurst] = useState(0);
  const setToast = (text: string) => setToastState((t) => ({ text, visible: true, n: t.n + 1 }));
  const [notes, setNotes] = useState('');
  const now = useNow(1000);

  useEffect(() => {
    if (!toastState.n) return;
    const t = setTimeout(() => setToastState((x) => ({ ...x, visible: false })), 3200);
    return () => clearTimeout(t);
  }, [toastState.n]);

  const plan = session?.plan ?? [];
  const cur = Math.min(slot, Math.max(0, plan.length - 1));
  const item: PlanItem | undefined = plan[cur];
  const ex: Exercise | undefined = item && exMap[item.exerciseId];

  const groupedHistory = useMemo(() => {
    if (!ex) return [];
    const bySession = new Map<string, SetLog[]>();
    history.filter((x) => x.exerciseId === ex.id).forEach((x) => bySession.set(x.sessionId, [...(bySession.get(x.sessionId) ?? []), x]));
    return [...bySession.values()]
      .map((g) => g.sort((a, b) => a.setIndex - b.setIndex))
      .sort((a, b) => Math.max(...b.map((x) => x.completedAt)) - Math.max(...a.map((x) => x.completedAt)));
  }, [history, ex]);

  if (session === undefined) return <View style={st.root} />;
  if (session === null) {
    return (
      <View style={[st.root, st.center]}>
        <T muted>This workout no longer exists.</T>
        <Btn label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const exit = (finished: boolean) => {
    timer.clear();
    if (finished) router.replace('/history');
    else router.back();
  };
  const savePlan = (next: PlanItem[]) => updateSession(sessionId, { plan: next });

  const header = (
    <View style={[st.head, { paddingTop: insets.top + 8 }]}>
      <IconBtn icon="chevron-down" label="Minimise workout" onPress={() => exit(false)} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={st.headTitle} numberOfLines={1}>{session.name}</Text>
        <Text style={st.elapsed}>{fmtClock((now - session.startedAt) / 1000)}</Text>
      </View>
      <Btn label="Finish" variant="primary" size="sm" onPress={() => setSheet('finish')} />
    </View>
  );

  const totalSets = sets.length;
  const sheets = (
    <>
      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Add exercise">
        <ExercisePicker exMap={exMap} onPick={(id) => {
          void savePlan([...plan, defaultPlanItem(exMap[id], settings.defaultRestSec)]);
          setSlot(plan.length);
          setSheet(null);
        }} />
      </Sheet>
      <Sheet open={sheet === 'finish'} onClose={() => setSheet(null)} title="Finish workout">
        <Row>
          <Stat value={fmtDuration(now - session.startedAt)} label="time" />
          <Stat value={String(totalSets)} label="sets" />
          <Stat value={fmtWeight(tonnage(sets, exMap), settings.weightUnit)} label="volume" />
        </Row>
        <Field label="How did it feel? (optional)" style={{ minHeight: 84, textAlignVertical: 'top' }} multiline value={notes}
          onChangeText={setNotes} placeholder="Energy, sleep, anything that hurt…" />
        <Btn label={totalSets === 0 ? 'End (nothing logged)' : 'Save workout'} variant="primary" size="lg" onPress={async () => {
          try {
            if (totalSets === 0) await deleteSession(sessionId);
            else await updateSession(sessionId, { endedAt: Date.now(), notes: notes.trim() || undefined });
            setSheet(null);
            exit(true);
          } catch (e) {
            Alert.alert('Couldn’t save the workout', (e as Error).message);
          }
        }} />
        <Btn label="Discard workout" icon="trash-outline" variant="danger" onPress={async () => {
          if (!(await confirm('Discard workout?', 'This deletes the workout and all its sets.', 'Discard', true))) return;
          try {
            await deleteSession(sessionId);
            setSheet(null);
            exit(true);
          } catch (e) {
            Alert.alert('Couldn’t discard the workout', (e as Error).message);
          }
        }} />
      </Sheet>
    </>
  );

  if (!item || !ex) {
    return (
      <View style={st.root}>
        {header}
        <View style={[st.center, { flex: 1, gap: 12, padding: 24 }]}>
          <IconTile name="barbell-outline" size={56} />
          <H3>Freestyle session</H3>
          <T muted style={{ textAlign: 'center' }}>Add exercises as you go. Each one gets a demo, targets and a rest timer.</T>
          <Btn label="Add exercise" icon="add" variant="primary" size="lg" onPress={() => setSheet('add')} />
        </View>
        {sheets}
      </View>
    );
  }

  const sug = suggest(ex, item, groupedHistory, settings.weightUnit, (i) => exMap[i]?.name ?? i);
  const logged = sets.filter((x) => x.slot === cur && x.exerciseId === ex.id);
  const loggedAt = (r: number) => logged.find((x) => x.setIndex === r);
  const rowCount = Math.max(item.sets, ...logged.map((x) => x.setIndex + 1));
  const isTime = ex.kind === 'time';
  const isCardio = ex.kind === 'cardio';
  const unitSfx = isTime ? 's' : isCardio ? ' min' : '';
  const val = (x: SetLog) => (isTime ? x.seconds : isCardio ? Math.round(x.seconds / 60) : x.reps);
  // Draft.w = load in kg, or distance (km/mi) for cardio. Draft.v = reps / seconds / minutes.
  const wOf = (x: SetLog) => (isCardio ? +mToDist(x.distanceM ?? 0, settings.weightUnit).toFixed(2) : x.weightKg);

  const valueOf = (r: number): Draft => {
    const l = loggedAt(r);
    if (l) return { w: wOf(l), v: val(l) };
    const d = drafts[`${cur}-${r}`];
    if (d) return d;
    if (r > 0) return { w: valueOf(r - 1).w, v: sug.target };
    return { w: isCardio ? +mToDist(sug.weightKg, settings.weightUnit).toFixed(1) : sug.weightKg, v: sug.target };
  };

  const setValue = (r: number, patch: Partial<Draft>) => {
    const l = loggedAt(r);
    if (l) {
      void updateSet(l.id, {
        ...(patch.w !== undefined ? (isCardio ? { distanceM: distToM(patch.w, settings.weightUnit) } : { weightKg: patch.w }) : {}),
        ...(patch.v !== undefined ? (isTime ? { seconds: patch.v } : isCardio ? { seconds: patch.v * 60 } : { reps: patch.v }) : {}),
      });
      return;
    }
    setDrafts((d) => ({ ...d, [`${cur}-${r}`]: { ...valueOf(r), ...patch } }));
  };

  const toggleDone = async (r: number) => {
    const l = loggedAt(r);
    if (l) { await deleteSet(l.id); return; }
    const { w, v } = valueOf(r);
    const prior = [...history.filter((x) => x.exerciseId === ex.id), ...logged];
    const rec = await addSet({
      id: uid(), sessionId, exerciseId: ex.id, slot: cur, setIndex: r,
      weightKg: isCardio ? 0 : w,
      reps: ex.kind === 'reps' ? v : 0,
      seconds: isTime ? v : isCardio ? v * 60 : 0,
      distanceM: isCardio ? distToM(w, settings.weightUnit) : 0,
    });
    setDoneFeedback();
    const prs = prLabels(ex, rec, prior);
    if (prs.length) {
      setToast(`🏆 New PR: ${prs.join(' & ')}!`);
      setPrBurst((n) => n + 1);
    }
    if (item.restSec > 0) timer.start(item.restSec);
  };

  const swapTo = (newId: string) => {
    const nEx = exMap[newId];
    const next = [...plan];
    const base: PlanItem = nEx.kind !== ex.kind ? defaultPlanItem(nEx, item.restSec) : { ...item };
    next[cur] = { ...base, sets: item.sets, exerciseId: newId, originalExerciseId: item.originalExerciseId ?? item.exerciseId };
    void savePlan(next);
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(`${cur}-`))));
    setSheet(null);
    setHowTo((h) => ({ ...h, [newId]: true }));
  };

  const onRemove = async () => {
    if (logged.length) { setToast('Un-tick the logged sets first, or keep it and move on.'); return; }
    if (!(await confirm('Remove exercise?', `Remove ${ex.name} from today's workout?`, 'Remove', true))) return;
    await removeSlot(sessionId, cur, plan);
    setDrafts({});
    setSlot(Math.max(0, cur - 1));
  };

  const doneCount = (i: number) => sets.filter((x) => x.slot === i && x.exerciseId === plan[i].exerciseId).length;
  const step = weightStepKg(ex, settings.weightUnit);
  const fmtW = (kg: number) => {
    if (ex.equipment === 'bodyweight' && kg === 0) return 'BW';
    const v = +round(kgToUnit(kg, settings.weightUnit), 0.25).toFixed(2);
    return ex.equipment === 'bodyweight' ? `+${v}` : `${v}`;
  };
  const weightLabel = ex.assisted ? `${settings.weightUnit} assist` : ex.equipment === 'bodyweight' ? `${settings.weightUnit} added` : settings.weightUnit;
  const lastTime = groupedHistory[0];
  // First time doing an exercise? Show the demo automatically.
  const showHowTo = howTo[ex.id] ?? groupedHistory.length === 0;
  const allDone = logged.length >= item.sets;
  const swapOptions = [...new Set([...ex.alternatives, ex.harder, ex.easier].filter(Boolean) as string[])].map((i) => exMap[i]).filter(Boolean);
  const up = sug.type === 'increase-load' || sug.type === 'harder-variation';
  const hold = sug.type === 'deload' || sug.type === 'repeat';
  const targetColor = up ? C.accent : hold ? C.warn : C.accent2;
  const targetBg = up ? C.accentSoft : hold ? C.warnSoft : C.accent2Soft;
  const targetIcon: IconName = up ? 'trending-up' : sug.type === 'deload' ? 'trending-down' : hold ? 'repeat' : sug.type === 'first-time' ? 'flag-outline' : 'add-circle-outline';

  return (
    <View style={st.root}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={st.strip}>
        {plan.map((p, i) => {
          const d = doneCount(i);
          const complete = d >= p.sets;
          return (
            <Pressable key={i} onPress={() => setSlot(i)} style={[st.pill, i === cur && st.pillOn]}
              accessibilityLabel={`${exMap[p.exerciseId]?.name}, ${d} of ${p.sets} sets`}>
              <Row style={{ gap: 6 }}>
                {complete ? <Icon name="checkmark-circle" size={14} color={C.accent} /> : <Text style={st.pillIdx}>{i + 1}</Text>}
                <Text style={[st.pillText, i === cur && { color: C.text }]} numberOfLines={1}>{exMap[p.exerciseId]?.name ?? p.exerciseId}</Text>
              </Row>
              <View style={st.pillTrack}>
                <View style={[st.pillFill, { width: `${Math.min(100, (d / Math.max(1, p.sets)) * 100)}%` }]} />
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setSheet('add')} style={[st.pill, st.pillAdd]} accessibilityLabel="Add exercise">
          <Icon name="add" size={18} color={C.muted} />
        </Pressable>
      </ScrollView>

      <ScrollView contentContainerStyle={[st.main, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <FadeIn key={`slot-${cur}-${ex.id}`} dy={0} dx={18} style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={st.exCount}>Exercise {cur + 1} of {plan.length}</Text>
          <Text style={st.exName}>{ex.name}</Text>
          <T small muted style={{ textTransform: 'capitalize' }}>
            {ex.primary.join(' · ')} · {ex.equipment}{ex.perSide ? ' · per side' : ''}
          </T>
          {item.originalExerciseId ? <T small muted>Swapped from {exMap[item.originalExerciseId]?.name}</T> : null}
          <Row style={{ marginTop: 6 }}>
            <Btn label={showHowTo ? 'Hide guide' : 'Guide'} icon={showHowTo ? 'eye-off-outline' : 'play-circle-outline'} size="sm"
              onPress={() => setHowTo((h) => ({ ...h, [ex.id]: !showHowTo }))} />
            <Btn label="Swap" icon="swap-horizontal" size="sm" onPress={() => setSheet('swap')} />
          </Row>
        </View>

        {showHowTo && (
          <FadeIn key={`howto-${ex.id}`} dy={-8} style={st.cues}>
            <ExerciseDemo exercise={ex} height={170} paused={sheet !== null} />
            <View style={{ gap: 8, paddingHorizontal: 4, paddingBottom: 4 }}>
              {ex.cues.map((c, i) => (
                <Row key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
                  <Text style={st.cueNum}>{i + 1}</Text>
                  <T small style={{ flex: 1 }}>{c}</T>
                </Row>
              ))}
            </View>
          </FadeIn>
        )}

        <View style={st.target}>
          <Row style={{ alignItems: 'flex-start', gap: 12 }}>
            <IconTile name={targetIcon} color={targetColor} bg={targetBg} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={ui.overline}>Today’s target</Text>
              <Text style={st.targetMain}>
                {sug.type !== 'first-time'
                  ? `${sug.target}${unitSfx}${sug.weightKg > 0 && !isTime ? isCardio ? ` · ${fmtDist(sug.weightKg, settings.weightUnit)}` : ` @ ${fmtWeight(sug.weightKg, settings.weightUnit)}` : ''}`
                  : `${isCardio ? '' : `${item.sets} × `}${item.repMin}–${item.repMax}${unitSfx}`}
              </Text>
              {sug.type !== 'first-time' && (
                <T small muted>{isCardio ? '' : `${item.sets} sets · `}range {item.repMin}–{item.repMax}{unitSfx}</T>
              )}
            </View>
          </Row>
          <T small>{sug.message}</T>
          {sug.switchTo && exMap[sug.switchTo] && (
            <Btn label={`Try ${exMap[sug.switchTo].name}`} icon="arrow-up-circle-outline" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => swapTo(sug.switchTo!)} />
          )}
          {lastTime && (
            <Row style={st.lastTime}>
              <Icon name="time-outline" size={14} color={C.faint} />
              <T small muted style={{ flex: 1 }}>
                Last time: {lastTime.map((x) => isCardio
                  ? `${val(x)} min${x.distanceM ? ` · ${fmtDist(x.distanceM, settings.weightUnit)}` : ''}`
                  : `${!isTime && (x.weightKg || ex.equipment !== 'bodyweight') ? fmtW(x.weightKg) + '×' : ''}${val(x)}${unitSfx}`).join('   ')}
              </T>
            </Row>
          )}
        </View>

        {Array.from({ length: rowCount }, (_, r) => {
          const v = valueOf(r);
          return (
            <SetRow key={`${cur}-${r}`} index={r} done={!!loggedAt(r)} onToggle={() => void toggleDone(r)}>
              {isCardio
                ? <Stepper label={`${distUnit(settings.weightUnit)} (optional)`} value={v.w} step={0.1} display={(d) => d.toFixed(1)} onChange={(w) => setValue(r, { w })} />
                : !isTime && <Stepper label={weightLabel} value={v.w} step={step} display={fmtW} onChange={(w) => setValue(r, { w })} />}
              <Stepper label={isTime ? 'seconds' : isCardio ? 'minutes' : ex.perSide ? 'reps/side' : 'reps'} value={v.v} step={isTime ? 5 : 1}
                onChange={(nv) => setValue(r, { v: nv })} />
            </SetRow>
          );
        })}

        </FadeIn>

        <Row>
          <Btn label="Add set" icon="add" size="sm" variant="ghost" onPress={() => savePlan(plan.map((p, i) => (i === cur ? { ...p, sets: p.sets + 1 } : p)))} />
          {item.sets > 1 && !loggedAt(item.sets - 1) && (
            <Btn label="Remove set" icon="remove" size="sm" variant="ghost" onPress={() => savePlan(plan.map((p, i) => (i === cur ? { ...p, sets: p.sets - 1 } : p)))} />
          )}
          <View style={{ flex: 1 }} />
          {item.restSec > 0 && (
            <Row style={{ gap: 4 }}>
              <Icon name="timer-outline" size={14} color={C.faint} />
              <T small muted>{fmtClock(item.restSec)}</T>
            </Row>
          )}
          <IconBtn icon="trash-outline" label="Remove exercise" plain color={C.muted} onPress={() => void onRemove()} />
        </Row>

        <Row style={{ marginTop: 4 }}>
          <Btn label="Previous" icon="chevron-back" size="lg" style={{ flex: 1 }} disabled={cur === 0} onPress={() => setSlot(cur - 1)} />
          {cur < plan.length - 1
            ? <Btn label="Next" iconRight="chevron-forward" size="lg" style={{ flex: 1 }} variant={allDone ? 'primary' : 'default'} onPress={() => setSlot(cur + 1)} />
            : <Btn label="Finish" icon="flag-outline" size="lg" style={{ flex: 1 }} variant={allDone ? 'primary' : 'default'} onPress={() => setSheet('finish')} />}
        </Row>
      </ScrollView>

      <RestTimerBar timer={timer} vibrate={settings.vibrate} suggestedSec={item.restSec} />
      <Burst trigger={prBurst} style={{ top: insets.top + 40, left: 0, right: 0 }} />
      <Toast message={toastState.text} visible={toastState.visible} />

      <Sheet open={sheet === 'swap'} onClose={() => setSheet(null)} title="Swap exercise">
        <T small muted>Machine taken, or need an easier or harder version? The swap only applies to today.</T>
        {swapOptions.map((o) => (
          <ListBtn key={o.id} leading={<View style={{ width: 76, borderRadius: 10, overflow: 'hidden' }}><ExerciseDemo exercise={o} height={58} animate={false} /></View>}
            title={o.name}
            subtitle={
              <View style={{ gap: 4 }}>
                <T small muted numberOfLines={1} style={{ textTransform: 'capitalize' }}>{o.equipment}</T>
                {o.id === ex.harder ? <Pill label="Harder" icon="arrow-up" color={C.warn} bg={C.warnSoft} />
                  : o.id === ex.easier ? <Pill label="Easier" icon="arrow-down" color={C.accent2} bg={C.accent2Soft} />
                    : null}
              </View>
            }
            onPress={() => swapTo(o.id)} />
        ))}
        <H4>Or pick any exercise</H4>
        <ExercisePicker exMap={exMap} onPick={swapTo} />
      </Sheet>
      {sheets}
    </View>
  );
}

function SetRow(props: { index: number; done: boolean; onToggle: () => void; children: ReactNode }) {
  const { index, done } = props;
  return (
    <View style={[st.setRow, done && st.setRowDone]}>
      <Glow on={done} color={C.doneBg} radius={R.lg} />
      <View style={[st.setNum, done && { backgroundColor: C.accentSoft }]}>
        <Text style={[st.setNumText, done && { color: C.accent }]}>{index + 1}</Text>
      </View>
      {props.children}
      <Pop trigger={done} style={{ alignSelf: 'stretch' }}>
        <Pressable onPress={props.onToggle} style={[st.check, done && st.checkOn]}
          accessibilityRole="checkbox" accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Undo set ${index + 1}` : `Complete set ${index + 1}`}>
          <Icon name="checkmark" size={26} color={done ? C.accentInk : C.faint} />
        </Pressable>
      </Pop>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg },
  headTitle: { color: C.muted, fontSize: 13, fontWeight: '600' },
  elapsed: { color: C.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  strip: { gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  pill: { maxWidth: 170, minHeight: 48, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: 'transparent', gap: 7, justifyContent: 'space-between' },
  pillOn: { backgroundColor: C.surface2, borderColor: C.borderStrong },
  pillAdd: { width: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, borderStyle: 'dashed', borderColor: C.borderStrong },
  pillIdx: { color: C.faint, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillText: { color: C.muted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  pillTrack: { height: 3, borderRadius: 2, backgroundColor: C.surface3, overflow: 'hidden' },
  pillFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2 },
  main: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  exCount: { color: C.faint, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  exName: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  cues: { backgroundColor: C.surface, borderRadius: R.lg, padding: 8, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  cueNum: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: C.surface3, color: C.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  target: { backgroundColor: C.surface, borderRadius: R.lg, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  targetMain: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  lastTime: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  setRow: { flexDirection: 'row', alignItems: 'stretch', gap: 5, padding: 5, borderRadius: R.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: C.surface },
  setRowDone: { borderColor: C.doneBorder },
  setNum: { width: 24, height: 24, borderRadius: 12, alignSelf: 'center', backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' },
  setNumText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  check: { width: 52, flex: 1, borderRadius: R.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.accent },
});

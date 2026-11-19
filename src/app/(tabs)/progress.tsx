import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { deleteBodyLog, getBodyLogs, getFinishedSets, getSetsSince, useExerciseMap, useQuery, useSettings } from '@/db';
import { bestsFor, cardioMinutes, e1rm, muscleSets, vTaperRatio, weekStart } from '@/lib/stats';
import { cmToUnit, distUnit, fmtDist, fmtLength, fmtWeight, kgToUnit, mToDist, parseISODate } from '@/lib/units';
import {
  Btn, Card, H4, Icon, IconBtn, IconTile, LineChart, ListBtn, Pill, Row, Screen, Section, Sheet, Stat, T, Track, confirm,
} from '@/components/ui';
import { C } from '@/theme';
import { AnimatedBar } from '@/components/anim';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { MUSCLES, targetFor, type Exercise, type SetLog } from '@/types';

const WEEK = 7 * 86400000;

export default function Progress() {
  const settings = useSettings();
  const exMap = useExerciseMap();
  const bodyLogs = useQuery(getBodyLogs) ?? [];
  const finishedRaw = useQuery(getFinishedSets);
  const [weekOffset, setWeekOffset] = useState(0);
  const ws = weekStart() - weekOffset * WEEK;
  const weekSets = useQuery(() => getSetsSince(ws, ws + WEEK), [ws]) ?? [];
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [showAll, setShowAll] = useState(false);

  // ----- body -----
  const weights = bodyLogs.filter((b) => b.weightKg != null);
  const waists = bodyLogs.filter((b) => b.waistCm != null);
  const latestW = weights[weights.length - 1];
  const latestWaist = waists[waists.length - 1];
  const deltaW = latestW && weights.length > 1 ? latestW.weightKg! - weights[0].weightKg! : null;
  const deltaWaist = latestWaist && waists.length > 1 ? latestWaist.waistCm! - waists[0].waistCm! : null;
  const whtr = latestWaist && settings.heightCm ? latestWaist.waistCm! / settings.heightCm : null;
  const shoulders = bodyLogs.filter((b) => b.shouldersCm != null);
  const latestShoulders = shoulders[shoulders.length - 1];
  const ratio = vTaperRatio(latestShoulders?.shouldersCm, latestWaist?.waistCm);
  // Ratio over time, using the nearest waist reading on or before each shoulder reading.
  const ratioPoints = shoulders.map((b) => {
    const w = [...waists].reverse().find((x) => x.date <= b.date) ?? waists[0];
    return w ? { x: parseISODate(b.date), y: b.shouldersCm! / w.waistCm! } : null;
  }).filter((p): p is { x: number; y: number } => !!p);
  const sign = (n: number) => (n > 0 ? '+' : '');

  // ----- weekly volume -----
  const vol = muscleSets(weekSets, exMap);
  const maxTarget = Math.max(...MUSCLES.map((m) => targetFor(settings, m)));
  const maxVol = Math.max(maxTarget * 1.25, ...Object.values(vol));
  const weekCardio = Math.round(cardioMinutes(weekSets, exMap));

  // ----- PRs -----
  const prRows = useMemo(() => {
    const byEx = new Map<string, SetLog[]>();
    (finishedRaw ?? []).forEach((x) => byEx.set(x.exerciseId, [...(byEx.get(x.exerciseId) ?? []), x]));
    return [...byEx.entries()]
      .filter(([id]) => exMap[id])
      .map(([id, sets]) => ({ ex: exMap[id], sets, bests: bestsFor(exMap[id], sets) }))
      .sort((a, b) => a.ex.name.localeCompare(b.ex.name));
  }, [finishedRaw, exMap]);

  const fmtBest = (ex: Exercise, b: ReturnType<typeof bestsFor>) => {
    if (ex.kind === 'time') return `${b.seconds}s hold`;
    if (ex.kind === 'cardio') return `longest ${Math.round(b.seconds / 60)} min${b.distanceM ? ` · furthest ${fmtDist(b.distanceM, settings.weightUnit)}` : ''}`;
    if (ex.assisted || (ex.equipment === 'bodyweight' && b.weight === 0)) return `${b.reps} reps`;
    return `${fmtWeight(b.weight, settings.weightUnit)} top · e1RM ${fmtWeight(b.e1rm, settings.weightUnit)}`;
  };

  const deltaLabel = (d: number | null, conv: (n: number) => number, goodDown: boolean) => d == null ? undefined : {
    text: `${sign(d)}${+conv(d).toFixed(1)} since start`,
    color: d === 0 ? C.muted : (d < 0) === goodDown ? C.accent : C.warn,
  };
  const dWaist = deltaLabel(deltaWaist, (n) => cmToUnit(n, settings.lengthUnit), true);
  const dWeight = deltaLabel(deltaW, (n) => kgToUnit(n, settings.weightUnit), true);

  return (
    <Screen title="Progress" subtitle="Your recomp"
      right={<Btn label="Check-in" icon="add" size="sm" onPress={() => router.push('/checkin')} />}>
      <Section title="Body">
        <Row>
          <Stat label="Waist" value={latestWaist ? fmtLength(latestWaist.waistCm!, settings.lengthUnit) : '—'} sub={dWaist?.text ?? 'main scoreboard'} subColor={dWaist?.color} />
          <Stat label="Weight" value={latestW ? fmtWeight(latestW.weightKg!, settings.weightUnit) : '—'} sub={dWeight?.text ?? 'weekly'} subColor={dWeight?.color} />
        </Row>
        <Row>
          <Stat label="V-taper" value={ratio ? ratio.toFixed(2) : '—'} sub={ratio ? `${Math.min(100, Math.round((ratio / 1.6) * 100))}% of 1.6` : 'shoulders ÷ waist'} />
          <Stat label="Waist ÷ height" value={whtr ? whtr.toFixed(2) : '—'} sub={whtr ? (whtr < 0.5 ? 'healthy range' : 'target < 0.50') : 'needs height'}
            subColor={whtr ? (whtr < 0.5 ? C.accent : C.warn) : undefined} />
        </Row>
        {ratio != null && (
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T small muted>V-taper progress</T>
              <T small muted>{latestShoulders ? fmtLength(latestShoulders.shouldersCm!, settings.lengthUnit) : ''} shoulders</T>
            </Row>
            <Track><AnimatedBar pct={Math.min(100, (ratio / 1.6) * 100)} color={C.accent} /></Track>
          </View>
        )}
        <T small muted>
          {ratio
            ? 'Shoulders ÷ waist, with ~1.6 as the classic aesthetic target. It rises from both ends: shoulders and back growing, waist shrinking.'
            : 'Add your shoulder measurement at check-in to track your V-taper (shoulders ÷ waist, target ~1.6).'}
          {whtr && whtr >= 0.5 && settings.heightCm ? ` For waist ÷ height under 0.5 you need a waist under ${fmtLength(settings.heightCm * 0.5, settings.lengthUnit)}.` : ''}
          {!settings.heightCm ? ' Add your height in Settings to see waist ÷ height.' : ''}
        </T>
      </Section>

      <Section title="Trends">
        <H4 style={{ marginTop: 0 }}>Waist ({settings.lengthUnit})</H4>
        <LineChart points={waists.map((b) => ({ x: parseISODate(b.date), y: cmToUnit(b.waistCm!, settings.lengthUnit) }))} format={(y) => y.toFixed(1)} />
        {ratioPoints.length > 0 && (
          <>
            <H4>V-taper ratio</H4>
            <LineChart points={ratioPoints} format={(y) => y.toFixed(2)} color={C.warn} />
          </>
        )}
        <H4>Weight ({settings.weightUnit})</H4>
        <LineChart points={weights.map((b) => ({ x: parseISODate(b.date), y: kgToUnit(b.weightKg!, settings.weightUnit) }))} format={(y) => y.toFixed(1)} color={C.accent2} />
        <Row style={{ alignItems: 'flex-start', marginTop: 4 }}>
          <Icon name="information-circle-outline" size={16} color={C.faint} style={{ marginTop: 1 }} />
          <T small muted style={{ flex: 1 }}>Recomp signal: waist going down while weight holds steady (or rises slowly) means you’re losing fat and gaining muscle.</T>
        </Row>
        {bodyLogs.length > 0 && (
          <Btn label={showAll ? 'Hide check-ins' : `All check-ins (${bodyLogs.length})`} icon={showAll ? 'chevron-up' : 'list-outline'} size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => setShowAll((v) => !v)} />
        )}
        {showAll && [...bodyLogs].reverse().map((b) => (
          <Row key={b.id} style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong, paddingVertical: 6 }}>
            <View style={{ flex: 1 }}>
              <T small bold>{new Date(parseISODate(b.date)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</T>
              <T small muted>
                {[b.weightKg != null && fmtWeight(b.weightKg, settings.weightUnit), b.waistCm != null && `waist ${fmtLength(b.waistCm, settings.lengthUnit)}`,
                  b.shouldersCm != null && `shoulders ${fmtLength(b.shouldersCm, settings.lengthUnit)}`, b.notes].filter(Boolean).join(' · ')}
              </T>
            </View>
            <IconBtn label="Delete check-in" icon="trash-outline" plain color={C.muted} onPress={async () => {
              if (await confirm('Delete check-in?', b.date, 'Delete', true)) await deleteBodyLog(b.id);
            }} />
          </Row>
        ))}
      </Section>

      <Section title="Weekly sets per muscle" right={
        <Row style={{ gap: 4 }}>
          <IconBtn label="Previous week" icon="chevron-back" round onPress={() => setWeekOffset(weekOffset + 1)} />
          <IconBtn label="Next week" icon="chevron-forward" round disabled={weekOffset === 0} onPress={() => setWeekOffset(weekOffset - 1)} />
        </Row>
      }>
        <Row style={{ justifyContent: 'space-between' }}>
          <T small bold>{weekOffset === 0 ? 'This week' : `Week of ${new Date(ws).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}</T>
          <Row style={{ gap: 12 }}>
            <Legend color={C.accent} label="on target" />
            <Legend color={C.warn} label="behind" />
          </Row>
        </Row>
        <View style={{ gap: 10, marginTop: 2 }}>
          {MUSCLES.map((m) => {
            const v = vol[m];
            const target = targetFor(settings, m);
            const color = v >= target ? C.accent : v >= target / 2 ? C.accent2 : C.warn;
            return (
              <View key={m} style={{ gap: 5 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T small style={{ textTransform: 'capitalize' }}>{m}</T>
                  <Text style={st.vol}><Text style={{ color: C.text }}>{+v.toFixed(1)}</Text> / {target}</Text>
                </Row>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surface3, overflow: 'hidden' }}>
                  <AnimatedBar pct={(v / maxVol) * 100} color={color} delay={MUSCLES.indexOf(m) * 30} />
                  <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, left: `${(target / maxVol) * 100}%`, backgroundColor: C.text, opacity: 0.55 }} />
                </View>
              </View>
            );
          })}
        </View>
        <T small muted>The marker is your program’s target, higher for the muscles that build the V-taper. Secondary muscles count ½.</T>
      </Section>

      <Section title="Cardio this week">
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={st.big}>{weekCardio}<Text style={st.bigOf}> / {settings.weeklyCardioMin} min</Text></Text>
          {weekCardio >= settings.weeklyCardioMin && <Pill label="Done" icon="checkmark" color={C.accent} bg={C.accentSoft} />}
        </Row>
        <Track><AnimatedBar pct={Math.min(100, (weekCardio / settings.weeklyCardioMin) * 100)} color={C.accent2} /></Track>
        <T small muted>Runs, incline walks, rower, bike. Mostly easy pace: this is what takes the belly down while the weights build the shape.</T>
      </Section>

      <Section title="Personal records" bare>
        {prRows.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
            <IconTile name="trophy-outline" color={C.warn} bg={C.warnSoft} size={44} />
            <T small muted style={{ textAlign: 'center' }}>Finish a workout to start tracking PRs.</T>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {prRows.map(({ ex, bests }) => (
              <ListBtn key={ex.id} leading={<IconTile name="trophy-outline" color={C.warn} bg={C.warnSoft} size={34} />}
                title={ex.name} subtitle={fmtBest(ex, bests)} onPress={() => setDetail(ex)} />
            ))}
          </View>
        )}
      </Section>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && <ExerciseTrend ex={detail} sets={prRows.find((r) => r.ex.id === detail.id)?.sets ?? []} unit={settings.weightUnit} />}
      </Sheet>
    </Screen>
  );
}

function Legend(props: { color: string; label: string }) {
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: props.color }} />
      <Text style={st.legend}>{props.label}</Text>
    </Row>
  );
}

const st = StyleSheet.create({
  vol: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '600' },
  big: { color: C.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  bigOf: { color: C.muted, fontSize: 14, fontWeight: '500' },
  legend: { color: C.muted, fontSize: 11, fontWeight: '500' },
});

function ExerciseTrend(props: { ex: Exercise; sets: SetLog[]; unit: 'kg' | 'lbs' }) {
  const { ex, sets, unit } = props;
  const bySession = new Map<string, SetLog[]>();
  sets.forEach((x) => bySession.set(x.sessionId, [...(bySession.get(x.sessionId) ?? []), x]));
  const loaded = !ex.assisted && ex.kind === 'reps' && sets.some((x) => x.weightKg > 0);
  const hasDist = ex.kind === 'cardio' && sets.some((x) => (x.distanceM ?? 0) > 0);
  const points = [...bySession.values()].map((g) => ({
    x: Math.max(...g.map((x) => x.completedAt)),
    y: ex.kind === 'cardio'
      ? hasDist ? mToDist(Math.max(...g.map((x) => x.distanceM ?? 0)), unit) : Math.max(...g.map((x) => x.seconds)) / 60
      : ex.kind === 'time' ? Math.max(...g.map((x) => x.seconds))
      : loaded ? kgToUnit(Math.max(...g.map((x) => e1rm(x.weightKg, Math.min(x.reps, 12)))), unit)
        : Math.max(...g.map((x) => x.reps)),
  })).sort((a, b) => a.x - b.x);
  return (
    <View style={{ gap: 6 }}>
      <T small muted>
        {ex.kind === 'cardio' ? (hasDist ? `Distance per session (${distUnit(unit)})` : 'Minutes per session') : ex.kind === 'time' ? 'Longest hold per session (s)' : loaded ? `Best estimated 1-rep max per session (${unit})` : 'Most reps in a set per session'}
      </T>
      <LineChart points={points} format={(y) => y.toFixed(loaded || hasDist ? 1 : 0)} />
      <H4>How to</H4>
      <ExerciseDemo exercise={ex} height={170} />
      {ex.cues.map((c, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.faint, marginTop: 7 }} />
          <T small style={{ flex: 1 }}>{c}</T>
        </Row>
      ))}
    </View>
  );
}

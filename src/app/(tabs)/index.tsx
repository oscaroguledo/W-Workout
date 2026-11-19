import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dailyTargets, totals } from '@/lib/nutrition';
import {
  countFinishedSince, getActiveSession, getBodyLogs, getFoodLogs, getLastFinishedSession, getRoutines, getSetsSince,
  useExerciseMap, useQuery, useSettings,
} from '@/db';
import { estimateMinutes, expressPlan, nextRoutine, startSession } from '@/lib/session';
import { cardioMinutes, muscleSets, weekStart } from '@/lib/stats';
import { programById } from '@/data/programs';
import { targetFor, type Muscle, type Routine } from '@/types';
import { fmtDuration, parseISODate, todayISO } from '@/lib/units';
import { useNow } from '@/lib/useNow';
import { fmtHM, MEAL_INFO, todaySchedule } from '@/lib/meals';
import {
  Btn, Card, H2, Icon, IconBtn, IconTile, ListBtn, Pill, Row, Screen, Section, Stat, T, Tag, s as ui, type IconName,
} from '@/components/ui';
import { FadeIn } from '@/components/anim';
import { C } from '@/theme';

let resumedOnLaunch = false;

export default function Today() {
  const settings = useSettings();
  const exMap = useExerciseMap();
  const routines = useQuery(getRoutines) ?? [];
  const active = useQuery(getActiveSession);
  const lastFinished = useQuery(getLastFinishedSession);
  const weekSets = useQuery(() => getSetsSince(weekStart())) ?? [];
  const weekSessions = useQuery(() => countFinishedSince(weekStart())) ?? 0;
  const bodyLogs = useQuery(getBodyLogs) ?? [];
  const foodToday = useQuery(() => getFoodLogs(todayISO())) ?? [];
  const [showTips, setShowTips] = useState(false);
  const now = useNow(30000);

  // Re-open an unfinished workout when the app is relaunched mid-session.
  useEffect(() => {
    if (active && !resumedOnLaunch) {
      resumedOnLaunch = true;
      router.push(`/workout/${active.id}`);
    }
    if (active === null) resumedOnLaunch = true;
  }, [active]);

  const next = nextRoutine(routines, lastFinished);
  const others = routines.filter((r) => r.id !== next?.id);
  const start = async (r: Routine | null, express = false) => {
    const id = await startSession(r, { express });
    router.push(`/workout/${id}`);
  };

  const lastBody = bodyLogs[bodyLogs.length - 1];
  const daysSinceCheckIn = lastBody ? Math.floor((now - parseISODate(lastBody.date)) / 86400000) : null;
  const ms = muscleSets(weekSets, exMap);
  const behind = (Object.entries(ms) as [Muscle, number][]).filter(([m, n]) => n < targetFor(settings, m) / 2).map(([m]) => m);
  const program = programById(settings.programId);
  const cardio = Math.round(cardioMinutes(weekSets, exMap));
  const eaten = totals(foodToday);
  const targets = dailyTargets(settings, [...bodyLogs].reverse().find((b) => b.weightKg != null)?.weightKg);

  const schedule = todaySchedule(settings, new Date(now));
  const dateLabel = new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen title="Today" subtitle={dateLabel}
      right={<IconBtn icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} round />}>
      <FadeIn>
      {active ? (
        <View style={st.hero}>
          <Pill label={`In progress · ${fmtDuration(now - active.startedAt)}`} icon="radio-button-on" color={C.accent} bg={C.accentSoft} />
          <H2 style={{ fontSize: 26 }}>{active.name}</H2>
          <Btn label="Resume workout" icon="play" variant="primary" size="lg" onPress={() => router.push(`/workout/${active.id}`)} />
        </View>
      ) : next ? (
        <View style={st.hero}>
          <Text style={[ui.overline, { color: C.accent }]}>{program.name} · Next up</Text>
          <Row style={{ gap: 12 }}>
            <Tag size={38}>{next.tag}</Tag>
            <H2 style={{ fontSize: 26, flex: 1 }}>{next.name}</H2>
          </Row>
          <T muted>{next.focus}</T>
          <Row style={{ gap: 16, marginBottom: 4 }}>
            <Meta icon="list-outline" text={`${next.items.length} exercises`} />
            <Meta icon="time-outline" text={`~${estimateMinutes(next.items)} min`} />
          </Row>
          <Btn label="Start workout" icon="play" variant="primary" size="lg" onPress={() => void start(next)} />
          <Btn label={`Express version · ~${estimateMinutes(expressPlan(next.items))} min`} icon="flash-outline"
            onPress={() => void start(next, true)} style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </View>
      ) : null}
      </FadeIn>

      {(daysSinceCheckIn === null || daysSinceCheckIn >= 7) && (
        <FadeIn delay={60}>
          <ListBtn leading={<IconTile name="body-outline" color={C.warn} bg={C.warnSoft} />}
            title="Weekly check-in due"
            subtitle={daysSinceCheckIn === null
              ? 'Log your starting weight and waist. The waist is the number that shows the belly going.'
              : `Last one was ${daysSinceCheckIn} days ago.`}
            onPress={() => router.push('/checkin')} />
        </FadeIn>
      )}

      <FadeIn delay={90}>
        <Section title="Today’s plan" style={{ paddingVertical: 6, gap: 0 }}
          right={<Btn label="Edit" size="sm" variant="ghost" onPress={() => router.push('/settings')} />}>
          {schedule.items.map((it, i) => {
            const isNext = i === schedule.nextIdx;
            const done = schedule.nextIdx === -1 || i < schedule.nextIdx;
            const isWorkout = it.kind === 'workout';
            const info = it.kind === 'workout' ? null : MEAL_INFO[it.kind];
            const label = info ? info.label : next ? `Workout · ${next.name}` : 'Workout';
            const remind = isWorkout ? settings.workoutReminderMin : settings.mealReminderMin;
            return (
              <Pressable key={it.kind} onPress={() => (isWorkout ? (next && !active ? void start(next) : undefined) : router.push('/food'))}
                accessibilityRole="button" accessibilityLabel={`${label} at ${fmtHM(it.hm)}`}
                style={({ pressed }) => [st.planRow, i > 0 && st.speedSep, pressed && { opacity: 0.7 }]}>
                <Text style={[st.planTime, isNext && { color: C.accent }, done && { color: C.faint }]}>{fmtHM(it.hm)}</Text>
                <Icon name={info ? info.icon : 'barbell-outline'} size={17} color={isNext ? C.accent : done ? C.faint : C.muted} />
                <T style={[{ flex: 1 }, done && { color: C.faint }]} numberOfLines={1}>{label}</T>
                {isNext && <Pill label="Next" color={C.accent} bg={C.accentSoft} style={{ alignSelf: 'center' }} />}
                {!isNext && remind > 0 && !done && <Icon name="notifications-outline" size={14} color={C.faint} />}
              </Pressable>
            );
          })}
        </Section>
      </FadeIn>

      <FadeIn delay={120}>
        <Section title="This week">
          <Row>
            <Stat label="Workouts" value={`${weekSessions}`} sub="of 4" />
            <Stat label="Sets" value={String(weekSets.length)} sub="logged" />
            <Stat label="Cardio" value={`${cardio}`} sub={`of ${settings.weeklyCardioMin} min`} />
          </Row>
          {weekSessions >= 2 && behind.length > 0 && (
            <Row style={{ alignItems: 'flex-start' }}>
              <Icon name="alert-circle-outline" size={16} color={C.warn} style={{ marginTop: 1 }} />
              <T small muted style={{ flex: 1 }}>Behind on volume: {behind.join(', ')}.</T>
            </Row>
          )}
        </Section>
      </FadeIn>

      {!active && (
        <FadeIn delay={180}>
          <Section title="Other workouts" bare>
            <View style={{ gap: 8 }}>
              {others.map((r) => (
                <ListBtn key={r.id} leading={<Tag muted>{r.tag}</Tag>} title={r.name} subtitle={r.focus} onPress={() => void start(r)} />
              ))}
              <ListBtn leading={<IconTile name="add" size={30} />} title="Freestyle" subtitle="Empty session, add exercises as you go"
                onPress={() => void start(null)} />
            </View>
          </Section>
        </FadeIn>
      )}

      <FadeIn delay={240}>
        <Section title="What speeds results up">
          {SPEED.map(([title, detail], i) => {
            const live = i === 0 ? { text: `${weekSessions}/4 this week`, ok: weekSessions >= 4 }
              : i === 2 && targets.proteinG ? { text: `${Math.round(eaten.protein)}/${targets.proteinG} g`, ok: eaten.protein >= targets.proteinG }
                : i === 3 && targets.kcal ? { text: `${Math.round(eaten.kcal)}/${targets.kcal}`, ok: eaten.kcal > 0 && eaten.kcal <= targets.kcal }
                  : i === 4 ? { text: `${cardio}/${settings.weeklyCardioMin} min`, ok: cardio >= settings.weeklyCardioMin }
                    : null;
            return (
              <View key={title} style={[st.speedRow, i > 0 && st.speedSep]}>
                <View style={[st.num, live?.ok && { backgroundColor: C.accentSoft }]}>
                  {live?.ok ? <Icon name="checkmark" size={14} color={C.accent} /> : <Text style={st.numText}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <T small bold>{title}</T>
                  <T small muted>{detail}</T>
                  {live && <Pill label={live.text} color={live.ok ? C.accent : C.warn} bg={live.ok ? C.accentSoft : C.warnSoft} />}
                </View>
              </View>
            );
          })}
          <T small muted style={{ marginTop: 2 }}>
            Nothing makes muscle grow much faster than this. Anyone promising otherwise is usually selling steroids or scams.
          </T>
        </Section>
      </FadeIn>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Pressable onPress={() => setShowTips((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showTips }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
          <IconTile name="sparkles-outline" color={C.accent2} bg={C.accent2Soft} />
          <View style={{ flex: 1 }}>
            <T bold>How to get the aesthetic look</T>
            <T small muted>From lean-with-a-belly to a lean V-taper</T>
          </View>
          <Icon name={showTips ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
        </Pressable>
        {showTips && (
          <View style={{ gap: 10, paddingTop: 6, paddingBottom: 12 }}>
            {TIPS.map(([b, rest]) => <T key={b} small><T small bold>{b}</T> <T small muted>{rest}</T></T>)}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Meta(props: { icon: IconName; text: string }) {
  return (
    <Row style={{ gap: 6 }}>
      <Icon name={props.icon} size={15} color={C.muted} />
      <T small muted>{props.text}</T>
    </Row>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: '#161A12', borderRadius: 20, padding: 20, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(197,240,106,0.22)' },
  speedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  speedSep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  planTime: { width: 72, color: C.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numText: { color: C.muted, fontSize: 12, fontWeight: '700' },
});

const SPEED: [string, string][] = [
  ['Train 4 times a week without skipping', 'Any days you like. The A → B → C → D rotation just carries on.'],
  ['Beat your last session', 'The target on each exercise tells you exactly how: +1 rep, or more weight once you hit the top of the range.'],
  ['Protein: 1.6–2.2 g per kg of bodyweight daily', 'e.g. 70 kg → 110–155 g a day over 3–4 meals. Log meals in the Food tab.'],
  ['Eat slightly fewer calories than you burn', 'About 300–500 kcal under. If your waist isn’t dropping after 3–4 weeks, trim a little more. Never crash diet.'],
  ['Hit your weekly cardio + 7–10k steps a day', 'Mostly easy runs and incline walks. This is what takes the belly down.'],
  ['Sleep 7–9 hours', 'Poor sleep raises appetite and slows muscle growth and fat loss.'],
];

const TIPS: [string, string][] = [
  ['The look is a ratio.', 'Broad shoulders + wide lats + small waist. The program gives extra sets to side/rear delts, lats and upper chest, and the cardio + diet bring the waist in. Track it with the shoulder ÷ waist number (target ~1.6).'],
  ['Abs are made in the kitchen, shown by low body fat.', 'You already train them 2–3× a rotation; they show up when the belly fat comes off.'],
  ['Waist is your main scoreboard.', 'On a recomp the scale can stay still while you lose fat and gain muscle. Measure at the belly button, same time of day, weekly.'],
  ['Be patient:', 'stronger in 1–3 weeks, waist dropping in 4–8, visible muscle in 8–12, a clearly different body in 12–18 months.'],
  ['Spot reduction isn’t real.', 'Core work builds a stronger midsection, but the belly fat comes off from the overall deficit plus training.'],
  ['Stand taller:', 'adult height can’t be increased by training, but good posture can add a little to how tall you look. Rear delts, face pulls, rows and core work (all in the program) pull the shoulders back.'],
];

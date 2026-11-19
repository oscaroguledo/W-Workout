import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteSession, getFinishedSessions, getFinishedSets, useExerciseMap, useQuery, useSettings } from '@/db';
import { tonnage } from '@/lib/stats';
import { fmtDist, fmtDuration, fmtWeight } from '@/lib/units';
import { Btn, Card, H3, Icon, IconTile, Row, Screen, T, confirm, type IconName } from '@/components/ui';
import { C, R } from '@/theme';
import type { SetLog } from '@/types';

export default function History() {
  const settings = useSettings();
  const exMap = useExerciseMap();
  const sessions = useQuery(() => getFinishedSessions()) ?? [];
  const allSets = useQuery(getFinishedSets) ?? [];
  const [open, setOpen] = useState<string | null>(null);

  const bySession = new Map<string, SetLog[]>();
  allSets.forEach((x) => bySession.set(x.sessionId, [...(bySession.get(x.sessionId) ?? []), x]));

  const fmtSet = (x: SetLog) => {
    const ex = exMap[x.exerciseId];
    if (ex?.kind === 'time') return `${x.seconds}s`;
    if (ex?.kind === 'cardio') return `${Math.round(x.seconds / 60)} min${x.distanceM ? ` · ${fmtDist(x.distanceM, settings.weightUnit)}` : ''}`;
    if (ex?.equipment === 'bodyweight' && x.weightKg === 0) return `${x.reps}`;
    return `${fmtWeight(x.weightKg, settings.weightUnit)}×${x.reps}`;
  };

  const totalSets = allSets.length;
  return (
    <Screen title="History" subtitle={sessions.length ? `${sessions.length} workout${sessions.length === 1 ? '' : 's'} · ${totalSets} sets` : 'Your workouts'}>
      {sessions.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
          <IconTile name="calendar-outline" size={52} />
          <H3>No workouts yet</H3>
          <T small muted style={{ textAlign: 'center' }}>Your finished workouts show up here, with every set you logged.</T>
        </Card>
      )}
      <View style={{ gap: 10 }}>
      {sessions.map((sess) => {
        const sets = bySession.get(sess.id) ?? [];
        const isOpen = open === sess.id;
        const groups: { exId: string; sets: SetLog[] }[] = [];
        [...sets].sort((a, b) => a.slot - b.slot || a.setIndex - b.setIndex).forEach((x) => {
          const last = groups[groups.length - 1];
          if (last && last.exId === x.exerciseId) last.sets.push(x);
          else groups.push({ exId: x.exerciseId, sets: [x] });
        });
        const d = new Date(sess.startedAt);
        return (
          <Card key={sess.id} style={{ padding: 0, gap: 0 }}>
            <Pressable onPress={() => setOpen(isOpen ? null : sess.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              style={({ pressed }) => [st.head, pressed && { opacity: 0.7 }]}>
              <View style={st.date}>
                <Text style={st.dateDay}>{d.getDate()}</Text>
                <Text style={st.dateMon}>{d.toLocaleDateString(undefined, { month: 'short' })}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T bold numberOfLines={1}>{sess.name}</T>
                <Row style={{ gap: 12 }}>
                  <MetaItem icon="time-outline" text={fmtDuration((sess.endedAt ?? sess.startedAt) - sess.startedAt)} />
                  <MetaItem icon="layers-outline" text={`${sets.length} sets`} />
                  <MetaItem icon="barbell-outline" text={fmtWeight(tonnage(sets, exMap), settings.weightUnit)} />
                </Row>
              </View>
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
            </Pressable>
            {isOpen && (
              <View style={st.body}>
                {groups.map((g, i) => (
                  <View key={i} style={st.line}>
                    <T small style={{ flex: 1 }}>{exMap[g.exId]?.name ?? g.exId}</T>
                    <Text style={st.sets}>{g.sets.map(fmtSet).join('  ·  ')}</Text>
                  </View>
                ))}
                {sess.notes ? (
                  <Row style={{ alignItems: 'flex-start', paddingTop: 10 }}>
                    <Icon name="document-text-outline" size={15} color={C.faint} style={{ marginTop: 2 }} />
                    <T small muted style={{ flex: 1 }}>{sess.notes}</T>
                  </Row>
                ) : null}
                <Btn label="Delete workout" icon="trash-outline" size="sm" variant="danger" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={async () => {
                  if (await confirm('Delete workout?', 'This permanently deletes this workout.', 'Delete', true)) await deleteSession(sess.id);
                }} />
              </View>
            )}
          </Card>
        );
      })}
      </View>
    </Screen>
  );
}

function MetaItem(props: { icon: IconName; text: string }) {
  return (
    <Row style={{ gap: 4 }}>
      <Icon name={props.icon} size={13} color={C.faint} />
      <Text style={st.meta}>{props.text}</Text>
    </Row>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  date: { width: 46, height: 50, borderRadius: R.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: C.text, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 22 },
  dateMon: { color: C.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  meta: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  sets: { flex: 1.3, textAlign: 'right', color: C.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
});

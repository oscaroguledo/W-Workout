import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addCustomExercise, applyProgram, deleteCustomExercise, deleteRoutine, getRoutines, putRoutine, putRoutines, uid, useExerciseMap, useQuery, useSettings,
} from '@/db';
import { PROGRAMS, programById } from '@/data/programs';
import { defaultPlanItem, estimateMinutes } from '@/lib/session';
import { ExercisePicker } from '@/components/ExercisePicker';
import {
  Btn, Card, Chip, Field, H3, H4, Icon, IconBtn, IconTile, ListBtn, Pill, Row, Screen, Section, Segmented, Sheet, Stepper, T, Tag, confirm, s as ui,
} from '@/components/ui';
import { C, R } from '@/theme';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { EQUIPMENT, MUSCLES, type Equipment, type Exercise, type ExerciseKind, type Muscle, type PlanItem, type Routine } from '@/types';

export default function Plans() {
  const [tab, setTab] = useState<'routines' | 'library'>('routines');
  return (
    <Screen title="Plans" subtitle="Program & library">
      <Segmented options={[{ value: 'routines', label: 'Routines' }, { value: 'library', label: 'Exercise library' }]} value={tab} onChange={setTab} />
      {tab === 'routines' ? <Routines /> : <Library />}
    </Screen>
  );
}

function Routines() {
  const routines = useQuery(getRoutines) ?? [];
  const exMap = useExerciseMap();
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const settings = useSettings();
  const program = programById(settings.programId);
  const current = routines.find((r) => r.id === editing);

  const move = async (i: number, d: -1 | 1) => {
    const a = routines[i], b = routines[i + d];
    if (!a || !b) return;
    await putRoutines([{ ...a, order: b.order }, { ...b, order: a.order }]);
  };
  const add = async () => {
    const order = routines.length ? Math.max(...routines.map((r) => r.order)) + 1 : 0;
    const r: Routine = { id: uid(), name: 'New routine', tag: String.fromCharCode(65 + (routines.length % 26)), focus: 'Custom', order, items: [] };
    await putRoutine(r);
    setEditing(r.id);
  };

  return (
    <>
      <Section title="Current program">
        <Row style={{ gap: 12, alignItems: 'flex-start' }}>
          <IconTile name="trophy-outline" color={C.accent} bg={C.accentSoft} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <H3>{program.name}</H3>
            <T small muted>{program.summary}</T>
          </View>
        </Row>
        <Btn label="Change program" icon="swap-horizontal" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => setPicking(true)} />
      </Section>

      <Section title="Rotation" bare right={<Btn label="New" icon="add" size="sm" variant="ghost" onPress={() => void add()} />}>
        <T small muted style={{ paddingHorizontal: 4 }}>
          Today offers the routine after the one you did last, whatever day it is. Miss a day? Nothing breaks.
        </T>
        <View style={{ gap: 8 }}>
          {routines.map((r, i) => (
            <View key={r.id} style={st.routine}>
              <Pressable style={({ pressed }) => [{ flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, pressed && { opacity: 0.7 }]}
                onPress={() => setEditing(r.id)} accessibilityRole="button" accessibilityLabel={`Edit ${r.name}`}>
                <Tag>{r.tag}</Tag>
                <View style={{ flex: 1, gap: 3 }}>
                  <T bold>{r.name}</T>
                  <T small muted numberOfLines={2}>{r.items.map((it) => exMap[it.exerciseId]?.name).filter(Boolean).join(' · ') || 'No exercises yet'}</T>
                  <Row style={{ gap: 12, marginTop: 2 }}>
                    <Row style={{ gap: 4 }}><Icon name="list-outline" size={13} color={C.faint} /><T small muted>{r.items.length}</T></Row>
                    <Row style={{ gap: 4 }}><Icon name="time-outline" size={13} color={C.faint} /><T small muted>~{estimateMinutes(r.items)} min</T></Row>
                  </Row>
                </View>
              </Pressable>
              <View style={{ gap: 2 }}>
                <IconBtn label="Move earlier" icon="chevron-up" plain size={18} color={C.muted} disabled={i === 0} onPress={() => void move(i, -1)} />
                <IconBtn label="Move later" icon="chevron-down" plain size={18} color={C.muted} disabled={i === routines.length - 1} onPress={() => void move(i, 1)} />
              </View>
            </View>
          ))}
        </View>
      </Section>
      <Sheet open={picking} onClose={() => setPicking(false)} title="Choose a program">
        <T small muted>Switching replaces your routines with the program’s (your workout history and PRs are kept).</T>
        {PROGRAMS.map((p) => (
          <Card key={p.id} style={[{ backgroundColor: C.surface2 }, p.id === program.id && { borderColor: C.doneBorder, borderWidth: 1 }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H3 style={{ flex: 1 }}>{p.name}</H3>
              {p.id === program.id && <Pill label="Current" icon="checkmark" color={C.accent} bg={C.accentSoft} />}
            </Row>
            <T small muted>{p.summary}</T>
            {p.details.map((d, i) => (
              <Row key={i} style={{ alignItems: 'flex-start', gap: 8 }}>
                <Icon name="checkmark" size={14} color={C.accent} style={{ marginTop: 2 }} />
                <T small style={{ flex: 1 }}>{d}</T>
              </Row>
            ))}
            <Row wrap style={{ gap: 6 }}>{p.routines.map((r) => <Pill key={r.tag} label={`${r.tag} · ${r.name}`} />)}</Row>
            <Btn label={p.id === program.id ? 'Reset to this program' : 'Use this program'} size="sm"
              variant={p.id === program.id ? 'default' : 'primary'} style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onPress={async () => {
                if (!(await confirm(`Use ${p.name}?`, 'Your current routines (including edits) will be replaced. History and PRs are kept.', 'Switch'))) return;
                await applyProgram(p);
                setPicking(false);
              }} />
          </Card>
        ))}
      </Sheet>
      <Sheet open={!!current} onClose={() => setEditing(null)} title="Edit routine">
        {current && <RoutineEditor routine={current} onDeleted={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function RoutineEditor(props: { routine: Routine; onDeleted: () => void }) {
  const r = props.routine;
  const exMap = useExerciseMap();
  const settings = useSettings();
  const [picking, setPicking] = useState<null | { mode: 'add' } | { mode: 'swap'; index: number }>(null);
  const save = (patch: Partial<Routine>) => putRoutine({ ...r, ...patch });
  const setItem = (i: number, patch: Partial<PlanItem>) => save({ items: r.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const moveItem = (i: number, d: -1 | 1) => {
    const items = [...r.items];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    void save({ items });
  };

  if (picking) {
    return (
      <>
        <Btn label="Back" icon="chevron-back" size="sm" variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => setPicking(null)} />
        <ExercisePicker exMap={exMap} onPick={(id) => {
          if (picking.mode === 'add') void save({ items: [...r.items, defaultPlanItem(exMap[id], settings.defaultRestSec)] });
          else setItem(picking.index, { exerciseId: id });
          setPicking(null);
        }} />
      </>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Row>
        <View style={{ width: 70 }}><Field label="Tag" value={r.tag} maxLength={2} autoCapitalize="characters" onChangeText={(t) => void save({ tag: t.toUpperCase() })} /></View>
        <View style={{ flex: 1 }}><Field label="Name" value={r.name} onChangeText={(t) => void save({ name: t })} /></View>
      </Row>
      <Field label="Focus" value={r.focus} onChangeText={(t) => void save({ focus: t })} />

      {r.items.map((it, i) => {
        const ex = exMap[it.exerciseId];
        const isTime = ex?.kind === 'time';
        return (
          <View key={i} style={{ backgroundColor: C.surface2, borderRadius: R.lg, padding: 12, gap: 10 }}>
            <Row>
              <Text style={st.idx}>{i + 1}</Text>
              <T bold style={{ flex: 1 }}>{ex?.name ?? it.exerciseId}</T>
              <IconBtn label="Move up" icon="chevron-up" plain size={18} color={C.muted} disabled={i === 0} onPress={() => moveItem(i, -1)} />
              <IconBtn label="Move down" icon="chevron-down" plain size={18} color={C.muted} disabled={i === r.items.length - 1} onPress={() => moveItem(i, 1)} />
            </Row>
            <Row>
              <Stepper compact label="sets" value={it.sets} min={1} step={1} onChange={(v) => void setItem(i, { sets: v })} />
              <Stepper compact label={isTime ? 'min s' : 'min reps'} value={it.repMin} min={1} step={isTime ? 5 : 1}
                onChange={(v) => void setItem(i, { repMin: v, repMax: Math.max(v, it.repMax) })} />
              <Stepper compact label={isTime ? 'max s' : 'max reps'} value={it.repMax} min={1} step={isTime ? 5 : 1}
                onChange={(v) => void setItem(i, { repMax: v, repMin: Math.min(v, it.repMin) })} />
            </Row>
            <T small muted>Rest between sets</T>
            <Segmented options={[45, 60, 90, 120, 180].map((sec) => ({ value: sec, label: `${sec}s` }))} value={it.restSec}
              onChange={(sec) => void setItem(i, { restSec: sec })} />
            <Row>
              <Btn label="Change" icon="swap-horizontal" size="sm" onPress={() => setPicking({ mode: 'swap', index: i })} />
              <View style={{ flex: 1 }} />
              <Btn label="Remove" icon="trash-outline" size="sm" variant="ghost" onPress={() => void save({ items: r.items.filter((_, j) => j !== i) })} />
            </Row>
          </View>
        );
      })}
      <Btn label="Add exercise" icon="add" onPress={() => setPicking({ mode: 'add' })} />
      <Btn label="Delete routine" icon="trash-outline" variant="danger" onPress={async () => {
        if (!(await confirm('Delete routine?', `Delete "${r.name}"? Past workouts are kept.`, 'Delete', true))) return;
        await deleteRoutine(r.id);
        props.onDeleted();
      }} />
    </View>
  );
}

function Library() {
  const exMap = useExerciseMap();
  const [open, setOpen] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <ListBtn leading={<IconTile name="add" color={C.accent} bg={C.accentSoft} />} title="Custom exercise"
        subtitle="A machine or move that isn’t listed" onPress={() => setCreating(true)} />
      <ExercisePicker exMap={exMap} onPick={(id) => setOpen(exMap[id])} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <View style={{ gap: 6 }}>
            <ExerciseDemo exercise={open} height={190} />
            <Row wrap style={{ gap: 6, marginTop: 4 }}>
              <Pill label={open.equipment} icon="barbell-outline" />
              {open.primary.map((m) => <Pill key={m} label={m} color={C.accent} bg={C.accentSoft} />)}
              {open.secondary.map((m) => <Pill key={m} label={m} />)}
              {open.perSide && <Pill label="per side" />}
            </Row>
            {open.cues.length > 0 && (
              <>
                <H4>Form cues</H4>
                {open.cues.map((c, i) => (
                  <Row key={i} style={{ alignItems: 'flex-start', gap: 10 }}>
                    <Text style={st.idx}>{i + 1}</Text>
                    <T small style={{ flex: 1 }}>{c}</T>
                  </Row>
                ))}
              </>
            )}
            {(open.easier || open.harder) && (
              <>
                <H4>Progression</H4>
                {open.easier && <Row><Icon name="arrow-down" size={14} color={C.accent2} /><T small>Easier: {exMap[open.easier]?.name}</T></Row>}
                {open.harder && <Row><Icon name="arrow-up" size={14} color={C.warn} /><T small>Harder: {exMap[open.harder]?.name}</T></Row>}
              </>
            )}
            {open.alternatives.length > 0 && (
              <>
                <H4>If it’s busy, do instead</H4>
                {open.alternatives.map((a) => <Row key={a}><Icon name="swap-horizontal" size={14} color={C.faint} /><T small>{exMap[a]?.name ?? a}</T></Row>)}
              </>
            )}
            {open.custom && (
              <Btn label="Delete exercise" icon="trash-outline" size="sm" variant="danger" style={{ alignSelf: 'flex-start', marginTop: 8 }} onPress={async () => {
                if (!(await confirm('Delete exercise?', 'Logged sets stay in your history.', 'Delete', true))) return;
                await deleteCustomExercise(open.id);
                setOpen(null);
              }} />
            )}
          </View>
        )}
      </Sheet>
      <Sheet open={creating} onClose={() => setCreating(false)} title="Custom exercise">
        <CustomExerciseForm exMap={exMap} onDone={() => setCreating(false)} />
      </Sheet>
    </>
  );
}

function CustomExerciseForm(props: { exMap: Record<string, Exercise>; onDone: () => void }) {
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('machine');
  const [kind, setKind] = useState<ExerciseKind>('reps');
  const [primary, setPrimary] = useState<Muscle[]>([]);
  const [cues, setCues] = useState('');
  const [alts, setAlts] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const toggle = <V,>(arr: V[], v: V) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    if (!name.trim() || (primary.length === 0 && kind !== 'cardio')) { setErr('Give it a name and at least one muscle.'); return; }
    await addCustomExercise({
      id: 'custom-' + uid(), name: name.trim(), primary, secondary: [], equipment, kind,
      cues: cues.split('\n').map((c) => c.trim()).filter(Boolean), alternatives: alts,
      incrementKg: equipment === 'kettlebell' ? 4 : equipment === 'dumbbell' ? 2 : equipment === 'machine' ? 5 : 2.5, custom: true,
    });
    props.onDone();
  };
  const sameMuscle = Object.values(props.exMap).filter((e) => primary.some((m) => e.primary.includes(m)));

  return (
    <View style={{ gap: 6 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Hack Squat Machine" />
      <Text style={ui.fieldLabel}>Equipment</Text>
      <Row wrap>
        {EQUIPMENT.map((e) =>
          <Chip key={e} label={e} on={equipment === e} onPress={() => setEquipment(e)} />)}
      </Row>
      <Text style={ui.fieldLabel}>Logged as</Text>
      <Row>
        <Chip label="reps" on={kind === 'reps'} onPress={() => setKind('reps')} />
        <Chip label="timed hold" on={kind === 'time'} onPress={() => setKind('time')} />
        <Chip label="cardio (min + distance)" on={kind === 'cardio'} onPress={() => { setKind('cardio'); setEquipment('cardio'); }} />
      </Row>
      <Text style={ui.fieldLabel}>Main muscles</Text>
      <Row wrap>{MUSCLES.map((m) => <Chip key={m} label={m} on={primary.includes(m)} onPress={() => setPrimary(toggle(primary, m))} />)}</Row>
      <Text style={ui.fieldLabel}>Form cues (one per line)</Text>
      <TextInput style={[ui.input, { minHeight: 80, textAlignVertical: 'top' }]} multiline value={cues} onChangeText={setCues} placeholderTextColor={C.faint} />
      {sameMuscle.length > 0 && (
        <>
          <Text style={ui.fieldLabel}>Alternatives when it’s busy</Text>
          <Row wrap>
            {sameMuscle.slice(0, 16).map((e) => <Chip key={e.id} label={e.name} on={alts.includes(e.id)} onPress={() => setAlts(toggle(alts, e.id))} />)}
          </Row>
        </>
      )}
      {err ? <T small style={{ color: C.danger }}>{err}</T> : null}
      <Btn label="Save exercise" icon="checkmark" variant="primary" size="lg" onPress={() => void save()} />
    </View>
  );
}

const st = StyleSheet.create({
  routine: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: R.lg, padding: 14, paddingRight: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  idx: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: C.surface3, color: C.muted, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
});

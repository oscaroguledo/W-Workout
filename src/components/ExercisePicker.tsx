import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Equipment, Exercise, Muscle } from '../types';
import { EQUIPMENT, MUSCLES } from '../types';
import { C, R } from '../theme';
import { Chip, Icon, IconBtn, ListBtn, T } from './ui';

export function ExercisePicker(props: { exMap: Record<string, Exercise>; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<Equipment | null>(null);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.values(props.exMap)
      .filter((e) => !muscle || e.primary.includes(muscle))
      .filter((e) => !equip || e.equipment === equip)
      .filter((e) => !term || e.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [props.exMap, q, muscle, equip]);

  return (
    <View style={{ gap: 10 }}>
      <View style={st.search}>
        <Icon name="search" size={18} color={C.faint} />
        <TextInput style={st.searchInput} placeholder="Search exercises" placeholderTextColor={C.faint} value={q} onChangeText={setQ}
          autoCorrect={false} accessibilityLabel="Search exercises" />
        {q ? <IconBtn icon="close-circle" label="Clear search" plain size={18} color={C.faint} onPress={() => setQ('')} /> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="All muscles" on={!muscle} onPress={() => setMuscle(null)} />
        {MUSCLES.map((m) => <Chip key={m} label={m} on={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="Any equipment" on={!equip} onPress={() => setEquip(null)} />
        {EQUIPMENT.map((e) => <Chip key={e} label={e} on={equip === e} onPress={() => setEquip(equip === e ? null : e)} />)}
      </ScrollView>
      <T small muted style={{ paddingHorizontal: 2 }}>{list.length} exercise{list.length === 1 ? '' : 's'}</T>
      <View style={{ gap: 6 }}>
        {list.map((e) => (
          <ListBtn key={e.id} title={e.name}
            subtitle={<Text style={st.sub}>{e.kind === 'cardio' ? 'cardio · fat loss & fitness' : `${e.equipment} · ${e.primary.join(', ')}`}</Text>}
            onPress={() => props.onPick(e.id)} />
        ))}
      </View>
      {list.length === 0 && <T small muted style={{ textAlign: 'center', paddingVertical: 16 }}>No matches. Try another word or clear the filters.</T>}
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface2, borderRadius: R.md, paddingLeft: 12, minHeight: 46 },
  searchInput: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 10 },
  sub: { color: C.muted, fontSize: 13, textTransform: 'capitalize' },
});

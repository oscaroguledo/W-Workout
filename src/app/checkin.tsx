import { router } from 'expo-router';
import { useState } from 'react';
import { addBodyLog, uid, useSettings } from '@/db';
import { todayISO, unitToCm, unitToKg } from '@/lib/units';
import { View } from 'react-native';
import { Btn, Field, Icon, IconBtn, IconTile, Row, Screen, Section, T } from '@/components/ui';
import { C } from '@/theme';

const close = () => (router.canGoBack() ? router.back() : router.replace('/progress'));

export default function CheckIn() {
  const settings = useSettings();
  const [date, setDate] = useState(todayISO);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [shoulders, setShoulders] = useState('');
  const [neck, setNeck] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const save = async () => {
    const w = parseFloat(weight.replace(',', '.'));
    const wa = parseFloat(waist.replace(',', '.'));
    const sh = parseFloat(shoulders.replace(',', '.'));
    const nk = parseFloat(neck.replace(',', '.'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setErr('Date must look like 2026-11-18.'); return; }
    if (isNaN(w) && isNaN(wa) && isNaN(sh) && isNaN(nk) && !notes.trim()) { setErr('Enter at least one measurement or a note.'); return; }
    await addBodyLog({
      id: uid(), date,
      weightKg: isNaN(w) ? undefined : unitToKg(w, settings.weightUnit),
      waistCm: isNaN(wa) ? undefined : unitToCm(wa, settings.lengthUnit),
      shouldersCm: isNaN(sh) ? undefined : unitToCm(sh, settings.lengthUnit),
      neckCm: isNaN(nk) ? undefined : unitToCm(nk, settings.lengthUnit),
      notes: notes.trim() || undefined,
    });
    close();
  };

  return (
    <Screen title="Check-in" subtitle="Weekly"
      right={<IconBtn icon="close" label="Cancel" round onPress={() => close()} />}>
      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
        <IconTile name="information-circle-outline" color={C.accent2} bg={C.accent2Soft} />
        <T small muted style={{ flex: 1 }}>
          Same morning each week, after the toilet and before food. Waist: tape at belly-button level, relaxed, after breathing out.
        </T>
      </Row>
      <Section title="Measurements">
        <Field label="Date" value={date} onChangeText={setDate} autoCorrect={false} hint="YYYY-MM-DD" />
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field label={`Weight (${settings.weightUnit})`} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="0.0" /></View>
          <View style={{ flex: 1 }}><Field label={`Waist (${settings.lengthUnit})`} keyboardType="decimal-pad" value={waist} onChangeText={setWaist} placeholder="0.0" /></View>
        </Row>
        <Field label={`Shoulders (${settings.lengthUnit}) · optional`} keyboardType="decimal-pad" value={shoulders} onChangeText={setShoulders}
          placeholder="0.0" hint="Tape around the widest point, arms relaxed. Tracks your V-taper." />
        <Field label={`Neck (${settings.lengthUnit}) · optional`} keyboardType="decimal-pad" value={neck} onChangeText={setNeck}
          placeholder="0.0" hint="Just below the Adam’s apple, tape level. With waist and height it estimates your body fat (once a month is enough)." />
      </Section>
      <Section title="Notes">
        <Field label="How was the week?" value={notes} onChangeText={setNotes} placeholder="Sleep, diet, energy, how clothes fit…" multiline
          style={{ minHeight: 84, textAlignVertical: 'top' }} />
      </Section>
      {err ? (
        <Row>
          <Icon name="alert-circle" size={16} color={C.danger} />
          <T small style={{ color: C.danger, flex: 1 }}>{err}</T>
        </Row>
      ) : null}
      <Btn label="Save check-in" icon="checkmark" variant="primary" size="lg" onPress={() => void save()} />
    </Screen>
  );
}

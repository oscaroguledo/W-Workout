import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { eraseAll, exportAll, getSettings, importAll, updateSettings, useSettings, type Backup } from '@/db';
import { before, fmtHM, MEAL_INFO, toHM, toMin } from '@/lib/meals';
import { syncReminders, testReminder, type SyncResult } from '@/lib/reminders';
import type { Settings } from '@/types';
import { restDoneBuzz, scheduleRestEnd } from '@/lib/alerts';
import { cmToUnit, unitToCm } from '@/lib/units';
import { Btn, Field, Icon, IconTile, Row, Screen, Section, Segmented, Sheet, Stepper, T, Toggle, confirm, s as ui } from '@/components/ui';
import { C } from '@/theme';

export default function SettingsScreen() {
  const s = useSettings();
  const [heightInput, setHeightInput] = useState<string | null>(null);
  const heightVal = heightInput ?? (s.heightCm ? String(+cmToUnit(s.heightCm, s.lengthUnit).toFixed(1)) : '');
  const [importing, setImporting] = useState(false);
  const [kcalInput, setKcalInput] = useState<string | null>(null);
  const kcalVal = kcalInput ?? (s.kcalTarget ? String(s.kcalTarget) : '');
  const saveKcal = () => {
    const v = parseInt(kcalVal, 10);
    // Keep showing what was typed until the save lands (no flash of the old value).
    void updateSettings({ kcalTarget: isNaN(v) || v < 800 ? undefined : v }).then(() => setKcalInput(null));
  };
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState('');

  const [reminderMsg, setReminderMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Save straight away, then (debounced) re-schedule the repeating notifications.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSchedule = (patch: Partial<Settings>) => {
    void updateSettings(patch);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const next = await getSettings();
      const res = await syncReminders(next, { ask: true });
      setReminderMsg(reminderText(res, next));
    }, 600);
  };

  const saveHeight = () => {
    const v = parseFloat(heightVal.replace(',', '.'));
    void updateSettings({ heightCm: isNaN(v) ? undefined : unitToCm(v, s.lengthUnit) }).then(() => setHeightInput(null));
  };

  return (
    <Screen title="Settings" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      <Section title="Units & body">
        <SettingRow label="Weight" wide>
          <Segmented options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lbs' }]} value={s.weightUnit}
            onChange={(u) => void updateSettings({ weightUnit: u })} />
        </SettingRow>
        <SettingRow label="Length" wide>
          <Segmented options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]} value={s.lengthUnit}
            onChange={(u) => { setHeightInput(null); void updateSettings({ lengthUnit: u }); }} />
        </SettingRow>
        <Field label={`Height (${s.lengthUnit})`} keyboardType="decimal-pad" value={heightVal} placeholder={s.lengthUnit === 'cm' ? 'e.g. 178' : 'e.g. 70'}
          onChangeText={setHeightInput} onEndEditing={saveHeight} onSubmitEditing={saveHeight} hint="Used for your waist-to-height ratio." />
      </Section>

      <Section title="Training">
        <T small muted>Default rest for added exercises</T>
        <Segmented options={[60, 90, 120, 180].map((v) => ({ value: v, label: `${v}s` }))} value={s.defaultRestSec}
          onChange={(v) => void updateSettings({ defaultRestSec: v })} />
        <T small muted style={{ marginTop: 4 }}>Weekly cardio target (minutes)</T>
        <Segmented options={[60, 90, 120, 150, 180].map((v) => ({ value: v, label: String(v) }))} value={s.weeklyCardioMin}
          onChange={(v) => void updateSettings({ weeklyCardioMin: v })} />
        <T small muted style={{ color: C.faint }}>Weekly set targets per muscle come from your program (Plans → Change program).</T>
      </Section>

      <Section title="Meal times & reminders">
        {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
          <Row key={m}>
            <Icon name={MEAL_INFO[m].icon} size={18} color={C.muted} />
            <T style={{ flex: 1 }}>{MEAL_INFO[m].label}</T>
            <View style={{ width: 150 }}>
              <Stepper compact label={m} value={toMin(s.mealTimes[m])} step={15} min={0} max={1425}
                display={(v) => toHM(v)} onChange={(v) => saveSchedule({ mealTimes: { ...s.mealTimes, [m]: toHM(v) } })} />
            </View>
          </Row>
        ))}
        <T small muted>Remind me before each meal</T>
        <Segmented options={LEADS} value={s.mealReminderMin} onChange={(v) => saveSchedule({ mealReminderMin: v })} />
      </Section>

      <Section title="Workout schedule & reminder">
        <T small muted>Training days</T>
        <Row style={{ gap: 6 }}>
          {DAYS.map((d, i) => {
            const on = s.workoutDays.includes(i);
            return (
              <Pressable key={i} onPress={() => saveSchedule({ workoutDays: on ? s.workoutDays.filter((x) => x !== i) : [...s.workoutDays, i].sort() })}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_NAMES[i]}
                style={[st.day, on && st.dayOn]}>
                <Text style={[st.dayText, on && { color: C.accentInk }]}>{d}</Text>
              </Pressable>
            );
          })}
        </Row>
        <Row style={{ alignItems: 'center' }}>
          <T style={{ flex: 1 }}>Usual time</T>
          <View style={{ width: 150 }}>
            <Stepper compact label="training" value={toMin(s.workoutTime)} step={15} min={0} max={1425}
              display={(v) => toHM(v)} onChange={(v) => saveSchedule({ workoutTime: toHM(v) })} />
          </View>
        </Row>
        <T small muted>Remind me before training</T>
        <Segmented options={LEADS} value={s.workoutReminderMin} onChange={(v) => saveSchedule({ workoutReminderMin: v })} />
        <Btn label="Send a test reminder in 10s" icon="notifications-outline" size="sm" style={{ alignSelf: 'flex-start' }}
          onPress={async () => {
            const res = await testReminder(10);
            setReminderMsg(res === 'ok' ? { ok: true, text: 'Test reminder coming in 10 seconds. Lock your phone to see it on the lock screen.' } : reminderText(res, s));
          }} />
        {Platform.OS === 'android' && (s.mealReminderMin > 0 || s.workoutReminderMin > 0) && (
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="time-outline" size={16} color={C.faint} style={{ marginTop: 1 }} />
            <T small muted style={{ flex: 1 }}>
              Reminders arriving late? Turn on <T small bold>Alarms &amp; reminders</T> for this app in your phone’s settings so Android delivers them on time.{' '}
              <T small style={{ color: C.accent2 }} onPress={() => void Linking.openSettings()}>Open app settings</T>
            </T>
          </Row>
        )}
        {reminderMsg ? (
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name={reminderMsg.ok ? 'notifications' : 'alert-circle-outline'} size={16} color={reminderMsg.ok ? C.accent : C.warn} style={{ marginTop: 1 }} />
            <T small style={{ flex: 1, color: reminderMsg.ok ? C.muted : C.warn }}>{reminderMsg.text}</T>
          </Row>
        ) : null}
      </Section>

      <Section title="Rest timer alerts">
        <SettingRow label="Sound when rest ends">
          <Toggle label="Sound when rest ends" value={s.sound} onChange={(v) => void updateSettings({ sound: v })} />
        </SettingRow>
        <SettingRow label="Vibrate when rest ends">
          <Toggle label="Vibrate when rest ends" value={s.vibrate} onChange={(v) => void updateSettings({ vibrate: v })} />
        </SettingRow>
        <Btn label="Send a test alert in 5s" icon="notifications-outline" size="sm" style={{ alignSelf: 'flex-start' }}
          onPress={() => { restDoneBuzz(true); void scheduleRestEnd(5, s.sound); }} />
      </Section>

      <Section title="Nutrition">
        <T small muted>Daily protein, grams per kg of bodyweight</T>
        <Segmented options={[1.6, 1.8, 2, 2.2].map((v) => ({ value: v, label: `${v}` }))} value={s.proteinPerKg}
          onChange={(v) => void updateSettings({ proteinPerKg: v })} />
        <Field label="Daily calorie target" keyboardType="number-pad" value={kcalVal}
          onChangeText={setKcalInput} onEndEditing={saveKcal} onSubmitEditing={saveKcal} placeholder="Blank = estimated from your weight"
          hint="If your waist isn’t going down after 3–4 weeks, lower this by ~150 kcal. If you feel drained in the gym, raise it a little." />
      </Section>

      <Section title="Your data">
        <Row style={{ alignItems: 'flex-start', gap: 12 }}>
          <IconTile name="phone-portrait-outline" />
          <T small muted style={{ flex: 1 }}>
            Everything stays on this phone: no account, works offline. Export a backup now and then (Drive, iCloud or email) so you keep your history if you change phones.
          </T>
        </Row>
        <Row>
          <Btn label="Export" icon="share-outline" style={{ flex: 1 }} onPress={async () => {
            const json = JSON.stringify(await exportAll());
            await Share.share({ message: json, title: 'Recomp backup' });
          }} />
          <Btn label="Import" icon="download-outline" style={{ flex: 1 }} onPress={() => setImporting(true)} />
        </Row>
        <Btn label="Erase all data" icon="trash-outline" variant="danger" onPress={async () => {
          if (await confirm('Erase everything?', 'Deletes ALL workouts, check-ins and custom routines on this phone. This cannot be undone.', 'Erase', true)) await eraseAll();
        }} />
      </Section>

      <T small style={{ textAlign: 'center', color: C.faint }}>Recomp 1.0 · offline-first</T>

      <Sheet open={importing} onClose={() => setImporting(false)} title="Import backup">
        <T small muted>Paste the full backup text you exported earlier. Importing REPLACES all data on this phone.</T>
        <TextInput style={[ui.input, { minHeight: 160, textAlignVertical: 'top', fontSize: 12 }]} multiline value={importText}
          onChangeText={setImportText} placeholder='{"app":"recomp", …}' placeholderTextColor={C.faint} autoCorrect={false} autoCapitalize="none" />
        {importErr ? <T small style={{ color: C.danger }}>{importErr}</T> : null}
        <View>
          <Btn label="Replace my data with this backup" icon="download-outline" variant="primary" onPress={async () => {
            try {
              const data = JSON.parse(importText) as Backup;
              if (!(await confirm('Replace all data?', 'Everything currently on this phone will be replaced.', 'Replace', true))) return;
              await importAll(data);
              setImportText(''); setImportErr(''); setImporting(false);
            } catch (e) {
              setImportErr('Import failed: ' + (e as Error).message);
            }
          }} />
        </View>
      </Sheet>
    </Screen>
  );
}

function SettingRow(props: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
      <T style={{ flex: 1 }}>{props.label}</T>
      <View style={props.wide ? { width: 140 } : null}>{props.children}</View>
    </Row>
  );
}

const LEADS = [{ value: 0, label: 'Off' }, { value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '1 h' }];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function reminderText(res: SyncResult, s: Settings): { ok: boolean; text: string } {
  if (res === 'off') return { ok: true, text: 'Reminders are off.' };
  if (res === 'denied') return { ok: false, text: 'Notifications are blocked. Allow them for this app in your phone’s Settings, then change a time here again.' };
  if (res === 'unsupported') return { ok: false, text: 'Reminders work in the app on your phone (not in a web browser).' };
  const parts: string[] = [];
  if (s.mealReminderMin > 0) {
    parts.push((['breakfast', 'lunch', 'dinner'] as const)
      .map((m) => { const a = before(s.mealTimes[m], s.mealReminderMin); return `${MEAL_INFO[m].label.toLowerCase()} ${fmtHM(toHM(a.hour * 60 + a.minute))}`; }).join(', '));
  }
  if (s.workoutReminderMin > 0 && s.workoutDays.length) {
    const a = before(s.workoutTime, s.workoutReminderMin);
    parts.push(`training ${fmtHM(toHM(a.hour * 60 + a.minute))} on ${s.workoutDays.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')}`);
  }
  return { ok: true, text: `Reminders set: ${parts.join(' · ')}.` };
}

const st = StyleSheet.create({
  day: { flex: 1, height: 40, borderRadius: 20, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: C.accent },
  dayText: { color: C.muted, fontWeight: '700', fontSize: 14 },
});

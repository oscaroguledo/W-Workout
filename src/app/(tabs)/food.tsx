import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  deleteFood, getBodyLogs, getFoodLogs, getFoods, logFood, putFood, resetFoods, setFoodLogServings, uid, useQuery, useSettings,
} from '@/db';
import { DEFAULT_MEALS, FOOD_CATEGORIES } from '@/data/foods';
import { currentMeal, fmtHM, MEAL_INFO, MEAL_SHARE, mealsFor } from '@/lib/meals';
import { useNow } from '@/lib/useNow';
import { dailyTargets, kcalFromMacros, totals } from '@/lib/nutrition';
import { todayISO } from '@/lib/units';
import { AnimatedBar, FadeIn, Pop } from '@/components/anim';
import {
  Btn, Card, Chip, Field, H3, Icon, IconBtn, IconTile, Pill, Row, Screen, Section, Sheet, T, Track, confirm, s as ui,
} from '@/components/ui';
import { C, R } from '@/theme';
import { MEALS, type Food, type FoodCategory, type Meal } from '@/types';

const shiftDate = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FoodScreen() {
  const settings = useSettings();
  const [date, setDate] = useState(todayISO);
  const today = todayISO();
  const foodsRaw = useQuery(getFoods);
  const foods = useMemo(() => foodsRaw ?? [], [foodsRaw]);
  const logs = useQuery(() => getFoodLogs(date), [date]) ?? [];
  const bodyLogs = useQuery(getBodyLogs) ?? [];
  const [filter, setFilter] = useState<FoodCategory | null>(null);
  const [editing, setEditing] = useState<Food | 'new' | null>(null);
  const [lastAdded, setLastAdded] = useState<{ id: string; n: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const now = useNow(60000);
  const [picked, setPicked] = useState<Meal | null>(null);
  // Defaults to the meal that fits the time of day; tapping a meal overrides it.
  const meal = picked ?? currentMeal(new Date(now), settings.mealTimes);

  const weight = [...bodyLogs].reverse().find((b) => b.weightKg != null)?.weightKg;
  const targets = dailyTargets(settings, weight);
  const t = totals(logs);
  const grouped = useMemo(() => FOOD_CATEGORIES
    .filter((c) => !filter || c.id === filter)
    .map((c) => ({ ...c, items: foods.filter((f) => f.category === c.id) })), [foods, filter]);

  const mealLogs = (m: Meal) => logs.filter((l) => (l.meal ?? 'snack') === m);
  const current = totals(mealLogs(meal));
  // Protein first (it's what most meals are short on), then carbs, fruit, veg, fats.
  const loggedHere = new Set(mealLogs(meal).map((l) => l.foodId));
  const suggestions = foods
    .filter((f) => SUGGEST_ORDER.includes(f.category) && !loggedHere.has(f.id) && mealsFor(f, DEFAULT_MEALS).includes(meal))
    .sort((x, y) => SUGGEST_ORDER.indexOf(x.category) - SUGGEST_ORDER.indexOf(y.category) || x.order - y.order)
    .slice(0, 10);

  const add = async (f: Food) => {
    await logFood(f, date, meal);
    setLastAdded((x) => ({ id: f.id, n: (x?.n ?? 0) + 1 }));
  };

  const dayLabel = date === today ? 'Today' : date === shiftDate(today, -1) ? 'Yesterday' : date;

  return (
    <Screen title="Food" subtitle="Nutrition"
      right={<Btn label="New food" icon="add" size="sm" onPress={() => setEditing('new')} />}>
      <FadeIn>
        <Card style={{ gap: 14 }}>
          <Row>
            <IconBtn label="Previous day" icon="chevron-back" onPress={() => setDate(shiftDate(date, -1))} round />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <H3>{dayLabel}</H3>
              {date !== today && <T small muted>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}</T>}
            </View>
            <IconBtn label="Next day" icon="chevron-forward" disabled={date >= today} onPress={() => setDate(shiftDate(date, 1))} round />
          </Row>
          {targets.proteinG == null ? (
            <View style={{ gap: 10 }}>
              <T small muted>Log your body weight in a check-in and your daily protein and calorie targets appear here.</T>
              <Btn label="Weekly check-in" icon="body-outline" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/checkin')} />
            </View>
          ) : (
            <>
              <Meter label="Protein" value={t.protein} target={targets.proteinG} unit="g" good="over" />
              {targets.kcal != null && <Meter label="Calories" value={t.kcal} target={targets.kcal} unit="kcal" good="under" />}
              <Row style={{ gap: 8 }}>
                <MacroBox label="Carbs" value={`${Math.round(t.carbs)} g`} />
                <MacroBox label="Fat" value={`${Math.round(t.fat)} g`} />
                <MacroBox label="Left" value={targets.kcal != null ? `${Math.max(0, Math.round(targets.kcal - t.kcal))}` : '—'} unit="kcal" />
              </Row>
              {targets.estimated && <T small muted>Calories estimated from {weight} kg. You can set your own in Settings.</T>}
            </>
          )}
        </Card>
      </FadeIn>

      <Section title="Meals" bare>
        <Row style={{ gap: 8 }}>
          {MEALS.map((m) => {
            const on = m === meal;
            const kcal = Math.round(totals(mealLogs(m)).kcal);
            return (
              <Pressable key={m} onPress={() => setPicked(m)} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${MEAL_INFO[m].label}, ${kcal} kcal logged`}
                style={({ pressed }) => [st.mealTab, on && st.mealTabOn, pressed && { opacity: 0.75 }]}>
                <Icon name={MEAL_INFO[m].icon} size={18} color={on ? C.accent : C.muted} />
                <Text style={[st.mealLabel, on && { color: C.text }]} numberOfLines={1}>{MEAL_INFO[m].label}</Text>
                <Text style={st.mealSub} numberOfLines={1}>{m === 'snack' ? 'any time' : fmtHM(settings.mealTimes[m])}</Text>
                <Text style={[st.mealKcal, kcal > 0 && { color: on ? C.accent : C.text }]}>{kcal > 0 ? `${kcal}` : '–'}</Text>
              </Pressable>
            );
          })}
        </Row>
      </Section>

      <FadeIn key={meal} dy={6}>
        <Card style={{ gap: 12 }}>
          <Row style={{ alignItems: 'flex-start', gap: 12 }}>
            <IconTile name={MEAL_INFO[meal].icon} color={C.accent} bg={C.accentSoft} />
            <View style={{ flex: 1, gap: 2 }}>
              <H3>{MEAL_INFO[meal].label}{meal !== 'snack' ? <T muted> · {fmtHM(settings.mealTimes[meal])}</T> : null}</H3>
              {targets.proteinG != null && (
                <T small muted>
                  Aim ~{Math.round(targets.proteinG * MEAL_SHARE[meal].protein)} g protein
                  {targets.kcal != null ? ` · ~${Math.round((targets.kcal * MEAL_SHARE[meal].kcal) / 10) * 10} kcal` : ''}
                  {current.kcal > 0 ? ` · so far ${Math.round(current.protein)} g / ${Math.round(current.kcal)} kcal` : ''}
                </T>
              )}
            </View>
          </Row>

          {mealLogs(meal).map((l) => (
            <Row key={l.id} style={[{ paddingVertical: 10, gap: 10 }, st.sep]}>
              <View style={{ flex: 1, gap: 2 }}>
                <T bold>{l.name}</T>
                <Macros f={l} k={l.servings} />
              </View>
              <View style={st.qty}>
                <IconBtn label={`Remove a serving of ${l.name}`} icon="remove" plain size={18} onPress={() => void setFoodLogServings(l, l.servings - 1)} />
                <Text style={st.qtyText}>{l.servings}</Text>
                <IconBtn label={`Add a serving of ${l.name}`} icon="add" plain size={18} onPress={() => void setFoodLogServings(l, l.servings + 1)} />
              </View>
            </Row>
          ))}
          {mealLogs(meal).length === 0 && <T small muted>{MEAL_INFO[meal].tip}</T>}

          {suggestions.length > 0 && (
            <View style={{ gap: 8, paddingTop: 4 }}>
              <Text style={ui.overline}>Good for {MEAL_INFO[meal].label.toLowerCase()} · tap to add</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {suggestions.map((f) => (
                  <Pop key={f.id} trigger={lastAdded?.id === f.id ? lastAdded.n : 0}>
                    <Pressable onPress={() => void add(f)} accessibilityLabel={`Add ${f.name} to ${MEAL_INFO[meal].label}`}
                      style={({ pressed }) => [st.suggest, pressed && { opacity: 0.7 }]}>
                      <Icon name="add" size={14} color={C.accent} />
                      <Text style={st.suggestText} numberOfLines={1}>{f.name}</Text>
                    </Pressable>
                  </Pop>
                ))}
              </View>
            </View>
          )}
        </Card>
      </FadeIn>

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <Pressable onPress={() => setShowGuide((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showGuide }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
          <IconTile name="hand-left-outline" color={C.accent2} bg={C.accent2Soft} />
          <View style={{ flex: 1 }}>
            <T bold>Build every meal like this</T>
            <T small muted>Portion sizes using your hand</T>
          </View>
          <Icon name={showGuide ? 'chevron-up' : 'chevron-down'} size={18} color={C.faint} />
        </Pressable>
        {showGuide && (
          <View style={{ gap: 10, paddingTop: 4, paddingBottom: 14 }}>
            {GUIDE.map(([amount, what]) => (
              <Row key={amount} style={{ alignItems: 'flex-start', gap: 10 }}>
                <View style={st.dot} />
                <T small style={{ flex: 1 }}><T small bold>{amount}</T> <T small muted>{what}</T></T>
              </Row>
            ))}
            <T small muted>3–4 meals like this hits your protein without counting every gram. Log foods below when you want exact numbers.</T>
          </View>
        )}
      </Card>

      <View style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={ui.sectionTitle}>All foods</Text>
          <Pill label={`Adding to ${MEAL_INFO[meal].label.toLowerCase()}`} icon={MEAL_INFO[meal].icon} color={C.accent} bg={C.accentSoft} />
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label="All" on={!filter} onPress={() => setFilter(null)} />
          {FOOD_CATEGORIES.map((c) => <Chip key={c.id} label={c.label} on={filter === c.id} onPress={() => setFilter(filter === c.id ? null : c.id)} />)}
        </ScrollView>

        {grouped.map((g) => (
          <Section key={g.id} title={g.label} style={{ paddingVertical: 4, gap: 0 }}
            right={g.id === 'limit' ? <Pill label="Occasional" icon="alert-circle-outline" color={C.danger} bg={C.dangerSoft} /> : undefined}>
            <T small muted style={{ paddingTop: 10, paddingBottom: 6 }}>{g.blurb}</T>
            {g.items.map((f) => (
              <Row key={f.id} style={[{ paddingVertical: 12, gap: 12 }, st.sep]}>
                <Pressable style={{ flex: 1, gap: 3 }} onPress={() => setEditing(f)} accessibilityRole="button" accessibilityHint="Edit this food">
                  <T bold>{f.name}</T>
                  <T small muted>{f.serving}</T>
                  <Macros f={f} />
                  {f.note ? <T small style={{ color: C.faint, marginTop: 2 }}>{f.note}</T> : null}
                </Pressable>
                <Pop trigger={lastAdded?.id === f.id ? lastAdded.n : 0}>
                  <Pressable onPress={() => void add(f)} accessibilityLabel={`Log a serving of ${f.name} at ${MEAL_INFO[meal].label.toLowerCase()}`}
                    style={({ pressed }) => [st.add, g.id === 'limit' && { backgroundColor: C.surface3 }, pressed && { opacity: 0.7 }]}>
                    <Icon name="add" size={22} color={g.id === 'limit' ? C.muted : C.accent} />
                  </Pressable>
                </Pop>
              </Row>
            ))}
            {g.items.length === 0 && <T small muted style={{ paddingVertical: 12 }}>No foods here yet.</T>}
          </Section>
        ))}
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Btn label="Restore starter foods" icon="refresh" variant="ghost" size="sm" onPress={async () => {
          if (await confirm('Restore starter foods?', 'Starter foods you edited or deleted come back with their original values. Foods you added yourself are kept.', 'Restore')) await resetFoods();
        }} />
        <T small muted style={{ textAlign: 'center', color: C.faint }}>Values are typical per serving. Tap a food to edit it to match your packets.</T>
      </View>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New food' : 'Edit food'}>
        {editing !== null && (
          <FoodEditor key={editing === 'new' ? 'new' : editing.id} food={editing === 'new' ? null : editing}
            defaultCategory={filter ?? 'protein'} nextOrder={foods.length + 1} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </Screen>
  );
}

const SUGGEST_ORDER: FoodCategory[] = ['protein', 'carbs', 'fruit', 'veg', 'fats'];

const GUIDE: [string, string][] = [
  ['1–2 palms of protein', 'chicken, fish, eggs, Greek yogurt, lean mince'],
  ['1 fist of carbs', '2 on training days, ½ on rest days (rice, potatoes, oats)'],
  ['2 fists of veg', 'about half the plate'],
  ['1 thumb of fats', 'olive oil, avocado, nuts'],
];

function Macros(props: { f: Pick<Food, 'protein' | 'carbs' | 'fat' | 'kcal'>; k?: number }) {
  const { f, k = 1 } = props;
  const n = (v: number) => +(v * k).toFixed(1);
  return (
    <Row style={{ gap: 10 }}>
      <Text style={st.macro}><Text style={{ color: C.accent }}>P</Text> {n(f.protein)}g</Text>
      <Text style={st.macro}><Text style={{ color: C.accent2 }}>C</Text> {n(f.carbs)}g</Text>
      <Text style={st.macro}><Text style={{ color: C.warn }}>F</Text> {n(f.fat)}g</Text>
      <Text style={st.macro}>{Math.round(f.kcal * k)} kcal</Text>
    </Row>
  );
}

function MacroBox(props: { label: string; value: string; unit?: string }) {
  return (
    <View style={st.macroBox}>
      <Text style={ui.statLabel}>{props.label}</Text>
      <Text style={st.macroVal}>{props.value}{props.unit ? <Text style={{ fontSize: 12, color: C.muted }}> {props.unit}</Text> : null}</Text>
    </View>
  );
}

function Meter(props: { label: string; value: number; target: number; unit: string; good: 'over' | 'under' }) {
  const { label, value, target, unit, good } = props;
  const pct = Math.min(100, (value / target) * 100);
  const hit = good === 'over' ? value >= target : value <= target;
  const over = good === 'under' && value > target * 1.05;
  const color = over ? C.danger : good === 'over' ? C.accent : C.accent2;
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <T small muted style={{ fontWeight: '600' }}>{label}</T>
        <Text style={st.meterVal}>
          {Math.round(value)}<Text style={st.meterOf}> / {target} {unit}</Text>
          {hit && good === 'over' ? <Text style={{ color: C.accent }}>  ✓</Text> : null}
        </Text>
      </Row>
      <Track height={10}><AnimatedBar pct={pct} color={color} /></Track>
    </View>
  );
}

const st = StyleSheet.create({
  mealTab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: 'transparent' },
  mealTabOn: { backgroundColor: C.surface2, borderColor: C.doneBorder },
  mealLabel: { color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  mealSub: { color: C.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  mealKcal: { color: C.faint, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, minHeight: 34, borderRadius: 999, backgroundColor: C.surface2 },
  suggestText: { color: C.text, fontSize: 13, fontWeight: '600', maxWidth: 170 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  macro: { color: C.muted, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '500' },
  macroBox: { flex: 1, backgroundColor: C.surface2, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  macroVal: { color: C.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meterVal: { color: C.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  meterOf: { color: C.muted, fontSize: 13, fontWeight: '500' },
  qty: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 2 },
  qtyText: { color: C.text, fontWeight: '700', minWidth: 18, textAlign: 'center', fontVariant: ['tabular-nums'] },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent2, marginTop: 7 },
});

function FoodEditor(props: { food: Food | null; defaultCategory: FoodCategory; nextOrder: number; onDone: () => void }) {
  const f = props.food;
  const [name, setName] = useState(f?.name ?? '');
  const [category, setCategory] = useState<FoodCategory>(f?.category ?? props.defaultCategory);
  const [serving, setServing] = useState(f?.serving ?? '');
  const [protein, setProtein] = useState(f ? String(f.protein) : '');
  const [carbs, setCarbs] = useState(f ? String(f.carbs) : '');
  const [fat, setFat] = useState(f ? String(f.fat) : '');
  const [kcal, setKcal] = useState(f ? String(f.kcal) : '');
  const [note, setNote] = useState(f?.note ?? '');
  const [meals, setMeals] = useState<Meal[]>(f ? mealsFor(f, DEFAULT_MEALS) : []);
  const [err, setErr] = useState('');
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? 0 : n; };
  const autoKcal = kcalFromMacros(num(protein), num(carbs), num(fat));

  const save = async () => {
    if (!name.trim()) { setErr('Give the food a name.'); return; }
    if (!serving.trim()) { setErr('Describe the serving, e.g. "150 g cooked" or "1 cup".'); return; }
    await putFood({
      id: f?.id ?? `food-custom-${uid()}`,
      name: name.trim(), category, serving: serving.trim(),
      protein: num(protein), carbs: num(carbs), fat: num(fat),
      kcal: kcal.trim() ? num(kcal) : autoKcal,
      note: note.trim() || undefined,
      meals,
      order: f?.order ?? props.nextOrder,
    });
    props.onDone();
  };

  return (
    <View style={{ gap: 6 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Jollof rice, Protein bar…" />
      <Text style={ui.fieldLabel}>Category</Text>
      <Row wrap>{FOOD_CATEGORIES.map((c) => <Chip key={c.id} label={c.label} on={category === c.id} onPress={() => setCategory(c.id)} />)}</Row>
      <Field label="Serving" value={serving} onChangeText={setServing} placeholder="e.g. 150 g cooked" />
      <Row>
        <View style={{ flex: 1 }}><Field label="Protein (g)" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} /></View>
        <View style={{ flex: 1 }}><Field label="Carbs (g)" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} /></View>
        <View style={{ flex: 1 }}><Field label="Fat (g)" keyboardType="decimal-pad" value={fat} onChangeText={setFat} /></View>
      </Row>
      <Field label={`Calories (blank = ${autoKcal} from macros)`} keyboardType="decimal-pad" value={kcal} onChangeText={setKcal} />
      <Text style={ui.fieldLabel}>Good for</Text>
      <Row wrap>
        {MEALS.map((m) => (
          <Chip key={m} label={MEAL_INFO[m].label} icon={MEAL_INFO[m].icon} on={meals.includes(m)}
            onPress={() => setMeals(meals.includes(m) ? meals.filter((x) => x !== m) : [...meals, m])} />
        ))}
      </Row>
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="When to eat it, where to buy it…" />
      {err ? <T small style={{ color: C.danger }}>{err}</T> : null}
      <Btn label="Save" variant="primary" size="lg" onPress={() => void save()} />
      {f && (
        <Btn label="Delete food" icon="trash-outline" variant="danger" onPress={async () => {
          if (!(await confirm('Delete food?', `Remove ${f.name} from your list? Past logs keep their numbers.`, 'Delete', true))) return;
          await deleteFood(f.id);
          props.onDone();
        }} />
      )}
    </View>
  );
}

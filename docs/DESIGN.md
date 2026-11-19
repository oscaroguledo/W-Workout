# Recomp: design

A gym-first workout tracker for full-body recomposition: building lean muscle while losing midsection fat.

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React Native 0.88 + Expo SDK 58**, TypeScript | One codebase for Android and iPhone. Runs in Expo Go during development and builds to a standalone app with EAS. |
| Navigation | **Expo Router** (file-based, `src/app/`) | Bottom tabs, plus a full-screen workout route and a check-in modal. |
| Storage | **expo-sqlite** (on-device SQLite, WAL mode) | Offline-first: each set is written the moment it's ticked, so it needs no signal. A small change notifier (`useQuery`) refreshes screens after every write. |
| Rest alerts | **expo-notifications** (local, scheduled) + `Vibration` + **expo-haptics** | The alert is scheduled for the moment rest ends, so it fires even with the phone locked in your pocket. |
| Screen on | **expo-keep-awake** | The screen stays on during a workout. |
| Charts | **react-native-svg** | Small line charts with no extra charting library. |
| Tests | **jest-expo** | Covers progression, PR and volume logic, plus integrity of the exercise library. |

**Sync (future):** every record already has a unique id and a timestamp, so rows can be pushed to Supabase or Firebase later. Until then, use **Settings → Export backup**, which goes through the system share sheet to Drive, email or notes.

## 2. Data model

TypeScript types are in `src/types.ts` and the SQL schema is in `src/db/index.ts`. Weights are always stored in **kg** and lengths in **cm**; units are converted only for display.

| Table | Columns | Notes |
|---|---|---|
| `sessions` | id, routine_id, name, started_at, ended_at (NULL = in progress), plan (JSON), notes | |
| `sets` | id, session_id, exercise_id, slot, set_index, weight_kg, reps, seconds, distance_m, completed_at | indexed by session, exercise and time; cardio uses seconds + distance_m |
| `body_logs` | id, date (YYYY-MM-DD), weight_kg, waist_cm, shoulders_cm, notes | |
| `routines` | id, ord, data (JSON: tag, name, focus, items[]) | |
| `custom_exercises` | id, data (JSON Exercise) | built-in exercises live in code: `src/data/exercises.ts` |
| `settings` | id, data (JSON) | includes proteinPerKg, kcalTarget |
| `foods` | id, data (JSON Food: name, category, serving, protein, carbs, fat, kcal, note) | seeded with the starter list, fully editable |
| `food_logs` | id, date, data (JSON FoodLog with macros snapshotted) | editing a food never rewrites history |

- **Exercise:** name, primary and secondary muscles, equipment, kind (reps or time), form cues, alternatives, easier/harder variations, load increment, per side, assisted.
- **PlanItem:** exercise, sets, min/max reps (or seconds), rest seconds, and the original exercise if swapped.
- A session keeps **its own copy of the plan**. Swaps and added exercises affect only that workout, not the routine. The copy also lets an unfinished workout reopen after the app is killed.
- For the assisted pull-up machine, `weight_kg` is the **assistance**, so less is harder.

## 3. Screens

```
(tabs)
├── Today       next routine in the A→B→C rotation · Express (~20 min) · today's plan (meals + workout by time)
│               any other routine · Freestyle · this week's stats · weekly check-in reminder · recomp basics
├── History     past workouts → every set · delete
├── Food        daily protein + calorie targets · Breakfast / Lunch / Dinner / Snacks tabs (defaults to the meal
│               for the time of day) · per-meal aim + log + suggested foods · starter foods by category
│               (protein, carbs, veg, fruit, healthy fats, drinks, limit) · tap + to log · tap to edit · add your own
├── Progress    waist/weight charts · waist-to-height · weekly sets per muscle · PRs → trend chart
├── Plans       routine editor (sets/reps/rest, reorder, rotation order) · exercise library · custom exercises
settings        (gear on Today) units, height, meal times + meal reminders, gym days/time + workout reminder,
                rest default, sound/vibration, test alert, nutrition targets, backup/import, erase
workout/[id]    full-screen logging: exercise strip · Swap · Cues · target · [− kg +][− reps +][✓] rows · rest bar
checkin         modal: date, weight, waist, notes
```

## 4. Programs (`src/data/programs.ts`)

The goal physique is a lean, aesthetic "fitness creator" look: broad shoulders and lats (a V-taper), full upper chest, defined arms, a small waist with visible abs, athletic legs, and regular running. Switch programs in **Plans → Change program**.

**Aesthetic V-Taper** (default, 4-day rotation, weekly cardio target 120 min)
- **A · Chest & Back Width:** incline DB press, lat pulldown, bench press, cable row, low-to-high cable fly, straight-arm pulldown, lateral raise
- **B · Legs & Abs:** hack squat, RDL, walking lunge, leg curl, leg extension, seated calf raise, hanging leg raise, cable crunch
- **C · Shoulders & Arms:** DB shoulder press, assisted pull-up, cable lateral raise ×4, reverse pec deck, incline curl, overhead cable extension, hammer curl, pushdown
- **D · Kettlebell Conditioning & Run:** KB swing, KB goblet squat, half-kneeling KB press, KB row, farmer carry, ab wheel, treadmill run
- **Weekly set targets:** shoulders 16, back 14, chest 12, core 12, arms 10 each, quads 10, hamstrings/glutes 8, calves 6

**Recomp Basics:** 3-day Upper / Lower / Full body, for busy weeks.

**Kettlebell & Conditioning:** 2-day, kettlebells plus cardio only, for packed gyms or training at home.

Each program sets per-muscle weekly targets (the white line on the Progress bars) and a weekly cardio target. Switching programs replaces routines but keeps history and PRs.

**Equipment covered:** barbell, dumbbell, kettlebell, cable, Smith machine, plate-loaded and selectorised machines, bodyweight, bands, and cardio machines (treadmill, rower, air/spin bike, stair climber) plus outdoor runs. That's 76 exercises, each with swaps, form cues and an animated demo.

**Physique tracking:** the weekly check-in includes shoulder circumference. The **shoulder ÷ waist** ratio (V-taper, target ~1.6) and waist-to-height are charted alongside weight and waist.

## 5. Progressive overload (`src/lib/progression.ts`)

The app uses double progression inside each exercise's rep range:

- If **every** working set hit the top of the range, add load and drop back to the bottom of the range.
- If you're inside the range, keep the same load and aim for **+1 rep**.
- If you were below the bottom of the range once, repeat the load. If that happens **twice in a row**, drop it by about 10%.
- For bodyweight moves with no added load, reaching the top of the range suggests the next harder variation.

## 6. Animations

**3D exercise demos** (`src/lib/demo/poses.ts` → `render3d.ts` → `src/components/ExerciseDemo.tsx`)
- Every exercise has a 3D animated mannequin (shirt, shorts, skin, shoes) doing one rep, with 3D equipment: benches and boxes as solids, barbells across both hands with plates, dumbbells, kettlebells, cable stations, pull-up and dip bars, treadmill, rower, bike.
- **How it works:** movements are authored as two side-view keyframes (hip, torso angle, hand/foot targets) and solved with 2-link IK. The skeleton is then lifted into 3D (left/right limbs at ±z), projected with perspective, depth-sorted (painter's algorithm) and shaded by depth, with a floor grid and contact shadow. No 3D engine is needed: it renders through react-native-svg.
- The camera slowly orbits ±22°, and the user can **drag sideways to rotate** the view. Lists show still 3D thumbnails.
- Reduce Motion stops the orbit and the rep motion.
- Tests check that every exercise renders from several angles with valid, on-screen shapes and correct draw order, and that 2D limb lengths and planted feet stay correct.

**UI animations** (`src/components/anim.tsx`, core `Animated` with the native driver)
- Ticking a set makes the check button pop, and the row fades to green.
- The rest timer slides up, shows a progress ring, and pulses at "GO!".
- A new PR fires a confetti burst and a toast that slides down from the top.
- Bottom sheets spring up over a fading backdrop.
- Buttons press-scale when tapped.
- Today's cards fade in one after another.
- Weekly volume bars grow into place.
- Switching exercises slides the new one in.

## 7. Nutrition (`src/data/foods.ts`, `src/lib/nutrition.ts`)

- **Protein target:** bodyweight × 1.6–2.2 g/kg (default 2.0, set in Settings).
- **Calorie target:** an estimate of maintenance (bodyweight × 31) minus 400, or a manual number. Adjust it based on the waist trend.
- **Starter list:** ~50 recomp-friendly foods with typical per-serving macros, all editable. "Restore starter foods" brings back the defaults and keeps foods you added.
- **Meals:** breakfast, lunch and dinner have times (default 08:00 / 13:00 / 19:00); snacks are any time. The Food tab opens on the meal that fits the clock, logs into it, and suggests foods that suit it (protein first). Each meal aims for ~30% of the day's protein (snacks 10%) and 25/30/35% of calories.
- **Reminders (`src/lib/reminders.ts`):** repeating local notifications with fixed ids, one daily per meal and one weekly per training day, `n` minutes before (Off/15/30/60). They are re-synced when settings change and on launch, so editing a time replaces the schedule instead of duplicating it. Tapping one opens Food or Today.
- **Logging:** each logged serving stores its own macros, so later edits to a food don't change your history. Today's "What speeds it up" card shows live protein and calories for the day.

import type { Exercise } from '../types';

// Built-in library, gym-equipment first. Every movement links to other-machine
// and bodyweight alternatives so a busy machine never stalls the session.
// Equipment chosen to match what a typical budget gym floor has: dumbbells,
// cable stacks, Smith machine, leg press, pulldown/row stations, dip/pull-up tower.

export const EXERCISES: Exercise[] = [
  // ---------- PUSH ----------
  {
    id: 'incline-db-press', name: 'Incline Dumbbell Press', primary: ['chest'], secondary: ['shoulders', 'triceps'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Bench at 30°, not steeper', 'Shoulder blades pinned back and down', 'Lower to upper chest, elbows ~45° from body', 'Press up and slightly in'],
    alternatives: ['incline-smith-press', 'flat-db-press', 'machine-chest-press', 'decline-push-up', 'push-up'],
  },
  {
    id: 'incline-smith-press', name: 'Incline Smith Press', primary: ['chest'], secondary: ['shoulders', 'triceps'],
    equipment: 'smith', kind: 'reps', incrementKg: 2.5,
    cues: ['Bar path to upper chest', 'Feet planted, slight arch', 'Control 2–3s down'],
    alternatives: ['incline-db-press', 'machine-chest-press', 'decline-push-up'],
  },
  {
    id: 'machine-chest-press', name: 'Machine Chest Press', primary: ['chest'], secondary: ['shoulders', 'triceps'],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Handles at mid-chest height', 'Keep shoulders down, chest up', "Don't lock out hard"],
    alternatives: ['incline-db-press', 'pec-deck', 'push-up'],
  },
  {
    id: 'incline-push-up', name: 'Incline Push-up (hands on bench)', primary: ['chest'], secondary: ['triceps', 'shoulders', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, harder: 'push-up',
    cues: ['Body in one straight line', 'Squeeze glutes, brace abs', 'Chest touches bench edge'],
    alternatives: ['push-up', 'machine-chest-press'],
  },
  {
    id: 'push-up', name: 'Push-up', primary: ['chest'], secondary: ['triceps', 'shoulders', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, easier: 'incline-push-up', harder: 'decline-push-up',
    cues: ['Hands just outside shoulders', 'Elbows ~45°, not flared', 'Chest to floor, full lockout', 'Ribs down — no sagging hips'],
    alternatives: ['incline-db-press', 'machine-chest-press'],
  },
  {
    id: 'decline-push-up', name: 'Decline Push-up (feet elevated)', primary: ['chest'], secondary: ['shoulders', 'triceps', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, easier: 'push-up', harder: 'pike-push-up',
    cues: ['Feet on bench — hits upper chest like an incline press', 'Keep hips level', 'Full range'],
    alternatives: ['incline-db-press', 'incline-smith-press'],
  },
  {
    id: 'pike-push-up', name: 'Pike Push-up', primary: ['shoulders'], secondary: ['triceps', 'chest'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, harder: 'elevated-pike-push-up',
    cues: ['Hips high — make an upside-down V', 'Head travels forward of hands (tripod)', 'Elbows track back, not out'],
    alternatives: ['db-shoulder-press', 'elevated-pike-push-up'],
  },
  {
    id: 'elevated-pike-push-up', name: 'Feet-Elevated Pike Push-up', primary: ['shoulders'], secondary: ['triceps'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, easier: 'pike-push-up',
    cues: ['Feet on bench, hips stacked over shoulders', 'Lower head to just in front of hands', 'Push the floor away'],
    alternatives: ['db-shoulder-press', 'pike-push-up'],
  },
  {
    id: 'db-shoulder-press', name: 'Seated Dumbbell Shoulder Press', primary: ['shoulders'], secondary: ['triceps'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Bench upright, back supported', 'Dumbbells start at ear height', 'Press up, slightly in — no back arch'],
    alternatives: ['machine-shoulder-press', 'kb-press', 'pike-push-up', 'elevated-pike-push-up'],
  },
  {
    id: 'machine-shoulder-press', name: 'Machine Shoulder Press', primary: ['shoulders'], secondary: ['triceps'],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Handles just below chin height at the start', 'Back flat against the pad', 'Press up without shrugging'],
    alternatives: ['db-shoulder-press', 'pike-push-up'],
  },
  {
    id: 'pec-deck', name: 'Pec Deck / Machine Fly', primary: ['chest'], secondary: [],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Slight bend in elbows, fixed', 'Squeeze handles together at chest height', 'Slow stretch back — stop before shoulders roll forward'],
    alternatives: ['cable-fly', 'machine-chest-press', 'push-up'],
  },
  {
    id: 'lateral-raise', name: 'Dumbbell Lateral Raise', primary: ['shoulders'], secondary: [],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1,
    cues: ['Light weight, strict form', 'Lead with elbows, slight bend', 'Stop at shoulder height', '2s down'],
    alternatives: ['cable-lateral-raise'],
  },
  {
    id: 'cable-lateral-raise', name: 'Cable Lateral Raise', primary: ['shoulders'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Cable at lowest setting, handle crosses in front of body', 'Raise out to the side to shoulder height'],
    alternatives: ['lateral-raise'],
  },
  {
    id: 'dip', name: 'Parallel Bar Dip', primary: ['triceps'], secondary: ['chest', 'shoulders'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 2.5, easier: 'bench-dip',
    cues: ['Shoulders down away from ears', 'Lean slightly forward', 'Lower until upper arm ≈ parallel', 'Stop if shoulders pinch'],
    alternatives: ['cable-pushdown', 'bench-dip', 'close-grip-push-up'],
  },
  {
    id: 'bench-dip', name: 'Bench Dip', primary: ['triceps'], secondary: ['chest'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, harder: 'dip',
    cues: ['Hands on bench edge, fingers forward', 'Keep hips close to bench', 'Elbows point straight back'],
    alternatives: ['cable-pushdown', 'close-grip-push-up'],
  },
  {
    id: 'close-grip-push-up', name: 'Close-Grip Push-up', primary: ['triceps'], secondary: ['chest', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0,
    cues: ['Hands under shoulders', 'Elbows brush ribs', 'Full lockout'],
    alternatives: ['cable-pushdown', 'dip'],
  },
  {
    id: 'cable-pushdown', name: 'Cable Triceps Pushdown', primary: ['triceps'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Elbows pinned to sides', 'Only forearms move', 'Squeeze at the bottom'],
    alternatives: ['overhead-cable-extension', 'dip', 'close-grip-push-up', 'bench-dip'],
  },

  // ---------- PULL ----------
  {
    id: 'lat-pulldown', name: 'Lat Pulldown', primary: ['back'], secondary: ['biceps'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Grip just outside shoulders', 'Chest up, slight lean back', 'Pull elbows down to ribs', 'Control the bar up'],
    alternatives: ['assisted-pull-up', 'negative-pull-up', 'inverted-row'],
  },
  {
    id: 'negative-pull-up', name: 'Pull-up Negatives', primary: ['back'], secondary: ['biceps'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, harder: 'pull-up',
    cues: ['Jump or step to the top position', 'Lower for 3–5 seconds', 'Shoulders stay down'],
    alternatives: ['lat-pulldown', 'assisted-pull-up'],
  },
  {
    id: 'assisted-pull-up', name: 'Assisted Pull-up (machine/band)', primary: ['back'], secondary: ['biceps'],
    equipment: 'machine', kind: 'reps', incrementKg: 5, harder: 'pull-up', assisted: true,
    cues: ['Weight here = assistance: LESS is harder', 'Full hang to chin over bar', 'Lead with the chest'],
    alternatives: ['lat-pulldown', 'negative-pull-up'],
  },
  {
    id: 'pull-up', name: 'Pull-up', primary: ['back'], secondary: ['biceps', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 2.5, easier: 'negative-pull-up',
    cues: ['Dead hang start, shoulders engaged', 'Chin over bar, no kipping', 'Control down'],
    alternatives: ['lat-pulldown', 'assisted-pull-up'],
  },
  {
    id: 'seated-cable-row', name: 'Seated Cable Row', primary: ['back'], secondary: ['biceps'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Tall torso — no rocking', 'Pull to belly button', 'Squeeze shoulder blades together', 'Let shoulders stretch forward on return'],
    alternatives: ['machine-row', 'one-arm-db-row', 'inverted-row'],
  },
  {
    id: 'machine-row', name: 'Chest-Supported Machine Row', primary: ['back'], secondary: ['biceps'],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Chest stays on the pad', 'Drive elbows back', 'Pause 1s with shoulder blades squeezed'],
    alternatives: ['seated-cable-row', 'one-arm-db-row', 'inverted-row'],
  },
  {
    id: 'one-arm-db-row', name: 'One-Arm Dumbbell Row', primary: ['back'], secondary: ['biceps'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Knee and hand on bench, flat back', 'Pull dumbbell to hip', "Don't twist the torso"],
    alternatives: ['seated-cable-row', 'kb-row', 'inverted-row'],
  },
  {
    id: 'inverted-row', name: 'Inverted Row (Smith bar)', primary: ['back'], secondary: ['biceps', 'core'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0,
    cues: ['Set Smith bar at hip height', 'Body straight like a plank', 'Pull chest to bar', 'Lower bar = harder'],
    alternatives: ['seated-cable-row', 'one-arm-db-row'],
  },
  {
    id: 'face-pull', name: 'Cable Face Pull', primary: ['shoulders'], secondary: ['back'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Rope at forehead height', 'Pull to face, elbows high', 'Rotate hands back at the end'],
    alternatives: ['rear-delt-fly', 'inverted-row'],
  },
  {
    id: 'db-curl', name: 'Dumbbell Curl', primary: ['biceps'], secondary: [],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1,
    cues: ['Elbows stay at sides', 'No swinging', 'Slow 2s lowering'],
    alternatives: ['cable-curl', 'hammer-curl', 'ez-bar-curl'],
  },
  {
    id: 'cable-curl', name: 'Cable Curl', primary: ['biceps'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Elbows fixed', 'Squeeze at the top'],
    alternatives: ['db-curl'],
  },

  // ---------- LEGS ----------
  {
    id: 'smith-squat', name: 'Smith Machine Squat', primary: ['quads'], secondary: ['glutes', 'core'],
    equipment: 'smith', kind: 'reps', incrementKg: 2.5,
    cues: ['Feet slightly in front of the bar', 'Brace like you are about to be punched', 'Hips and knees bend together', 'Thighs to parallel or below'],
    alternatives: ['barbell-squat', 'leg-press', 'goblet-squat'],
  },
  {
    id: 'barbell-squat', name: 'Barbell Back Squat', primary: ['quads'], secondary: ['glutes', 'core'],
    equipment: 'barbell', kind: 'reps', incrementKg: 2.5,
    cues: ['Bar on upper traps', 'Big breath, brace', 'Knees track over toes', 'Drive up through mid-foot'],
    alternatives: ['smith-squat', 'leg-press', 'goblet-squat'],
  },
  {
    id: 'leg-press', name: 'Leg Press', primary: ['quads'], secondary: ['glutes'],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Feet shoulder-width, mid-platform', 'Lower until knees ~90°', "Lower back stays on pad", "Don't lock knees"],
    alternatives: ['smith-squat', 'goblet-squat', 'bulgarian-split-squat'],
  },
  {
    id: 'leg-extension', name: 'Leg Extension', primary: ['quads'], secondary: [],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Knee lined up with the machine pivot', 'Kick up and squeeze 1s', 'Lower slowly'],
    alternatives: ['leg-press', 'bulgarian-split-squat', 'bodyweight-squat'],
  },
  {
    id: 'goblet-squat', name: 'Goblet Squat', primary: ['quads'], secondary: ['glutes', 'core'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Hold dumbbell at chest', 'Elbows inside knees at bottom', 'Chest tall'],
    alternatives: ['kb-goblet-squat', 'leg-press', 'bodyweight-squat'],
  },
  {
    id: 'bodyweight-squat', name: 'Tempo Bodyweight Squat', primary: ['quads'], secondary: ['glutes'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, harder: 'bulgarian-split-squat',
    cues: ['3s down, 1s pause, drive up', 'Full depth'],
    alternatives: ['goblet-squat'],
  },
  {
    id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', primary: ['quads'], secondary: ['glutes'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Rear foot laces-down on bench', 'Front foot far enough that the knee stays over mid-foot', 'Drop straight down', 'Weight = per hand; 0 = bodyweight'],
    alternatives: ['reverse-lunge', 'leg-press'],
  },
  {
    id: 'reverse-lunge', name: 'Reverse Lunge', primary: ['quads'], secondary: ['glutes'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Step back, drop back knee toward floor', 'Front shin near vertical', 'Push through front heel'],
    alternatives: ['bulgarian-split-squat', 'goblet-squat'],
  },
  {
    id: 'romanian-deadlift', name: 'Romanian Deadlift (DB/Barbell)', primary: ['hamstrings'], secondary: ['glutes', 'back'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Soft knees, push hips back', 'Weights slide down the thighs', 'Flat back — stop at hamstring stretch', 'Squeeze glutes to stand'],
    alternatives: ['leg-curl', 'single-leg-rdl', 'hip-thrust'],
  },
  {
    id: 'single-leg-rdl', name: 'Single-Leg RDL', primary: ['hamstrings'], secondary: ['glutes', 'core'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Hips square to floor', 'Reach back with free leg', 'Light touch on rack for balance is fine'],
    alternatives: ['romanian-deadlift'],
  },
  {
    id: 'leg-curl', name: 'Leg Curl (machine)', primary: ['hamstrings'], secondary: [],
    equipment: 'machine', kind: 'reps', incrementKg: 2.5,
    cues: ['Knee aligned with machine pivot', 'Hips stay down', 'Slow on the way back'],
    alternatives: ['romanian-deadlift', 'single-leg-rdl'],
  },
  {
    id: 'hip-thrust', name: 'Hip Thrust (Smith/Barbell)', primary: ['glutes'], secondary: ['hamstrings'],
    equipment: 'smith', kind: 'reps', incrementKg: 5,
    cues: ['Upper back on bench edge', 'Chin tucked, ribs down', 'Shins vertical at the top', 'Pause & squeeze 1s'],
    alternatives: ['glute-bridge', 'romanian-deadlift'],
  },
  {
    id: 'glute-bridge', name: 'Single-Leg Glute Bridge', primary: ['glutes'], secondary: ['hamstrings'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, perSide: true, harder: 'hip-thrust',
    cues: ['Drive through heel', 'Hips level at the top', 'Pause 2s'],
    alternatives: ['hip-thrust'],
  },
  {
    id: 'calf-raise', name: 'Standing Calf Raise', primary: ['calves'], secondary: [],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Full stretch at the bottom, pause', 'Up onto big toe', '1s squeeze at top'],
    alternatives: ['single-leg-calf-raise'],
  },
  {
    id: 'single-leg-calf-raise', name: 'Single-Leg Calf Raise (step)', primary: ['calves'], secondary: [],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Ball of foot on step edge', 'Full range, slow', 'Hold a dumbbell to add load'],
    alternatives: ['calf-raise'],
  },

  // ---------- CORE ----------
  {
    id: 'deadbug', name: 'Deadbug', primary: ['core'], secondary: [],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, perSide: true, harder: 'hollow-hold',
    cues: ['Lower back pressed into floor the WHOLE time', 'Exhale fully as limbs extend', 'Slow — 3s out, 3s back'],
    alternatives: ['plank', 'pallof-press'],
  },
  {
    id: 'hollow-hold', name: 'Hollow Body Hold', primary: ['core'], secondary: [],
    equipment: 'bodyweight', kind: 'time', incrementKg: 0, easier: 'deadbug',
    cues: ['Lower back glued down', 'Arms overhead, legs low — bend knees to make easier', 'Stop the set when the back lifts'],
    alternatives: ['plank', 'deadbug'],
  },
  {
    id: 'plank', name: 'RKC Plank', primary: ['core'], secondary: ['glutes'],
    equipment: 'bodyweight', kind: 'time', incrementKg: 0,
    cues: ['Elbows under shoulders', 'Squeeze glutes and quads hard', 'Pull elbows toward toes', 'Quality > duration'],
    alternatives: ['hollow-hold', 'deadbug'],
  },
  {
    id: 'side-plank', name: 'Side Plank', primary: ['core'], secondary: [],
    equipment: 'bodyweight', kind: 'time', incrementKg: 0, perSide: true,
    cues: ['Elbow under shoulder', 'Hips high, body straight', 'Breathe'],
    alternatives: ['pallof-press'],
  },
  {
    id: 'hanging-knee-raise', name: 'Hanging Knee Raise', primary: ['core'], secondary: [],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0,
    cues: ['No swinging', 'Curl the pelvis up — not just knees', 'Use captain\'s chair if grip fails'],
    alternatives: ['cable-crunch', 'deadbug'],
  },
  {
    id: 'cable-crunch', name: 'Cable Crunch', primary: ['core'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Kneel, rope beside head', 'Curl ribs to hips — hips stay still', 'Exhale hard at the bottom'],
    alternatives: ['hanging-knee-raise', 'deadbug'],
  },
  {
    id: 'pallof-press', name: 'Pallof Press', primary: ['core'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5, perSide: true,
    cues: ['Stand side-on to cable at chest height', 'Press out, resist rotation', 'Hold 2s at full extension'],
    alternatives: ['side-plank', 'cable-woodchop', 'deadbug'],
  },
  {
    id: 'cable-woodchop', name: 'Cable Woodchop', primary: ['core'], secondary: ['shoulders'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5, perSide: true,
    cues: ['Rotate through the torso, not the arms', 'Pivot the back foot', 'Control the return'],
    alternatives: ['pallof-press', 'side-plank'],
  },

  // ---------- MORE GYM STAPLES (aesthetic / V-taper focus) ----------
  {
    id: 'barbell-bench-press', name: 'Barbell Bench Press', primary: ['chest'], secondary: ['triceps', 'shoulders'],
    equipment: 'barbell', kind: 'reps', incrementKg: 2.5,
    cues: ['Eyes under the bar, feet planted', 'Squeeze shoulder blades together and down', 'Lower to lower chest, elbows ~45°', 'Use a spotter or safety pins when going heavy'],
    alternatives: ['flat-db-press', 'machine-chest-press', 'push-up'],
  },
  {
    id: 'flat-db-press', name: 'Flat Dumbbell Press', primary: ['chest'], secondary: ['triceps', 'shoulders'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Kick the dumbbells up off your knees', 'Shoulder blades pinned', 'Deep stretch at the bottom, press up and slightly in'],
    alternatives: ['barbell-bench-press', 'machine-chest-press', 'push-up'],
  },
  {
    id: 'cable-fly', name: 'Low-to-High Cable Fly', primary: ['chest'], secondary: ['shoulders'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Pulleys at the lowest setting, step forward', 'Slight bend in elbows, locked', 'Sweep up and in to upper-chest height', 'Squeeze 1s — builds the upper chest "shelf"'],
    alternatives: ['pec-deck', 'incline-db-press'],
  },
  {
    id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', primary: ['back'], secondary: ['core'],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Rope or bar at the top, hinge slightly', 'Arms straight, sweep down to thighs', 'Feel the lats (sides of the back) — key for width'],
    alternatives: ['lat-pulldown', 'kb-row'],
  },
  {
    id: 'rear-delt-fly', name: 'Reverse Pec Deck (Rear Delts)', primary: ['shoulders'], secondary: ['back'],
    equipment: 'machine', kind: 'reps', incrementKg: 2.5,
    cues: ['Face the pad, handles at shoulder height', 'Sweep arms back in a wide arc', 'Lead with the pinkies, don’t shrug', 'Rear delts make the shoulders look round and 3D'],
    alternatives: ['face-pull', 'inverted-row'],
  },
  {
    id: 'incline-db-curl', name: 'Incline Dumbbell Curl', primary: ['biceps'], secondary: [],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1,
    cues: ['Bench at 45–60°, arms hanging behind the body', 'Curl without letting elbows drift forward', 'Big stretch at the bottom'],
    alternatives: ['db-curl', 'cable-curl'],
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', primary: ['biceps'], secondary: [],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1,
    cues: ['Palms facing each other', 'Elbows pinned', 'Builds arm thickness (brachialis + forearm)'],
    alternatives: ['db-curl', 'cable-curl'],
  },
  {
    id: 'ez-bar-curl', name: 'EZ-Bar Curl', primary: ['biceps'], secondary: [],
    equipment: 'barbell', kind: 'reps', incrementKg: 2.5,
    cues: ['Grip the angled part of the bar', 'Elbows stay at your sides', 'No hip swing'],
    alternatives: ['db-curl', 'cable-curl'],
  },
  {
    id: 'overhead-cable-extension', name: 'Overhead Cable Triceps Extension', primary: ['triceps'], secondary: [],
    equipment: 'cable', kind: 'reps', incrementKg: 2.5,
    cues: ['Face away from a low/mid pulley, rope behind head', 'Elbows point forward and stay still', 'Full stretch — hits the long head, the biggest part of the arm'],
    alternatives: ['cable-pushdown', 'dip'],
  },
  {
    id: 'hack-squat', name: 'Hack Squat (machine)', primary: ['quads'], secondary: ['glutes'],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Back flat on the pad, feet mid-platform', 'Knees travel forward over toes', 'Deep as you can with control'],
    alternatives: ['smith-squat', 'leg-press'],
  },
  {
    id: 'walking-lunge', name: 'Walking Lunge', primary: ['quads'], secondary: ['glutes'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2, perSide: true,
    cues: ['Long stride, torso tall', 'Back knee kisses the floor', 'Drive through the front heel into the next step'],
    alternatives: ['reverse-lunge', 'bulgarian-split-squat'],
  },
  {
    id: 'seated-calf-raise', name: 'Seated Calf Raise', primary: ['calves'], secondary: [],
    equipment: 'machine', kind: 'reps', incrementKg: 5,
    cues: ['Pad on lower thighs', 'Full stretch, pause, then up high', 'Slow reps'],
    alternatives: ['calf-raise', 'single-leg-calf-raise'],
  },
  {
    id: 'ab-wheel', name: 'Ab Wheel Rollout', primary: ['core'], secondary: ['back'],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0,
    cues: ['Start on knees, ribs tucked', 'Roll out only as far as you can keep a flat back', 'Pull back with the abs, not the hips'],
    alternatives: ['plank', 'cable-crunch'],
  },
  {
    id: 'hanging-leg-raise', name: 'Hanging Leg Raise', primary: ['core'], secondary: [],
    equipment: 'bodyweight', kind: 'reps', incrementKg: 0, easier: 'hanging-knee-raise',
    cues: ['Dead hang, no swinging', 'Raise legs to hip height or higher', 'Curl the pelvis up at the top'],
    alternatives: ['hanging-knee-raise', 'cable-crunch'],
  },

  // ---------- NECK & TRAPS (frames the jaw and upper body) ----------
  {
    id: 'db-shrug', name: 'Dumbbell Shrug', primary: ['back'], secondary: ['neck'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 2,
    cues: ['Heavy dumbbells at your sides', 'Shrug straight up towards the ears — no rolling', 'Pause 1s at the top', 'Builds the traps: the slope from neck to shoulders'],
    alternatives: ['kb-farmer-carry', 'face-pull'],
  },
  {
    id: 'neck-curl', name: 'Neck Curl (plate)', primary: ['neck'], secondary: [],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1.25,
    cues: ['Lie face-up on a bench, head off the end', 'Hold a light plate on your forehead (with a towel)', 'Tuck chin to chest, slowly lower back', 'Start LIGHT (2.5–5 kg) — slow, controlled, no jerking'],
    alternatives: ['neck-extension'],
  },
  {
    id: 'neck-extension', name: 'Neck Extension (plate)', primary: ['neck'], secondary: ['back'],
    equipment: 'dumbbell', kind: 'reps', incrementKg: 1.25,
    cues: ['Lie face-down on a bench, head off the end', 'Light plate on the back of your head', 'Look up slowly, then lower', 'Stop if you feel any sharp pain'],
    alternatives: ['neck-curl', 'db-shrug'],
  },

  // ---------- KETTLEBELL ----------
  {
    id: 'kb-swing', name: 'Kettlebell Swing', primary: ['glutes'], secondary: ['hamstrings', 'core', 'back'],
    equipment: 'kettlebell', kind: 'reps', incrementKg: 4,
    cues: ['Hike the bell back between your legs like a football', 'Snap the hips forward — arms are just ropes', 'Bell floats to chest height, glutes squeezed', 'Great fat-burner: power + conditioning'],
    alternatives: ['romanian-deadlift', 'hip-thrust'],
  },
  {
    id: 'kb-goblet-squat', name: 'Kettlebell Goblet Squat', primary: ['quads'], secondary: ['glutes', 'core'],
    equipment: 'kettlebell', kind: 'reps', incrementKg: 4,
    cues: ['Hold the bell by the horns at your chest', 'Sit between your heels, chest up', 'Elbows inside the knees at the bottom'],
    alternatives: ['goblet-squat', 'leg-press'],
  },
  {
    id: 'kb-press', name: 'Kettlebell Overhead Press', primary: ['shoulders'], secondary: ['triceps', 'core'],
    equipment: 'kettlebell', kind: 'reps', incrementKg: 4, perSide: true,
    cues: ['Bell in the rack position, wrist straight', 'Squeeze glutes and abs', 'Press up until bicep is by your ear'],
    alternatives: ['db-shoulder-press', 'machine-shoulder-press'],
  },
  {
    id: 'kb-row', name: 'Kettlebell Row', primary: ['back'], secondary: ['biceps'],
    equipment: 'kettlebell', kind: 'reps', incrementKg: 4, perSide: true,
    cues: ['Staggered stance, hand on bench', 'Flat back', 'Row the bell to your hip pocket'],
    alternatives: ['one-arm-db-row', 'seated-cable-row'],
  },
  {
    id: 'kb-farmer-carry', name: 'Kettlebell Farmer Carry', primary: ['core'], secondary: ['back', 'shoulders'],
    equipment: 'kettlebell', kind: 'time', incrementKg: 4,
    cues: ['Heavy bell in each hand', 'Stand tall, shoulders down, abs braced', 'Short quick steps — don’t lean', 'Builds traps, grip and a tight midsection'],
    alternatives: ['plank', 'pallof-press'],
  },

  // ---------- CARDIO / CONDITIONING ----------
  {
    id: 'treadmill-run', name: 'Treadmill Run', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Mostly easy pace — you can still talk', 'Once a week: intervals (1 min hard / 1 min easy)', 'Land under your hips, quick light steps'],
    alternatives: ['outdoor-run', 'incline-walk', 'rowing-machine', 'assault-bike'],
  },
  {
    id: 'outdoor-run', name: 'Outdoor Run', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Easy pace most days', 'Build distance by ~10% per week max', 'Good shoes, relaxed shoulders'],
    alternatives: ['treadmill-run', 'incline-walk'],
  },
  {
    id: 'incline-walk', name: 'Incline Treadmill Walk', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Incline 8–12%, speed 4.5–5.5 km/h', 'Don’t hold the rails', 'Low-impact fat burning that won’t hurt leg recovery'],
    alternatives: ['stair-climber', 'treadmill-run'],
  },
  {
    id: 'rowing-machine', name: 'Rowing Machine', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Legs → body → arms on the drive', 'Arms → body → legs on the way back', 'Damper 4–6 is plenty'],
    alternatives: ['assault-bike', 'treadmill-run'],
  },
  {
    id: 'assault-bike', name: 'Air / Spin Bike', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Seat at hip height, slight knee bend at the bottom', 'Great for intervals: 20s all-out / 40s easy', 'Push AND pull the handles on an air bike'],
    alternatives: ['rowing-machine', 'incline-walk'],
  },
  {
    id: 'stair-climber', name: 'Stair Climber', primary: [], secondary: [],
    equipment: 'cardio', kind: 'cardio', incrementKg: 0,
    cues: ['Stand tall, light touch on the rails', 'Steady pace you can hold', 'Glutes work hard here'],
    alternatives: ['incline-walk', 'assault-bike'],
  },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

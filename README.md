# W-Workout: "Recomp"

A React Native (Expo) gym tracker for body recomposition: build muscle and lose the belly. It is gym-equipment first (dumbbells, cables, Smith machine, leg press, pulldown/row machines), with bodyweight swaps for when a machine is taken.

- Fast set logging with big buttons, with a progressive-overload target on every exercise
- Swap any exercise to an alternative when the equipment is busy
- Rest timer (60/90/120s, ±15s) that alerts you with sound and vibration even when the phone is locked
- PRs, history, weekly sets per muscle, and weekly weight and waist check-ins with charts
- Breakfast, lunch and dinner at your own times, with foods suggested for each meal and a protein/calorie aim per meal
- Reminders before each meal and before training on your gym days (Settings → Meal times / Workout schedule)
- 100% offline: data lives in SQLite on your phone

See [docs/DESIGN.md](docs/DESIGN.md) for the stack, data model and screens.

## Run it on your phone (easiest: Expo Go)

1. Install **Expo Go** from the App Store or Google Play. It must support **SDK 58**; update it if it says the project is incompatible.
2. On your computer:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code. On Android, use the Expo Go app. On iPhone, use the Camera app. Your phone and computer must be on the same Wi-Fi. If they aren't, run `npx expo start --tunnel`.
4. To get reminders, open **Today → ⚙ Settings**, set your meal times and gym days, pick how early to be reminded, and allow notifications when asked. Meal and workout reminders are local notifications, so they work in Expo Go and fire even when the app is closed.

## Install it as a real app (no computer needed at the gym)

Expo Go needs your computer running. To get a standalone app on your phone:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # gives you an .apk to install directly
```

iPhone builds need an Apple Developer account ($99/yr) and `-p ios`.

## Dev commands

```bash
npm test            # progression / PR / volume unit tests (jest-expo)
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npx expo-doctor     # dependency / config sanity check
```

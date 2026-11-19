import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import type { MainMeal, Settings } from '../types';
import { ensurePermission, REMINDER_CHANNEL } from './alerts';
import { before, fmtHM, MEAL_INFO } from './meals';

// Repeating local reminders: one daily notification per meal and one weekly
// notification per training day. They use fixed identifiers, so re-syncing
// replaces the old schedule instead of piling up duplicates.

const MAIN: MainMeal[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_EMOJI: Record<MainMeal, string> = { breakfast: '🍳', lunch: '🥗', dinner: '🍽️' };
const ids = [...MAIN.map((m) => `meal-${m}`), ...[0, 1, 2, 3, 4, 5, 6].map((d) => `workout-${d}`)];

export type SyncResult = 'ok' | 'off' | 'denied' | 'unsupported';

export async function syncReminders(s: Settings, opts: { ask: boolean }): Promise<SyncResult> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
    const wantMeals = s.mealReminderMin > 0;
    const wantWorkout = s.workoutReminderMin > 0 && s.workoutDays.length > 0;
    if (!wantMeals && !wantWorkout) return 'off';
    if (!(await ensurePermission(opts.ask))) return 'denied';

    if (wantMeals) {
      for (const m of MAIN) {
        const at = before(s.mealTimes[m], s.mealReminderMin);
        await Notifications.scheduleNotificationAsync({
          identifier: `meal-${m}`,
          content: {
            title: `${MEAL_INFO[m].label} in ${s.mealReminderMin} min ${MEAL_EMOJI[m]}`,
            body: `${MEAL_INFO[m].label} at ${fmtHM(s.mealTimes[m])}. ${MEAL_INFO[m].tip}`,
            sound: 'default',
            data: { url: '/food' },
          },
          trigger: { type: SchedulableTriggerInputTypes.DAILY, hour: at.hour, minute: at.minute, channelId: REMINDER_CHANNEL },
        });
      }
    }
    if (wantWorkout) {
      for (const day of s.workoutDays) {
        const at = before(s.workoutTime, s.workoutReminderMin, day);
        await Notifications.scheduleNotificationAsync({
          identifier: `workout-${day}`,
          content: {
            title: `Workout in ${s.workoutReminderMin} min 💪`,
            body: `Training at ${fmtHM(s.workoutTime)}. Have a light snack (banana or rice cakes), fill your water bottle and head to the gym.`,
            sound: 'default',
            data: { url: '/' },
          },
          // Expo weekdays: 1 = Sunday … 7 = Saturday.
          trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: at.day + 1, hour: at.hour, minute: at.minute, channelId: REMINDER_CHANNEL },
        });
      }
    }
    return 'ok';
  } catch (e) {
    console.warn('Could not schedule reminders', e);
    return 'unsupported';
  }
}

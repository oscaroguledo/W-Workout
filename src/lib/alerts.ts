import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

// Rest-timer alerts. A local notification is scheduled for the moment rest ends,
// so it fires (with sound + vibration) even if the phone is locked in your pocket
// or the app is in the background. In the foreground we also buzz directly.

const CHANNEL = 'rest-timer';
export const REMINDER_CHANNEL = 'reminders';

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rest timer',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 150, 400],
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Meal & workout reminders',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

let asked = false;
/** Notification permission; asks once per launch unless `ask` is false. */
export async function ensurePermission(ask = true) {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted || asked || !ask) return cur.granted;
  asked = true;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return res.granted;
}

let scheduledId: string | null = null;

export async function scheduleRestEnd(seconds: number, sound: boolean) {
  await cancelRestEnd();
  if (seconds < 1) return;
  try {
    if (!(await ensurePermission())) return;
    scheduledId = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over 💪', body: 'Time for your next set.', sound: sound ? 'default' : false },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        channelId: CHANNEL,
      },
    });
  } catch (e) {
    console.warn('Could not schedule rest notification', e);
  }
}

export async function cancelRestEnd() {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already fired */ }
}

export function restDoneBuzz(vibrate: boolean) {
  if (!vibrate) return;
  Vibration.vibrate(Platform.OS === 'android' ? [0, 400, 150, 400] : 400);
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export const tapFeedback = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
export const setDoneFeedback = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

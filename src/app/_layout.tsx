import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getSettings, migrate } from '@/db';
import { setupNotifications } from '@/lib/alerts';
import { syncReminders } from '@/lib/reminders';
import { C } from '@/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    migrate()
      .then(() => setReady(true))
      // Re-apply meal/workout reminders (without prompting) in case times changed elsewhere.
      .then(async () => { await setupNotifications(); await syncReminders(await getSettings(), { ask: false }); })
      .catch((e) => setError(String(e)));
  }, []);

  // Tapping a meal or workout reminder opens the matching screen.
  useEffect(() => {
    if (!ready) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as '/');
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!ready ? (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {error ? <Text style={{ color: C.danger }}>Database error: {error}</Text> : <ActivityIndicator color={C.accent} />}
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout/[id]" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}

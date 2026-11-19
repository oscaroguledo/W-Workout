import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
function icon(name: IconName, active: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : name} color={String(color)} size={23} />;
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.text,
      tabBarInactiveTintColor: C.faint,
      tabBarStyle: {
        backgroundColor: C.surface, borderTopColor: C.border, borderTopWidth: StyleSheet.hairlineWidth,
        height: 66 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', lineHeight: 14, marginTop: 2 },
      sceneStyle: { backgroundColor: C.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('restaurant-outline', 'restaurant') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans', tabBarIcon: icon('layers-outline', 'layers') }} />
    </Tabs>
  );
}

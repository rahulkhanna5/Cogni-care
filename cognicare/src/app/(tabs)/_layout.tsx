import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
          paddingBottom: 24,
        },
        // Labels stay visible and large — icon-only tab bars are guesswork
        // for users who are new to smartphones.
        tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assess"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}

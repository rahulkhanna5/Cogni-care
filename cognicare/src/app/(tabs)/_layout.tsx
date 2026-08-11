import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useAuth } from '@/store/auth';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const role = useAuth((s) => s.user?.role);
  const isDoctor = role === 'DOCTOR';
  const isAdmin = role === 'ADMIN';
  const isPatientLike = !isDoctor && !isAdmin;

  /**
   * The tab bar changes shape by role. A doctor has no exercises to play and
   * no check-in to fill in, so showing those tabs would offer them screens
   * that are meaningless for their account.
   *
   * `href: null` removes a tab from the bar without unregistering the route,
   * so it stays reachable programmatically and cannot 404.
   */
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
        name="admin"
        options={{
          title: 'Review',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Ionicons name="shield-checkmark-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          href: isDoctor ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Today',
          href: isPatientLike ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          href: isPatientLike ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assess"
        options={{
          title: 'Check-in',
          href: isPatientLike ? undefined : null,
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

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Text as RNText, View } from 'react-native';

import { useAuth } from '@/store/auth';
import { colors, fonts } from '@/theme/tokens';
import type { IconName } from '@/ui';

/**
 * Active tab: a coral pill behind the icon plus a coral semibold label.
 * Inactive: a muted regular label. The pill is a shape, so the active tab is
 * never told apart by colour alone.
 */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View
      style={{
        width: 64,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.selected : 'transparent',
      }}
    >
      <Ionicons name={name} size={26} color={focused ? colors.accent : colors.textMuted} />
    </View>
  );
}

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
  const icon = (name: IconName) =>
    function Icon({ focused }: { focused: boolean }) {
      return <TabIcon name={name} focused={focused} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.divider,
          height: 92,
          paddingTop: 10,
          paddingBottom: 24,
        },
        // Labels stay visible and large — icon-only tab bars are guesswork
        // for users who are new to smartphones.
        tabBarLabelStyle: { fontSize: 15, marginTop: 4 },
        tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
      }}
    >
      <Tabs.Screen
        name="admin"
        options={{ title: 'Review', href: isAdmin ? undefined : null, tabBarIcon: icon('shield-checkmark-outline') }}
      />
      <Tabs.Screen
        name="patients"
        options={{ title: 'Patients', href: isDoctor ? undefined : null, tabBarIcon: icon('people-outline') }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Today', href: isPatientLike ? undefined : null, tabBarIcon: icon('home-outline') }}
      />
      <Tabs.Screen
        name="games"
        options={{ title: 'Games', href: isPatientLike ? undefined : null, tabBarIcon: icon('grid-outline') }}
      />
      <Tabs.Screen
        name="assess"
        options={{ title: 'Check-in', href: isPatientLike ? undefined : null, tabBarIcon: icon('clipboard-outline') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}

function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  // A plain RN Text (not the app's) because the tab bar is its own surface
  // with its own measured pair: muted 9.6:1 and coral 7.4:1 on #262322.
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      style={{
        fontSize: 15,
        lineHeight: 20,
        marginTop: 2,
        fontFamily: focused ? fonts.semibold : fonts.regular,
        color: focused ? colors.accent : colors.textMuted,
      }}
    >
      {children}
    </RNText>
  );
}

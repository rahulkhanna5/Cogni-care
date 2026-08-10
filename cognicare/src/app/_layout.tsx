import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrate } from '@/db/migrations';
import { colors } from '@/theme/tokens';

function Booting() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<Booting />}>
          <SQLiteProvider databaseName="cognicare.db" onInit={migrate} useSuspense>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

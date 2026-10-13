import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_600SemiBold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { SQLiteProvider } from 'expo-sqlite';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseGate } from '@/db/DatabaseGate';
import { LanguageLoader } from '@/i18n';
import { ThemeLoader, useThemeMode } from '@/theme/mode';
import { migrate } from '@/db/migrations';
import { colors, PALETTES, type Palette } from '@/theme/tokens';

const navTheme = (c: Palette) => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: c.accent,
    background: c.bg,
    card: c.surface,
    text: c.text,
    border: c.divider,
  },
});

function Booting() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export default function RootLayout() {
  const mode = useThemeMode((s) => s.mode);
  // Load before anything renders: text laid out in the fallback face and then
  // swapped jumps and rewraps, which is disorienting for this audience.
  // A failed load still lets the app start in the system face.
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_600SemiBold,
  });

  if (!fontsLoaded && !fontError) return <Booting />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseGate>
          {(attempt) => (
            <Suspense fallback={<Booting />}>
              <SQLiteProvider key={attempt} databaseName="cognicare.db" onInit={migrate} useSuspense>
                <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
                <LanguageLoader />
                <ThemeLoader />
                {/* Without this the navigator paints its own default grey behind every
                    screen, which showed during transitions and overscroll. */}
                {/* From `PALETTES[mode]`, not the live `colors`: the compiler can see
                    `mode` change, but not a value inside a module object. */}
                <ThemeProvider value={navTheme(PALETTES[mode])}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: PALETTES[mode].bg },
                    }}
                  />
                </ThemeProvider>
              </SQLiteProvider>
            </Suspense>
          )}
        </DatabaseGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

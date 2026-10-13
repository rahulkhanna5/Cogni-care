import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LANGUAGES, useLanguage, useSetLanguage, useT, type Lang } from '@/i18n';
import { useSetThemeMode, useThemeMode } from '@/theme/mode';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Logo, SurfaceProvider, Text } from '@/ui';

const SHORT: Record<Lang, string> = { en: 'EN', hi: 'हि', pa: 'ਪੰ' };

/**
 * The bar across the top of the main screens: the app's name, and two large
 * buttons — language and light/dark. Both are words as well as icons, at least
 * 56dp, because the people using them are often new to phones.
 */
export function TopBar({ inset = true }: { inset?: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const lang = useLanguage((s) => s.lang);
  const mode = useThemeMode((s) => s.mode);
  const setMode = useSetThemeMode();
  const [picking, setPicking] = useState(false);

  return (
    <SurfaceProvider value="tabBar">
      <View
        style={{
          paddingTop: (inset ? insets.top : 0) + space.sm,
          paddingBottom: space.sm,
          paddingHorizontal: space.gutter,
          backgroundColor: colors.tabBar,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
        }}
      >
        <Logo size={36} />
        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
          CogniCare
        </Text>

        <BarButton
          label={t('bar.language')}
          icon="language-outline"
          text={SHORT[lang]}
          onPress={() => setPicking(true)}
        />
        <BarButton
          label={mode === 'dark' ? t('bar.themeToLight') : t('bar.themeToDark')}
          icon={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
          onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        />
      </View>
      <LanguagePicker visible={picking} onClose={() => setPicking(false)} />
    </SurfaceProvider>
  );
}

function BarButton({
  label,
  icon,
  text,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  text?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: TOUCH_MIN,
        height: TOUCH_MIN - 8,
        paddingHorizontal: space.sm + 2,
        borderRadius: radius.pill,
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: pressed ? colors.selected : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.xs,
      })}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      {text ? <Text variant="label">{text}</Text> : null}
    </Pressable>
  );
}

/** Three big choices, each written in its own script. */
export function LanguagePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useLanguage((s) => s.lang);
  const setLanguage = useSetLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={t('bar.close')}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: space.lg }}
      >
        <SurfaceProvider value="surface">
          <Pressable
            onPress={() => undefined}
            style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}
          >
            <Text variant="heading">{t('bar.chooseLanguage')}</Text>
            {LANGUAGES.map((l) => {
              const on = l.value === lang;
              return (
                <Pressable
                  key={l.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={l.label}
                  onPress={async () => {
                    await setLanguage(l.value);
                    onClose();
                  }}
                  style={{
                    minHeight: TOUCH_MIN + 8,
                    borderRadius: radius.md,
                    borderWidth: on ? 3 : 2,
                    borderColor: on ? colors.accentBright : colors.edge,
                    backgroundColor: on ? colors.selected : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: space.md,
                    gap: space.md,
                  }}
                >
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={26}
                    color={on ? colors.accentBright : colors.edge}
                  />
                  <SurfaceProvider value={on ? 'selected' : 'surface'}>
                    <Text variant="heading">{l.label}</Text>
                  </SurfaceProvider>
                </Pressable>
              );
            })}
          </Pressable>
        </SurfaceProvider>
      </Pressable>
    </Modal>
  );
}

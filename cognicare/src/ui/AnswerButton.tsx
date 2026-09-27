import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { colors, radius, space, TOUCH_LARGE } from '@/theme/tokens';
import { SurfaceProvider } from './surface';
import { Text } from './Text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 'radio' inside a single-choice group (role toggle, check-in answers). */
  role?: 'button' | 'radio';
};

/**
 * One big choice. Selected differs from unselected three ways — a tinted
 * fill, a 3px coral edge, and a filled check where the empty ring was — so
 * nobody has to tell two shades apart to see what they picked.
 */
export function AnswerButton({ label, selected, onPress, role = 'radio' }: Props) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: role === 'radio' ? selected : undefined }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH_LARGE,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: selected ? space.md - 1 : space.md,
        paddingVertical: space.sm,
        borderRadius: radius.md,
        borderWidth: selected ? 3 : 2,
        borderColor: selected ? colors.accent : colors.edge,
        backgroundColor: selected ? colors.selected : colors.bg,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {selected ? (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        </View>
      ) : (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: colors.edge,
          }}
        />
      )}

      <SurfaceProvider value={selected ? 'selected' : 'bg'}>
        <Text variant="label" style={{ flex: 1 }}>
          {label}
        </Text>
      </SurfaceProvider>
    </Pressable>
  );
}

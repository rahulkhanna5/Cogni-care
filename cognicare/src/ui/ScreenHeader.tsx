import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  title: string;
  onBack?: () => void;
  /** 'close' for flows you leave rather than step back from (a game, the check-in). */
  backIcon?: 'back' | 'close';
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, backIcon = 'back', right }: Props) {
  const close = backIcon === 'close';

  const button = onBack ? (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel={close ? 'Close' : 'Back'}
      hitSlop={12}
      style={{
        width: TOUCH_MIN,
        height: TOUCH_MIN,
        alignItems: close ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={close ? 'close' : 'chevron-back'} size={32} color={colors.text} />
    </Pressable>
  ) : null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH_MIN }}>
      {!close && button}
      <Text variant="title" style={{ flex: 1 }} numberOfLines={2}>
        {title}
      </Text>
      {right}
      {close && button}
    </View>
  );
}

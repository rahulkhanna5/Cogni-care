import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';
import type { IconName } from './Button';

/** One large icon at the top of a status screen: waiting, sent, done. */
export function HeroIcon({ name, tone = 'accent' }: { name: IconName; tone?: 'accent' | 'success' }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: tone === 'success' ? colors.successSoft : colors.selected,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={name} size={56} color={tone === 'success' ? colors.success : colors.accent} />
      </View>
    </View>
  );
}

import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { AnswerButton } from './AnswerButton';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Stacked, not side by side: on a 360dp phone the full labels would wrap. */
export function RoleToggle<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
      {options.map((option) => (
        <AnswerButton
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

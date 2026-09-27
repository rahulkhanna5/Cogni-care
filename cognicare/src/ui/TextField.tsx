import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Always shown above the field. A placeholder is never the only label. */
  label: string;
  /** Shown under the field with an icon; also turns the edge soft red. */
  error?: string | null;
  hint?: string;
  minLines?: number;
};

/**
 * Label above, 2px edge at rest (4.3:1), 3px coral when focused, 3px soft red
 * plus an icon and a line of text on error — never colour alone.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, minLines, multiline, onFocus, onBlur, ...input },
  ref
) {
  const [focused, setFocused] = useState(false);
  const edgeWidth = error || focused ? 3 : 2;
  const edgeColor = error ? colors.danger : focused ? colors.accent : colors.edge;

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>

      <TextInput
        ref={ref}
        {...input}
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        accessibilityLabel={input.accessibilityLabel ?? label}
        style={{
          minHeight: multiline ? TOUCH_MIN * (minLines ?? 2) * 0.8 : TOUCH_MIN,
          borderWidth: edgeWidth,
          borderColor: edgeColor,
          borderRadius: radius.md,
          backgroundColor: colors.field,
          // The edge thickens on focus; take the extra pixel out of the
          // padding so the text does not jump sideways.
          paddingHorizontal: space.md - (edgeWidth - 2),
          paddingTop: multiline ? space.sm + 4 : 0,
          paddingBottom: multiline ? space.sm + 4 : 0,
          fontSize: 20,
          fontFamily: fonts.regular,
          color: colors.text,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} style={{ marginTop: 2 }} />
          <Text variant="caption" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Animated, Pressable, View, type ViewStyle } from 'react-native';

import type { Surface } from '@/theme/contrast';
import { colors, radius, space } from '@/theme/tokens';
import { SurfaceProvider, Text, type IconName } from '@/ui';
import { useFeedbackMotion, type StepState } from './pieces';

type Props = {
  /** The words: the caption under the picture, and what a screen reader says. */
  text: string;
  /** A 4:3 drawing of the action. Missing → the fallback panel. */
  picture?: ReactNode;
  /** Shown large when there is no picture yet, so the card never breaks. */
  fallbackIcon: IconName;
  state: StepState;
  /** 1-based, shown as a badge once placed. */
  position?: number;
  width: number;
  onPress?: () => void;
};

const FILL: Record<StepState, { fill: string; edge: string; surface: Surface }> = {
  available: { fill: colors.surface, edge: colors.edge, surface: 'surface' },
  placed: {
    fill: colors.selected,
    edge: colors.accentBright,
    surface: 'selected',
  },
  mistake: {
    fill: colors.dangerSoft,
    edge: colors.danger,
    surface: 'dangerSoft',
  },
};

/**
 * A step as a picture card: the action drawn on top, its words underneath.
 * Same three states as the text StepCard — available, placed (numbered),
 * mistake (dashed edge, a dash mark, one soft pulse; never a cross) — so any
 * sequencing game can show its steps as pictures without new rules.
 */
export function ActionCard({ text, picture, fallbackIcon, state, position, width, onPress }: Props) {
  const motion = useFeedbackMotion(state === 'mistake' ? 'mistake' : null);
  const look = FILL[state];

  const box: ViewStyle = {
    width,
    borderRadius: radius.md,
    borderWidth: state === 'placed' ? 3 : 2,
    borderStyle: state === 'mistake' ? 'dashed' : 'solid',
    borderColor: look.edge,
    backgroundColor: look.fill,
    overflow: 'hidden',
  };

  const body = (
    <>
      <View
        style={{
          width: '100%',
          aspectRatio: 4 / 3,
          backgroundColor: colors.tile,
        }}
      >
        {picture ?? (
          <View
            testID="action-card-fallback"
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.tint,
            }}
          >
            <Ionicons name={fallbackIcon} size={Math.min(56, width * 0.34)} color={colors.accent} />
          </View>
        )}
        {state === 'placed' && position !== undefined && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              minWidth: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.accent,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="label" color="textInverse">
              {position}
            </Text>
          </View>
        )}
        {state === 'mistake' && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: colors.surface,
              borderRadius: 15,
            }}
          >
            <Ionicons name="remove-circle-outline" size={28} color={colors.danger} />
          </View>
        )}
      </View>
      <SurfaceProvider value={look.surface}>
        <Text
          // Without a picture the words carry the card, so they get weight.
          variant={picture ? 'caption' : 'label'}
          center
          style={{ paddingHorizontal: space.sm, paddingVertical: space.xs + 2 }}
        >
          {text}
        </Text>
      </SurfaceProvider>
    </>
  );

  if (!onPress) {
    // A placed step is a record of what is done, not a control.
    return (
      <View style={box} accessible accessibilityLabel={`Step ${position}: ${text}`}>
        {body}
      </View>
    );
  }

  return (
    <Animated.View style={motion}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        onPress={onPress}
        style={({ pressed }) => [box, { opacity: pressed ? 0.85 : 1 }]}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, View, type ViewStyle } from 'react-native';

import { Art } from '@/art/Art';
import type { ArtName } from '@/art/names';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { SurfaceProvider, Text, useReduceMotion } from '@/ui';

/**
 * Game pieces and feedback, shared by every game.
 *
 * Correct → green fill + check + light tap (the caller buzzes).
 * Mistake → soft red, dashed edge, a dash mark + warning buzz. Never an ✕,
 * never words. One gentle pulse, no shaking, then the game carries on.
 * With Reduce Motion on, both are colour and icon only.
 */

export type Feedback = 'correct' | 'mistake' | null;

/** Scale-up for a correct tap, a soft pulse for a mistake. */
function useFeedbackMotion(feedback: Feedback) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!feedback || reduce) return;
    if (feedback === 'correct') {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 140, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [feedback, reduce, scale, opacity]);

  return { transform: [{ scale }], opacity };
}

/* -------------------------------- grid cell ------------------------------- */

export type CellState = 'idle' | 'lit' | 'correct' | 'mistake' | 'disabled';

type GridCellProps = {
  state: CellState;
  size: number;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  /** Extra content, e.g. the house and flag in Path Finder. */
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * Lit is coral + a halo + a dark mark, so it differs from idle by shape, not
 * only colour.
 */
export function GridCell({ state, size, onPress, disabled, accessibilityLabel, children, style }: GridCellProps) {
  const motion = useFeedbackMotion(state === 'correct' ? 'correct' : state === 'mistake' ? 'mistake' : null);

  const fill = {
    idle: colors.surface,
    lit: colors.accent,
    correct: colors.success,
    mistake: colors.dangerSoft,
    disabled: colors.bg,
  }[state];

  const icon =
    state === 'lit' ? (
      <Ionicons name="sunny" size={size * 0.42} color={colors.ink} />
    ) : state === 'correct' ? (
      <Ionicons name="checkmark" size={size * 0.5} color={colors.ink} />
    ) : state === 'mistake' ? (
      <Ionicons name="remove-circle-outline" size={size * 0.46} color={colors.danger} />
    ) : null;

  return (
    <Animated.View style={[motion, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        style={{
          width: size,
          height: size,
          borderRadius: size > 70 ? radius.md : radius.sm + 4,
          backgroundColor: fill,
          borderWidth: state === 'lit' ? 4 : 2,
          borderStyle: state === 'mistake' ? 'dashed' : 'solid',
          borderColor:
            state === 'lit'
              ? colors.halo
              : state === 'correct'
                ? colors.success
                : state === 'mistake'
                  ? colors.danger
                  : state === 'disabled'
                    ? colors.divider
                    : colors.edge,
          alignItems: 'center',
          justifyContent: 'center',
          // A halo that spills past the cell, the "lantern" glow.
          ...(state === 'lit'
            ? { shadowColor: colors.accent, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 }
            : null),
        }}
      >
        {icon ?? children}
      </Pressable>
    </Animated.View>
  );
}

/* --------------------------------- sprite --------------------------------- */

type SpriteProps = {
  art: ArtName;
  label: string;
  /** Size of the light tile. */
  size?: number;
  rotate?: number;
  /**
   * For boards with a picture behind them. The word moves inside the tile and
   * the tile gets a dark ring: a loose caption in theme text lands on whatever
   * the picture has there, and on a light patch it vanishes.
   */
  framed?: boolean;
  /** Framed tiles only: room for a long word such as "Toothpaste". */
  width?: number;
};

/** A flat illustration on a light tile, with its word always attached. */
export function Sprite({ art, label, size = TOUCH_MIN, rotate, framed, width }: SpriteProps) {
  if (framed) {
    return (
      <View
        style={{
          width: width ?? Math.max(size, 72),
          alignItems: 'center',
          paddingTop: space.xs,
          paddingBottom: 2,
          borderRadius: radius.md,
          borderWidth: 3,
          borderColor: colors.ink,
          backgroundColor: colors.tile,
        }}
      >
        <Art name={art} size={size * 0.8} rotate={rotate} />
        <Text variant="caption" color="textInverse" numberOfLines={1} style={{ fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 2, width: Math.max(size, 72) }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: colors.tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Art name={art} size={size * 0.8} rotate={rotate} />
      </View>
      <Text variant="caption" numberOfLines={1} style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------- animal tile ------------------------------ */

type AnimalTileProps = {
  art: ArtName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  feedback?: Feedback;
};

export function AnimalTile({ art, label, onPress, disabled, feedback = null }: AnimalTileProps) {
  const motion = useFeedbackMotion(feedback);
  return (
    <Animated.View style={motion}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 104,
          minHeight: 120,
          borderRadius: radius.md,
          backgroundColor:
            feedback === 'correct' ? colors.successSoft : feedback === 'mistake' ? colors.dangerSoft : colors.surface,
          borderWidth: feedback ? 3 : 2,
          borderStyle: feedback === 'mistake' ? 'dashed' : 'solid',
          borderColor:
            feedback === 'correct' ? colors.success : feedback === 'mistake' ? colors.danger : colors.edge,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.xs,
          padding: space.sm,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.md,
            backgroundColor: colors.tile,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <Art name={art} size={52} />
        </View>
        <SurfaceProvider value="surface">
          <Text variant="label" color={disabled ? 'textMuted' : 'text'}>
            {label}
          </Text>
        </SurfaceProvider>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------- response pad ------------------------------ */

type ResponsePadProps = {
  art: ArtName;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  feedback?: Feedback;
};

/** One huge target: the whole pad is the button. */
export function ResponsePad({ art, label, onPress, accessibilityLabel, feedback = null }: ResponsePadProps) {
  const motion = useFeedbackMotion(feedback);
  return (
    <Animated.View style={[{ flex: 1 }, motion]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: radius.lg,
          backgroundColor:
            feedback === 'correct' ? colors.successSoft : feedback === 'mistake' ? colors.dangerSoft : colors.surface,
          borderWidth: 3,
          borderStyle: feedback === 'mistake' ? 'dashed' : 'solid',
          borderColor: feedback === 'correct' ? colors.success : feedback === 'mistake' ? colors.danger : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.md,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: radius.lg,
            backgroundColor: colors.tile,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Art name={art} size={100} />
        </View>
        <SurfaceProvider value="surface">
          <Text variant="title" center>
            {label}
          </Text>
        </SurfaceProvider>
      </Pressable>
    </Animated.View>
  );
}

/* -------------------------------- step card ------------------------------- */

export type StepState = 'placed' | 'available' | 'mistake';

type StepCardProps = {
  text: string;
  state: StepState;
  /** 1-based position, shown on placed steps. */
  position?: number;
  onPress?: () => void;
};

/** placed · available · mistake (dashed, and it stays available). */
export function StepCard({ text, state, position, onPress }: StepCardProps) {
  const motion = useFeedbackMotion(state === 'mistake' ? 'mistake' : null);

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 }}>
      {state === 'placed' ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="label" color="textInverse">
            {position}
          </Text>
        </View>
      ) : state === 'mistake' ? (
        <Ionicons name="remove-circle-outline" size={26} color={colors.danger} />
      ) : null}
      <SurfaceProvider value={state === 'placed' ? 'selected' : state === 'mistake' ? 'dangerSoft' : 'bg'}>
        <Text variant="body" style={{ flex: 1 }}>
          {text}
        </Text>
      </SurfaceProvider>
    </View>
  );

  const box: ViewStyle = {
    minHeight: TOUCH_MIN,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    backgroundColor: state === 'placed' ? colors.selected : state === 'mistake' ? colors.dangerSoft : colors.bg,
    borderWidth: 2,
    borderStyle: state === 'mistake' ? 'dashed' : 'solid',
    borderColor: state === 'placed' ? colors.selected : state === 'mistake' ? colors.danger : colors.edge,
  };

  if (!onPress) {
    // Placed steps are a record of what is done, not a control. No label that
    // repeats the step text, so a screen reader does not offer it as a choice.
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

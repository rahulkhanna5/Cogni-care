import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';
import { Card } from './Card';
import { useReduceMotion } from './useReduceMotion';

/**
 * A grey placeholder in the shape of what is coming, so a loading screen shows
 * its layout instead of a word. Pulses gently; holds still under Reduce
 * Motion. Hidden from screen readers — the container says "Loading".
 */
export function Skeleton({
  width = '100%',
  height = 14,
  round = false,
}: {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
}) {
  const reduce = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduce]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width,
        height,
        borderRadius: round ? height / 2 : radius.sm,
        backgroundColor: colors.divider,
        opacity: reduce ? 0.7 : pulse,
      }}
    />
  );
}

/** A card-shaped placeholder: a heading line and a few body lines. */
export function SkeletonCard({ lines = 2, avatar = false }: { lines?: number; avatar?: boolean }) {
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {avatar && <Skeleton width={52} height={52} round />}
        <View style={{ flex: 1, gap: space.xs }}>
          <Skeleton width="55%" height={20} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </Card>
  );
}

/** Several cards at once, announced once as "Loading". */
export function SkeletonList({
  count = 3,
  lines = 2,
  avatar = false,
}: {
  count?: number;
  lines?: number;
  avatar?: boolean;
}) {
  return (
    <View accessible accessibilityLabel="Loading" accessibilityRole="progressbar" style={{ gap: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={lines} avatar={avatar} />
      ))}
    </View>
  );
}

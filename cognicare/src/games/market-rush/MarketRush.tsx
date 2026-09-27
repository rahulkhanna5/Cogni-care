import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View, type ImageSourcePropType } from 'react-native';

import { Art } from '@/art/Art';
import { Backdrop } from '@/games/shared/Backdrop';
import { schedule } from '@/games/shared/falling';
import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Card, Text, useReduceMotion } from '@/ui';
import { BasketBoard } from './BasketBoard';
import { GROCERIES, marketLevel } from './levels';
import { laneLayout } from './rules';

/** The supermarket aisle the game is played in — behind the list and the falling items alike. */
const AISLE: ImageSourcePropType = require('../../../assets/images/market-aisle.webp');

type Props = GamePlayProps & {
  /** Test seam: pin the shuffle so a round is reproducible. */
  random?: () => number;
};

function pickDistinct<T>(pool: T[], count: number, rnd: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
}

export function MarketRush({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = marketLevel(level);
  const [showingList, setShowingList] = useState(true);

  const { list, specs } = useMemo(() => {
    const chosen = pickDistinct(GROCERIES, spec.listSize, random);
    const rest = GROCERIES.filter((g) => !chosen.includes(g));

    return {
      list: chosen,
      // In lanes, so no item ever falls on top of another (see laneLayout).
      specs: laneLayout(
        schedule({
          durationMs: spec.durationMs,
          travelMs: spec.travelMs,
          // Each listed item comes past exactly once, so a miss is unambiguous.
          targetCount: chosen.length,
          distractorCount: Math.round(chosen.length * spec.distractorRatio),
          targets: chosen,
          distractors: rest,
          random,
        }),
        { windowMs: spec.durationMs - spec.travelMs, random }
      ),
    };
    // Regenerating mid-round would swap the list under the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    const t = setTimeout(() => setShowingList(false), spec.viewMs);
    return () => clearTimeout(t);
  }, [spec.viewMs]);

  if (showingList) {
    // Longer lists get smaller rows so the whole list fits on a phone. The
    // ScrollView is only a fallback for a very short screen: an item cut off
    // below the fold is an item nobody can remember.
    const compact = list.length > 4;
    const tile = compact ? 48 : 56;

    return (
      // The same two lines as the board above the same aisle, so the picture
      // stays put when the list goes and the items start to fall.
      <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.xs }}>
        <Text variant="heading" center>
          Remember this list
        </Text>
        <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
          {list.length} items to remember
        </Text>

        <Backdrop source={AISLE}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.md }}>
            <Card style={{ gap: compact ? space.sm : space.md }}>
              <ViewTimeBar ms={spec.viewMs} />
              {list.map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View
                    style={{
                      width: tile,
                      height: tile,
                      borderRadius: radius.md,
                      backgroundColor: colors.tile,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Art name={item.art} size={Math.round(tile * 0.82)} />
                  </View>
                  <Text variant={compact ? 'heading' : 'title'}>{item.label}</Text>
                </View>
              ))}
            </Card>
          </ScrollView>
        </Backdrop>
      </View>
    );
  }

  return (
    <BasketBoard specs={specs} durationMs={spec.durationMs} backdrop={AISLE} onFinish={onRoundComplete} />
  );
}

/**
 * How much longer the list stays up, as a bar that empties — never a number.
 * A counting clock pulls the eye off the list and onto the seconds, which is
 * the opposite of what the phase is for. Still under Reduce Motion.
 */
function ViewTimeBar({ ms }: { ms: number }) {
  const reduce = useReduceMotion();
  const left = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduce) return;
    const run = Animated.timing(left, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [ms, reduce, left]);

  if (reduce) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.divider, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

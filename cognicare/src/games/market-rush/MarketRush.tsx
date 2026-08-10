import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { FallingBoard } from '@/games/shared/FallingBoard';
import { schedule } from '@/games/shared/falling';
import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
import { GROCERIES, marketLevel } from './levels';

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
      specs: schedule({
        durationMs: spec.durationMs,
        travelMs: spec.travelMs,
        // Each listed item comes past exactly once, so a miss is unambiguous.
        targetCount: chosen.length,
        distractorCount: Math.round(chosen.length * spec.distractorRatio),
        targets: chosen,
        distractors: rest,
        random,
      }),
    };
    // Regenerating mid-round would swap the list under the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    const t = setTimeout(() => setShowingList(false), spec.viewMs);
    return () => clearTimeout(t);
  }, [spec.viewMs]);

  if (showingList) {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.lg, justifyContent: 'center' }}>
        <Text variant="heading" center style={{ marginBottom: space.lg }}>
          Remember this list
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: space.lg,
            gap: space.md,
          }}
        >
          {list.map((item) => (
            <View
              key={item.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
            >
              <Text style={{ fontSize: 34, lineHeight: 40 }}>{item.emoji}</Text>
              <Text variant="title">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <FallingBoard
      specs={specs}
      durationMs={spec.durationMs}
      prompt="Tap only the items from your list"
      onFinish={onRoundComplete}
    />
  );
}

import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { gameSummaries } from '@/db/stats';
import { DOMAIN_LABELS } from '@/db/types';
import { GAMES } from '@/games/registry';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';
import { Card, Screen, Tag, Text } from '@/ui';

export default function Games() {
  const router = useRouter();
  const db = useSQLiteContext();
  const player = useSession((s) => s.player);
  const [levels, setLevels] = useState<Record<string, number>>({});

  // The player's own level on each card, so the list shows where they are,
  // not just what exists.
  useFocusEffect(
    useCallback(() => {
      if (!player) return;
      let cancelled = false;
      gameSummaries(db, player.id).then((rows) => {
        if (!cancelled) setLevels(Object.fromEntries(rows.map((r) => [r.game_id, r.current_level])));
      });
      return () => {
        cancelled = true;
      };
    }, [db, player])
  );

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Games</Text>
        <Text variant="body" color="textMuted">
          {/* Counted, not written out — the last hard-coded number went stale
              the moment an eighth game was added. */}
          {GAMES.filter((g) => g.ready).length} exercises. Each one trains something
          different.
        </Text>
      </View>

      {GAMES.map((game) => {
        const trains = [...game.domains.map((d) => DOMAIN_LABELS[d]), ...(game.alsoTrains ?? [])].slice(0, 3);
        const level = levels[game.id];
        return (
          <Card
            key={game.id}
            onPress={game.ready ? () => router.push(`/game/${game.id}`) : undefined}
            accessibilityLabel={`${game.title}. ${game.blurb}`}
          >
            <Text variant="heading">{game.title}</Text>
            <Text variant="body" color="textMuted">
              {game.blurb}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs }}>
              {game.needsHeadphones && <Tag label="Headphones" icon="headset-outline" />}
              {trains.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </View>

            <Text variant="label" color="accent" style={{ marginTop: space.xs }}>
              {!game.ready
                ? 'Coming soon'
                : level
                  ? `Level ${level} of ${game.maxLevel} · Tap to play`
                  : 'New · Tap to play'}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}

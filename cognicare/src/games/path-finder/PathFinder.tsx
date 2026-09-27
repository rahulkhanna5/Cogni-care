import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Banner, Button, Text } from '@/ui';
import { MAPS_PER_ROUND, pathLevel } from './levels';
import { canExtend, generateMap, routeAccuracy, same, type Cell } from './routing';

type Props = GamePlayProps & { random?: () => number };

/** Long enough to read the result line before the next map appears. */
const RESULT_MS = 1600;

export function PathFinder({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = pathLevel(level);
  const { width } = useWindowDimensions();

  const maps = useMemo(
    () => Array.from({ length: MAPS_PER_ROUND }, () => generateMap(spec.size, spec.blockedRatio, random)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

  const [mapIndex, setMapIndex] = useState(0);
  const map = maps[mapIndex];
  const [path, setPath] = useState<Cell[]>([map.start]);
  const [result, setResult] = useState<string | null>(null);

  const scores = useRef<number[]>([]);
  const latencies = useRef<number[]>([]);
  const detours = useRef(0);
  const startedAt = useRef(Date.now());
  const locked = useRef(false);

  const gap = 4;
  const board = Math.min(width - space.gutter * 2, 420);
  const cellSize = (board - gap * (map.size - 1)) / map.size;

  const finishMap = useCallback(
    (finalPath: Cell[]) => {
      const accuracy = routeAccuracy(map, finalPath);
      scores.current.push(accuracy);
      latencies.current.push(Date.now() - startedAt.current);
      if (accuracy < 1) detours.current += 1;

      const extra = finalPath.length - 1 - map.optimal;
      setResult(
        extra <= 0
          ? 'The shortest way — well done.'
          : `Home! ${extra} ${extra === 1 ? 'step' : 'steps'} longer than the shortest way.`
      );

      setTimeout(() => {
        setResult(null);
        if (mapIndex + 1 < maps.length) {
          const next = mapIndex + 1;
          setMapIndex(next);
          setPath([maps[next].start]);
          startedAt.current = Date.now();
          locked.current = false;
          return;
        }

        const mean = scores.current.reduce((a, b) => a + b, 0) / scores.current.length;
        const solved = scores.current.filter((s) => s > 0).length;

        onRoundComplete({
          hits: solved,
          misses: scores.current.length - solved,
          // A detour is a planning error, not a wrong button — recorded as a
          // false alarm so it stays visible in the round data.
          falseAlarms: detours.current,
          accuracy: mean,
          avgReactionMs: Math.round(
            latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length
          ),
          score: Math.round(mean * 50),
        });
      }, RESULT_MS);
    },
    [map, mapIndex, maps, onRoundComplete]
  );

  const onCell = useCallback(
    (cell: Cell) => {
      if (locked.current) return;

      // Tapping the last cell steps back — undo without a separate control.
      if (path.length > 1 && same(cell, path[path.length - 1])) {
        setPath((p) => p.slice(0, -1));
        return;
      }

      if (!canExtend(map, path, cell)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      const next = [...path, cell];
      setPath(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (same(cell, map.goal)) {
        locked.current = true;
        finishMap(next);
      }
    },
    [finishMap, map, path]
  );

  const pathIndex = (cell: Cell) => path.findIndex((p) => same(p, cell));
  const icon = cellSize * 0.5;

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, alignItems: 'center' }}>
      <Text variant="heading" center>
        Find the shortest way home
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.md }}>
        Map {mapIndex + 1} of {maps.length} · {path.length - 1} steps so far
      </Text>

      <View style={{ width: board, gap }}>
        {Array.from({ length: map.size }).map((_, r) => (
          <View key={r} style={{ flexDirection: 'row', gap }}>
            {Array.from({ length: map.size }).map((__, c) => {
              const cell = { r, c };
              const onPath = pathIndex(cell) >= 0;
              const isStart = same(cell, map.start);
              const isGoal = same(cell, map.goal);
              const isBlocked = map.blocked[r][c];

              return (
                <Pressable
                  key={c}
                  onPress={() => onCell(cell)}
                  disabled={isBlocked}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isBlocked
                      ? `Blocked, row ${r + 1}, column ${c + 1}`
                      : isStart
                        ? 'Home, the start'
                        : isGoal
                          ? `Flag, the goal, row ${r + 1}, column ${c + 1}`
                          : `Row ${r + 1}, column ${c + 1}`
                  }
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: radius.sm,
                    backgroundColor: isBlocked ? colors.surfaceRaised : onPath ? colors.accent : colors.surface,
                    borderWidth: isGoal ? 3 : isBlocked ? 1 : 2,
                    borderColor: isGoal ? colors.success : isBlocked ? colors.divider : onPath ? colors.accent : colors.edge,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isBlocked ? (
                    // A building, so "blocked" is a shape and not only a grey.
                    <Ionicons name="business" size={icon} color={colors.edge} />
                  ) : isStart ? (
                    <Ionicons name="home" size={icon} color={onPath ? colors.ink : colors.text} />
                  ) : isGoal ? (
                    <Ionicons name="flag" size={icon} color={onPath ? colors.ink : colors.success} />
                  ) : onPath ? (
                    <View style={{ width: cellSize * 0.22, height: cellSize * 0.22, borderRadius: 99, backgroundColor: colors.ink }} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ alignSelf: 'stretch', marginTop: space.lg, minHeight: 64 }}>
        {result ? (
          <Banner tone="success" icon="flag-outline">
            {result}
          </Banner>
        ) : (
          <Button
            label="Start over"
            variant="secondary"
            icon="refresh"
            fullWidth={false}
            onPress={() => setPath([map.start])}
          />
        )}
      </View>
    </View>
  );
}

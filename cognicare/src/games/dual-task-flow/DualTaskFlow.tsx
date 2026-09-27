import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { play, prepareAudio, releaseAudio } from '@/games/sound-forest/sounds';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { SurfaceProvider, Text, type IconName } from '@/ui';
import { buildTimeline, dualLevel } from './levels';

type Props = GamePlayProps & { random?: () => number };

export function DualTaskFlow({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = dualLevel(level);

  const timeline = useMemo(
    () => buildTimeline(spec, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState<'hit' | 'wrong' | null>(null);

  const stats = useRef({ hits: 0, misses: 0, falseAlarms: 0 });
  const answered = useRef(false);
  const latencies = useRef<number[]>([]);
  const shownAt = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    prepareAudio();
    return () => releaseAudio();
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;

    const targets = timeline.filter((e) => e.isTarget).length;
    const avg = latencies.current.length
      ? Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length)
      : null;

    onRoundComplete({
      hits: stats.current.hits,
      misses: stats.current.misses,
      falseAlarms: stats.current.falseAlarms,
      accuracy: targets === 0 ? 0 : stats.current.hits / targets,
      avgReactionMs: avg,
      score: Math.max(0, stats.current.hits * 10 - stats.current.falseAlarms * 5),
    });
  }, [timeline, onRoundComplete]);

  useEffect(() => {
    if (index >= timeline.length) {
      finish();
      return;
    }

    const event = timeline[index];
    if (event.modality === 'audio') play(event.isTarget ? 'tone-high' : 'tone-low');

    shownAt.current = Date.now();
    answered.current = false;

    const t = setTimeout(() => {
      if (timeline[index].isTarget && !answered.current) stats.current.misses += 1;
      setIndex((i) => i + 1);
    }, spec.stepMs);

    return () => clearTimeout(t);
  }, [index, timeline, spec.stepMs, finish]);

  const event = timeline[Math.min(index, timeline.length - 1)];
  const isVisualTurn = event?.modality === 'visual';

  const respond = (modality: 'visual' | 'audio') => {
    // Only the stream that is currently live can be answered, so a tap is
    // never ambiguous about which task it belongs to.
    if (answered.current || !event || event.modality !== modality) return;
    answered.current = true;

    if (event.isTarget) {
      stats.current.hits += 1;
      latencies.current.push(Date.now() - shownAt.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFlash('hit');
    } else {
      stats.current.falseAlarms += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 400);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.md }}>
      <View
        style={{
          flex: 1,
          borderRadius: radius.lg,
          backgroundColor: flash === 'hit' ? colors.successSoft : flash === 'wrong' ? colors.dangerSoft : colors.surface,
          borderWidth: flash ? 3 : 0,
          borderStyle: flash === 'wrong' ? 'dashed' : 'solid',
          borderColor: flash === 'hit' ? colors.success : colors.danger,
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
        }}
      >
        <SurfaceProvider value="surface">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name={isVisualTurn ? 'eye-outline' : 'ear-outline'} size={26} color={colors.textMuted} />
            <Text variant="label" color="textMuted">
              {isVisualTurn ? 'Look at the number' : 'Listen to the sound'}
            </Text>
          </View>

          {isVisualTurn ? (
            <Text style={{ fontSize: 112, lineHeight: 128, fontFamily: fonts.semibold }}>{event?.value ?? ''}</Text>
          ) : (
            <Ionicons name="volume-high" size={104} color={colors.accentOnCard} />
          )}

          {flash && (
            <Ionicons
              name={flash === 'hit' ? 'checkmark-circle' : 'remove-circle-outline'}
              size={36}
              color={flash === 'hit' ? colors.success : colors.danger}
            />
          )}

          <Text variant="caption" color="textMuted">
            {Math.min(index + 1, timeline.length)} of {timeline.length}
          </Text>
        </SurfaceProvider>
      </View>

      <ResponseButton
        label="Odd number"
        hint="Tap if the number is odd"
        icon="eye-outline"
        live={isVisualTurn}
        edge={colors.accent}
        onPress={() => respond('visual')}
      />
      <ResponseButton
        label="High sound"
        hint="Tap if the sound is high"
        icon="ear-outline"
        live={!isVisualTurn}
        edge={colors.success}
        onPress={() => respond('audio')}
        style={{ marginBottom: space.md }}
      />
    </View>
  );
}

/**
 * The live button is filled, edged, and says what to do; the other is a
 * dashed outline marked "Not now". Which task is live never depends on
 * noticing a change in opacity alone.
 */
function ResponseButton({
  label,
  hint,
  icon,
  live,
  edge,
  onPress,
  style,
}: {
  label: string;
  hint: string;
  icon: IconName;
  live: boolean;
  edge: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !live }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 88,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          backgroundColor: live ? colors.selected : colors.bg,
          borderWidth: live ? 3 : 2,
          borderStyle: live ? 'solid' : 'dashed',
          borderColor: live ? edge : colors.edge,
          opacity: pressed && live ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={32} color={live ? edge : colors.textMuted} />
      <SurfaceProvider value={live ? 'selected' : 'bg'}>
        <View style={{ flex: 1 }}>
          <Text variant="title" color={live ? 'text' : 'textMuted'}>
            {label}
          </Text>
          <Text variant="caption" color="textMuted">
            {live ? hint : 'Not now'}
          </Text>
        </View>
      </SurfaceProvider>
    </Pressable>
  );
}

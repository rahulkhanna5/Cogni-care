import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { play, prepareAudio, releaseAudio } from '@/games/sound-forest/sounds';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
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
    setTimeout(() => setFlash(null), 220);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg, gap: space.md }}>
      <Text variant="body" color="textMuted" center>
        {isVisualTurn ? 'Look at the number' : 'Listen to the sound'}
      </Text>

      <View
        style={{
          flex: 1,
          borderRadius: radius.lg,
          backgroundColor:
            flash === 'hit' ? colors.accentSoft : flash === 'wrong' ? '#F6E3E0' : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isVisualTurn ? (
          <Text style={{ fontSize: 108, lineHeight: 124, fontWeight: '600', color: colors.text }}>
            {event?.value ?? ''}
          </Text>
        ) : (
          <Ionicons name="volume-high" size={96} color={colors.accent} />
        )}
        <Text variant="caption" color="textMuted">
          {Math.min(index + 1, timeline.length)} of {timeline.length}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Odd number"
        accessibilityState={{ disabled: !isVisualTurn }}
        onPress={() => respond('visual')}
        style={{
          minHeight: 84,
          borderRadius: radius.md,
          backgroundColor: isVisualTurn ? colors.accentSoft : colors.bg,
          borderWidth: 3,
          borderColor: isVisualTurn ? colors.accent : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isVisualTurn ? 1 : 0.4,
        }}
      >
        <Text variant="title" color={isVisualTurn ? 'accent' : 'textMuted'}>
          Odd number
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="High sound"
        accessibilityState={{ disabled: isVisualTurn }}
        onPress={() => respond('audio')}
        style={{
          minHeight: 84,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 3,
          borderColor: !isVisualTurn ? colors.success : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.md,
          opacity: !isVisualTurn ? 1 : 0.4,
        }}
      >
        <Text variant="title" color={!isVisualTurn ? 'success' : 'textMuted'}>
          High sound
        </Text>
      </Pressable>
    </View>
  );
}

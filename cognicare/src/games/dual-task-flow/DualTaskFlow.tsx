import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { play, prepareAudio, releaseAudio } from '@/games/sound-forest/sounds';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from '@/ui';
import { buildNumbers, buildTones, dualLevel } from './levels';

type Props = GamePlayProps & { random?: () => number };

export function DualTaskFlow({ level, onRoundComplete, random = Math.random }: Props) {
  const spec = dualLevel(level);

  const numbers = useMemo(
    () => buildNumbers(spec, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );
  const toneCount = Math.ceil((spec.visualCount * spec.visualIntervalMs) / spec.audioIntervalMs);
  const tones = useMemo(
    () => buildTones(toneCount, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level]
  );

  const [visualIndex, setVisualIndex] = useState(0);
  const [audioIndex, setAudioIndex] = useState(-1);
  const [flash, setFlash] = useState<'number' | 'tone' | null>(null);

  // Each stream is scored independently, then combined — a player who tracks
  // one stream well and abandons the other should not look average.
  const stats = useRef({ hits: 0, misses: 0, falseAlarms: 0 });
  const answered = useRef({ visual: false, audio: false });
  const latencies = useRef<number[]>([]);
  const shownAt = useRef({ visual: 0, audio: 0 });
  const finished = useRef(false);

  useEffect(() => {
    prepareAudio();
    return () => releaseAudio();
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;

    const targets =
      numbers.filter((n) => n.isTarget).length + tones.filter((t) => t.isTarget).length;
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
  }, [numbers, tones, onRoundComplete]);

  /* ------------------------------ visual stream ----------------------------- */

  useEffect(() => {
    if (visualIndex >= numbers.length) {
      finish();
      return;
    }

    shownAt.current.visual = Date.now();
    answered.current.visual = false;

    const t = setTimeout(() => {
      if (numbers[visualIndex].isTarget && !answered.current.visual) stats.current.misses += 1;
      setVisualIndex((i) => i + 1);
    }, spec.visualIntervalMs);

    return () => clearTimeout(t);
  }, [visualIndex, numbers, spec.visualIntervalMs, finish]);

  /* ------------------------------ audio stream ------------------------------ */

  useEffect(() => {
    if (finished.current) return;

    const t = setTimeout(() => {
      const next = audioIndex + 1;
      if (next >= tones.length) return;

      if (audioIndex >= 0 && tones[audioIndex].isTarget && !answered.current.audio) {
        stats.current.misses += 1;
      }

      play(tones[next].isTarget ? 'tone-high' : 'tone-low');
      shownAt.current.audio = Date.now();
      answered.current.audio = false;
      setAudioIndex(next);
    }, spec.audioIntervalMs);

    return () => clearTimeout(t);
  }, [audioIndex, tones, spec.audioIntervalMs]);

  /* -------------------------------- responses ------------------------------- */

  const respond = (stream: 'visual' | 'audio') => {
    if (answered.current[stream]) return;
    answered.current[stream] = true;

    const item = stream === 'visual' ? numbers[visualIndex] : tones[audioIndex];
    if (!item) return;

    if (item.isTarget) {
      stats.current.hits += 1;
      latencies.current.push(Date.now() - shownAt.current[stream]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      stats.current.falseAlarms += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setFlash(stream === 'visual' ? 'number' : 'tone');
    setTimeout(() => setFlash(null), 200);
  };

  const current = numbers[Math.min(visualIndex, numbers.length - 1)];

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg, gap: space.md }}>
      <Text variant="body" color="textMuted" center>
        Watch and listen at the same time
      </Text>

      <View
        style={{
          flex: 1,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 108, lineHeight: 124, fontWeight: '600', color: colors.text }}>
          {current?.value ?? ''}
        </Text>
        <Text variant="caption" color="textMuted">
          {visualIndex + 1} of {numbers.length}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Odd number"
        onPress={() => respond('visual')}
        style={{
          minHeight: 84,
          borderRadius: radius.md,
          backgroundColor: flash === 'number' ? colors.accent : colors.accentSoft,
          borderWidth: 3,
          borderColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="title" color={flash === 'number' ? 'textInverse' : 'accent'}>
          Odd number
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="High sound"
        onPress={() => respond('audio')}
        style={{
          minHeight: 84,
          borderRadius: radius.md,
          backgroundColor: flash === 'tone' ? colors.success : colors.surface,
          borderWidth: 3,
          borderColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.md,
        }}
      >
        <Text variant="title" color={flash === 'tone' ? 'textInverse' : 'success'}>
          High sound
        </Text>
      </Pressable>
    </View>
  );
}

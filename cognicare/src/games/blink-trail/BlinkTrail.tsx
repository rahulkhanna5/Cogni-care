import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Text } from '@/ui';
import { blinkLevel } from './levels';

type Phase = 'watch' | 'blank' | 'input' | 'done';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Random sequence with no cell repeated back to back — a double-flash on the
 *  same cell is ambiguous to watch and unfairly hard to reproduce. */
export function makeSequence(cells: number, length: number): number[] {
  const seq: number[] = [];
  while (seq.length < length) {
    const next = Math.floor(Math.random() * cells);
    if (seq.length === 0 || seq[seq.length - 1] !== next) seq.push(next);
  }
  return seq;
}

type Props = GamePlayProps & {
  /** Injection seam so tests can pin the sequence instead of stubbing Math.random. */
  makeSeq?: (cells: number, length: number) => number[];
};

export function BlinkTrail({ level, onRoundComplete, makeSeq = makeSequence }: Props) {
  const spec = blinkLevel(level);
  const cellCount = spec.grid * spec.grid;

  const { width } = useWindowDimensions();
  const boardWidth = Math.min(width, 460) - space.lg * 2;
  const gap = space.sm;
  const cellSize = (boardWidth - gap * (spec.grid - 1)) / spec.grid;

  const [sequence] = useState(() => makeSeq(cellCount, spec.length));
  const [phase, setPhase] = useState<Phase>('watch');
  /** Bumped to replay. The trial runner keys off this, never off `phase` —
   *  the runner sets `phase` itself, so depending on it would cancel the
   *  in-flight run mid-trial and input would never open. */
  const [runId, setRunId] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ cell: number; ok: boolean } | null>(null);
  const [replaysLeft, setReplaysLeft] = useState(spec.replays);

  const lastTapAt = useRef<number>(0);
  const latencies = useRef<number[]>([]);
  const finished = useRef(false);
  /**
   * Authoritative position in the sequence. The `inputIndex` state exists only
   * to drive the "2 of 5" label — two taps inside one render tick would both
   * read the same stale state value and the second would score as an error.
   */
  const indexRef = useRef(0);

  /* ------------------------------ show sequence ----------------------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPhase('watch');
      setFeedback(null);

      // Small lead-in so the first flash isn't missed mid-blink.
      await wait(600);
      for (const cell of sequence) {
        if (cancelled) return;
        setActiveCell(cell);
        await wait(spec.flashMs);
        if (cancelled) return;
        setActiveCell(null);
        await wait(spec.gapMs);
      }
      if (cancelled) return;

      setPhase('blank');
      await wait(1000); // the deck's blank interval — this is the memory load
      if (cancelled) return;

      indexRef.current = 0;
      setInputIndex(0);
      latencies.current = [];
      lastTapAt.current = Date.now();
      setPhase('input');
    })();

    return () => {
      cancelled = true;
    };
  }, [runId, sequence, spec.flashMs, spec.gapMs]);

  /* --------------------------------- scoring -------------------------------- */

  const finish = useCallback(
    async (hits: number, falseAlarms: number) => {
      if (finished.current) return;
      finished.current = true;
      setPhase('done');

      const misses = sequence.length - hits;
      const perfect = hits === sequence.length;
      const avg = latencies.current.length
        ? Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length)
        : null;

      await wait(700); // let the last cell's feedback colour register

      onRoundComplete({
        hits,
        misses,
        falseAlarms,
        accuracy: hits / sequence.length,
        avgReactionMs: avg,
        score: hits * 10 + (perfect ? 50 : 0),
      });
    },
    [onRoundComplete, sequence.length]
  );

  const onCellPress = useCallback(
    (cell: number) => {
      if (phase !== 'input') return;

      const now = Date.now();
      const latency = now - lastTapAt.current;
      lastTapAt.current = now;

      const at = indexRef.current;

      if (cell === sequence[at]) {
        latencies.current.push(latency);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFeedback({ cell, ok: true });
        setTimeout(() => setFeedback(null), 220);

        const next = at + 1;
        indexRef.current = next;
        setInputIndex(next);
        if (next === sequence.length) finish(sequence.length, 0);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setFeedback({ cell, ok: false });
        finish(at, 1);
      }
    },
    [phase, sequence, finish]
  );

  const replay = useCallback(() => {
    if (replaysLeft <= 0) return;
    setReplaysLeft((n) => n - 1);
    indexRef.current = 0;
    setInputIndex(0);
    setRunId((n) => n + 1); // re-runs the trial effect from the top
  }, [replaysLeft]);

  /* ---------------------------------- view ---------------------------------- */

  const prompt =
    phase === 'watch'
      ? 'Watch the lights'
      : phase === 'blank'
        ? 'Get ready…'
        : phase === 'input'
          ? 'Your turn — tap them in order'
          : '';

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: space.lg }}>
      <Text variant="heading" center style={{ marginBottom: space.xs }}>
        {prompt}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.lg }}>
        {phase === 'input' ? `${inputIndex} of ${sequence.length}` : `${sequence.length} lights`}
      </Text>

      <View style={{ width: boardWidth, gap }}>
        {Array.from({ length: spec.grid }).map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {Array.from({ length: spec.grid }).map((__, col) => {
              const index = row * spec.grid + col;
              const isActive = activeCell === index;
              const fb = feedback?.cell === index ? feedback : null;

              const background = fb
                ? fb.ok
                  ? colors.success
                  : colors.danger
                : isActive
                  ? colors.accent
                  : colors.surface;

              return (
                <Pressable
                  key={col}
                  onPress={() => onCellPress(index)}
                  disabled={phase !== 'input'}
                  accessibilityRole="button"
                  accessibilityLabel={`Row ${row + 1}, column ${col + 1}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: radius.md,
                    backgroundColor: background,
                    borderWidth: 2,
                    borderColor: background === colors.surface ? colors.border : background,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      {phase === 'input' && replaysLeft > 0 && (
        <Button
          label={`Show me again (${replaysLeft} left)`}
          variant="secondary"
          onPress={replay}
          fullWidth={false}
          style={{ marginTop: space.xl }}
        />
      )}
    </View>
  );
}

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';

import type { RoundResult } from '@/games/shell/types';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Text } from '@/ui';
import {
  advance,
  createEngine,
  isComplete,
  summarise,
  tap,
  type EngineState,
  type FallerSpec,
} from './falling';

const TICK_MS = 33; // ~30fps; enough for a dozen sprites on the JS thread

type Props = {
  specs: FallerSpec[];
  durationMs: number;
  /** Line above the board, e.g. "Tap the fish swimming up". */
  prompt: string;
  onFinish: (result: RoundResult) => void;
};

export function FallingBoard({ specs, durationMs, prompt, onFinish }: Props) {
  const engine = useRef<EngineState>(createEngine(durationMs, specs));
  const startedAt = useRef<number>(Date.now());
  const done = useRef(false);
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onFinish(summarise(engine.current));
  }, [onFinish]);

  useEffect(() => {
    const id = setInterval(() => {
      advance(engine.current, Date.now() - startedAt.current);
      setFrame((f) => f + 1);
      if (isComplete(engine.current)) {
        clearInterval(id);
        finish();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [finish]);

  const onTap = useCallback((id: number) => {
    const state = engine.current;
    const item = state.items.find((i) => i.id === id);
    if (!item || item.status !== 'active') return;

    tap(state, id, Date.now() - startedAt.current);

    if (item.kind === 'target') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setFrame((f) => f + 1);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const state = engine.current;
  const remaining = state.items.filter((i) => i.kind === 'target' && i.status !== 'tapped').length;

  return (
    <View style={{ flex: 1, paddingHorizontal: space.lg }}>
      <Text variant="heading" center>
        {prompt}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        {remaining} left to find
      </Text>

      <View
        onLayout={onLayout}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {size.height > 0 &&
          state.items
            .filter((i) => i.status === 'active')
            .map((item) => {
              const travelled = item.direction === 'down' ? item.progress : 1 - item.progress;
              const top = travelled * (size.height - TOUCH_MIN);
              const left = item.x * (size.width - TOUCH_MIN);

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => onTap(item.id)}
                  style={{
                    position: 'absolute',
                    top,
                    left,
                    width: TOUCH_MIN,
                    minHeight: TOUCH_MIN,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 38, lineHeight: 44 }}>{item.emoji}</Text>
                  <Text variant="caption" color="textMuted" numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
      </View>
    </View>
  );
}

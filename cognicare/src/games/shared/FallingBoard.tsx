import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type { RoundResult } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Art } from '@/art/Art';
import { SurfaceProvider, Text, useReduceMotion } from '@/ui';
import { Backdrop, WATER_SPEED } from './Backdrop';
import {
  advance,
  createEngine,
  isComplete,
  SPRITE_H,
  SPRITE_W,
  summarise,
  tap,
  type EngineState,
  type Faller,
  type FallerSpec,
} from './falling';
import { Sprite } from './pieces';

const TICK_MS = 33; // ~30fps; enough for a dozen sprites on the JS thread
const TILE = 56; // SPRITE_W × SPRITE_H (falling.ts) is the tile plus its word
const MARK_MS = 400; // how long a tap's check or dash stays where it landed

type Mark = { id: number; x: number; y: number; ok: boolean };

type Props = {
  specs: FallerSpec[];
  durationMs: number;
  /** Line above the board, e.g. "Tap the fish swimming up". */
  prompt: string;
  /** Word for the targets in the counter: "3 fish left to find". */
  targetNoun?: string;
  /** Draw faint chevrons showing which way the water runs. */
  flow?: 'down';
  /** Turn an item's art, e.g. so a fish faces the way it swims. */
  rotateFor?: (item: Faller) => number;
  /** A picture behind the board, e.g. the supermarket aisle. Items switch to framed tiles. */
  backdrop?: ImageSourcePropType;
  /**
   * Just the drawing: no tile, no word. For pieces anyone can name at a
   * glance (a fish, a leaf) — the word only cluttered a busy board.
   */
  bare?: boolean;
  /** What a screen reader says for an item. Defaults to its word. */
  describe?: (item: Faller) => string;
  onFinish: (result: RoundResult) => void;
};

/** A bare drawing, sized to fill most of its touch box. */
const BARE_ART = 64;

export function FallingBoard({
  specs,
  durationMs,
  prompt,
  targetNoun,
  flow,
  rotateFor,
  backdrop,
  bare = false,
  describe,
  onFinish,
}: Props) {
  const engine = useRef<EngineState>(createEngine(durationMs, specs));
  const startedAt = useRef<number>(Date.now());
  const done = useRef(false);
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [marks, setMarks] = useState<Mark[]>([]);

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

  const place = useCallback(
    (item: Faller) => {
      const travelled = item.direction === 'down' ? item.progress : 1 - item.progress;
      return {
        top: travelled * Math.max(0, size.height - SPRITE_H),
        left: item.x * Math.max(0, size.width - SPRITE_W),
      };
    },
    [size]
  );

  const onTap = useCallback(
    (id: number) => {
      const state = engine.current;
      const item = state.items.find((i) => i.id === id);
      if (!item || item.status !== 'active') return;

      const at = place(item);
      tap(state, id, Date.now() - startedAt.current);

      const ok = item.kind === 'target';
      if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Leave a mark where the tap landed, so the player sees what happened
      // even though the item itself is gone.
      setMarks((m) => [...m, { id, x: at.left, y: at.top, ok }]);
      setTimeout(() => setMarks((m) => m.filter((k) => k.id !== id)), MARK_MS);
      setFrame((f) => f + 1);
    },
    [place]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const state = engine.current;
  const remaining = state.items.filter((i) => i.kind === 'target' && i.status !== 'tapped').length;

  // What sits on the board, with or without a picture behind it.
  const pieces = (
    <>
      {flow && size.height > 0 && (
        <FlowChevrons width={size.width} height={size.height} onPicture={!!backdrop} moving={!!backdrop} />
      )}

      {size.height > 0 &&
        state.items
          .filter((i) => i.status === 'active')
          .map((item) => {
            const { top, left } = place(item);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={describe ? describe(item) : item.label}
                onPress={() => onTap(item.id)}
                style={{
                  position: 'absolute',
                  top,
                  left,
                  width: SPRITE_W,
                  height: SPRITE_H,
                  alignItems: 'center',
                  justifyContent: bare ? 'center' : undefined,
                }}
              >
                {bare ? (
                  <Art name={item.art} size={BARE_ART} rotate={rotateFor?.(item)} />
                ) : (
                  <Sprite
                    art={item.art}
                    label={item.label}
                    size={TILE}
                    rotate={rotateFor?.(item)}
                    framed={!!backdrop}
                  />
                )}
              </Pressable>
            );
          })}

      {marks.map((m) => (
        <View
          key={m.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: m.y + 4,
            left: m.x + (SPRITE_W - 48) / 2,
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: m.ok ? colors.success : colors.dangerSoft,
            // The ink ring keeps a check visible over a light picture, where
            // the green fill alone blends in.
            borderWidth: 2,
            borderStyle: m.ok ? 'solid' : 'dashed',
            borderColor: m.ok ? colors.ink : colors.danger,
          }}
        >
          <Ionicons
            name={m.ok ? 'checkmark' : 'remove-circle-outline'}
            size={30}
            color={m.ok ? colors.ink : colors.danger}
          />
        </View>
      ))}
    </>
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.xs }}>
      <Text variant="heading" center>
        {prompt}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        {`${remaining} ${targetNoun ? `${targetNoun} ` : ''}left to find`}
      </Text>

      <SurfaceProvider value="surface">
        {backdrop ? (
          <Backdrop source={backdrop} onLayout={onLayout} testID="falling-board" flow={flow}>
            {pieces}
          </Backdrop>
        ) : (
          <View
            onLayout={onLayout}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              overflow: 'hidden',
            }}
          >
            {pieces}
          </View>
        )}
      </SurfaceProvider>
    </View>
  );
}

/**
 * Faint arrows showing the current runs downward. Decorative only. Over a
 * flowing picture they drift down with the water, at its speed, so arrows and
 * water tell the same story; still under Reduce Motion.
 */
function FlowChevrons({
  width,
  height,
  onPicture,
  moving,
}: {
  width: number;
  height: number;
  onPicture: boolean;
  moving: boolean;
}) {
  const reduce = useReduceMotion();
  const cols = [0.2, 0.5, 0.8];
  const rows = Math.max(3, Math.floor(height / 90));
  const step = height / rows;
  const drift = moving && !reduce;
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drift) return;
    shift.setValue(0);
    // One row's travel, then back: the pattern repeats every row, so the
    // jump is invisible.
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: step,
        duration: (step / WATER_SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [drift, step, shift]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', width, height, transform: drift ? [{ translateY: shift }] : undefined }}
    >
      {cols.map((cx) =>
        // One extra row above the top edge, which the drift brings into view.
        Array.from({ length: rows + (drift ? 1 : 0) }).map((_, r) => (
          <Ionicons
            key={`${cx}-${r}`}
            name="chevron-down"
            size={28}
            // Faint on the plain board; on a picture, a pale wash that shows
            // over water or rock without competing with the pieces.
            color={onPicture ? `${colors.text}66` : colors.divider}
            style={{ position: 'absolute', left: cx * width - 14, top: (r + 0.5) * step - 14 - (drift ? step : 0) }}
          />
        ))
      )}
    </Animated.View>
  );
}

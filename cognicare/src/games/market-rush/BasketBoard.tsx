import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Pressable, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { ArtName } from '@/art/names';
import { Backdrop } from '@/games/shared/Backdrop';
import {
  advance,
  createEngine,
  summarise,
  tap,
  totalTargets,
  type EngineState,
  type Faller,
  type FallerSpec,
} from '@/games/shared/falling';
import { Sprite } from '@/games/shared/pieces';
import type { RoundResult } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import type { Surface } from '@/theme/contrast';
import { Card, SurfaceProvider, Text } from '@/ui';
import { Basket, BASKET_H, BASKET_W } from './Basket';
import {
  createClock,
  isOverBasket,
  ITEM_H,
  ITEM_W,
  SHELF_H,
  setPaused,
  shoppingDone,
  stillOnList,
  tickClock,
  type Clock,
} from './rules';

const TICK_MS = 33;
const TILE = 56;
// Card and basket-strip sizes live in rules.ts, beside the lane layout that
// keeps cards of exactly this size from overlapping.
const CARD_W = ITEM_W; // wide enough for "Toothpaste"
const CARD_H = ITEM_H;
/** The strip at the bottom that belongs to the basket; items never fall into it. */
const SHELF = SHELF_H;
const NOTE_MS = 900;
/** How long the full basket stays up before the turn screen. */
const END_MS = 2400;
/** A release this soon after a drag is the drag ending, not a separate tap. */
const TAP_AFTER_DRAG_MS = 350;

type Drag = { id: number; ox: number; oy: number; x: number; y: number; over: boolean };
type Note = { key: number; kind: 'plus' | 'wrong' };
type Handlers = {
  grab: (id: number) => void;
  move: (id: number, dx: number, dy: number) => void;
  drop: (id: number) => void;
  tapIn: (id: number) => void;
};

type Props = {
  specs: FallerSpec[];
  durationMs: number;
  backdrop: ImageSourcePropType;
  onFinish: (result: RoundResult) => void;
};

/**
 * Market Rush's aisle: items come down, the player drags the ones from their
 * list into the basket at the bottom. A tap does the same — drag is how the
 * game is taught, but a tremor, stiff fingers or a screen reader must not
 * lock anyone out of it.
 *
 * Scoring is the shared falling engine's: an item in the basket is a tap. A
 * list item there is a hit; anything else is a false alarm; a list item that
 * falls away is a miss. The three stay separate, as everywhere.
 */
export function BasketBoard({ specs, durationMs, backdrop, onFinish }: Props) {
  const engine = useRef<EngineState>(createEngine(durationMs, specs));
  const clock = useRef<Clock>(createClock(Date.now()));
  const ending = useRef(false);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs, not state, for anything a gesture reads: two events can land in
  // one render tick, and state read there would be stale.
  const drag = useRef<Drag | null>(null);
  const lastDragEnd = useRef(0);
  const handlers = useRef<Handlers>(null as unknown as Handlers);

  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [held, setHeld] = useState<Drag | null>(null);
  const [basket, setBasket] = useState<ArtName[]>([]);
  const [note, setNote] = useState<Note | null>(null);
  const [ended, setEnded] = useState(false);

  const aisleH = Math.max(0, size.height - SHELF);
  const basketBox = {
    x: (size.width - BASKET_W) / 2,
    y: size.height - BASKET_H - space.sm,
    width: BASKET_W,
    height: BASKET_H,
  };

  const place = (item: Faller) => ({
    left: item.x * Math.max(0, size.width - CARD_W),
    top: item.progress * Math.max(0, aisleH - CARD_H),
  });

  const endTurn = useCallback(() => {
    if (ending.current) return;
    ending.current = true;
    setEnded(true);
    endTimer.current = setTimeout(() => onFinish(summarise(engine.current)), END_MS);
  }, [onFinish]);

  // Leaving mid-turn (the quit dialog) unmounts the board; the finished-turn
  // callback must not fire after that and record a turn nobody finished.
  useEffect(() => () => {
    if (endTimer.current) clearTimeout(endTimer.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending.current) return;
      const t = tickClock(clock.current, Date.now());
      advance(engine.current, t);
      if (!clock.current.paused) setFrame((f) => f + 1);
      if (shoppingDone(engine.current) || t >= durationMs) endTurn();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [durationMs, endTurn]);

  const flash = (kind: Note['kind']) => {
    const key = Date.now();
    setNote({ key, kind });
    setTimeout(() => setNote((n) => (n?.key === key ? null : n)), NOTE_MS);
  };

  const putInBasket = (id: number) => {
    const state = engine.current;
    const item = state.items.find((i) => i.id === id);
    if (!item || item.status !== 'active' || ending.current) return;

    // While an item is carried the clock is paused, so this is the pickup time.
    tap(state, id, tickClock(clock.current, Date.now()));

    if (item.kind === 'target') {
      setBasket((b) => [...b, item.art]);
      flash('plus');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      flash('wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setFrame((f) => f + 1);
    if (shoppingDone(state)) endTurn();
  };

  handlers.current = {
    grab: (id) => {
      if (drag.current || ending.current) return;
      const item = engine.current.items.find((i) => i.id === id && i.status === 'active');
      if (!item) return;
      setPaused(clock.current, true, Date.now());
      const at = place(item);
      drag.current = { id, ox: at.left, oy: at.top, x: at.left, y: at.top, over: false };
      setHeld(drag.current);
    },
    move: (id, dx, dy) => {
      const d = drag.current;
      if (!d || d.id !== id) return;
      const x = d.ox + dx;
      const y = d.oy + dy;
      const over = isOverBasket({ x: x + CARD_W / 2, y: y + CARD_H / 2 }, basketBox);
      drag.current = { ...d, x, y, over };
      setHeld(drag.current);
    },
    drop: (id) => {
      const d = drag.current;
      if (!d || d.id !== id) return;
      drag.current = null;
      setHeld(null);
      lastDragEnd.current = Date.now();
      // Let go over the basket: in it goes. Anywhere else: the item simply
      // goes back to its place in the aisle — no penalty for a change of mind.
      if (d.over) putInBasket(id);
      setPaused(clock.current, false, Date.now());
    },
    tapIn: (id) => {
      if (drag.current || Date.now() - lastDragEnd.current < TAP_AFTER_DRAG_MS) return;
      putInBasket(id);
    },
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const state = engine.current;
  const targets = totalTargets(state);
  const missed = ended ? stillOnList(state) : [];

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, gap: space.xs }}>
      <Text variant="heading" center>
        Drag list items to the basket
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        {`${state.hits} of ${targets} in the basket · Score ${state.score}`}
      </Text>

      <Backdrop source={backdrop} onLayout={onLayout} testID="aisle">
        {size.height > 0 &&
          state.items
            .filter((i) => i.status === 'active')
            .map((item) => {
              const lifted = held?.id === item.id;
              const at = lifted ? { left: held.x, top: held.y } : place(item);
              // Fade out near the bottom, so an item that reaches the basket
              // strip never looks as if it dropped in by itself.
              const fade = !lifted && item.progress > 0.8 ? Math.max(0.15, 1 - (item.progress - 0.8) / 0.2) : 1;
              return (
                <Item
                  key={item.id}
                  item={item}
                  left={at.left}
                  top={at.top}
                  opacity={fade}
                  lifted={lifted}
                  handlers={handlers}
                />
              );
            })}

        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: basketBox.x, top: basketBox.y, zIndex: 1 }}
        >
          <Basket items={basket} glowing={!!held?.over} />
        </View>

        {note && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: SHELF + space.xs, alignItems: 'center', zIndex: 3 }}
          >
            {note.kind === 'plus' ? (
              <Pill surface="successSoft" icon="checkmark-circle" color="success" text="+10" />
            ) : (
              <Pill surface="dangerSoft" icon="remove-circle-outline" color="danger" text="Not on your list" dashed />
            )}
          </View>
        )}

        {ended && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: aisleH, justifyContent: 'center', padding: space.md, zIndex: 4 }}
          >
            <Card style={{ gap: space.sm }}>
              <Text variant="title">{state.hits === targets ? 'Shopping complete!' : 'Shopping done'}</Text>
              <Text variant="body">
                {state.hits} of {targets} items from your list are in your basket.
              </Text>
              {missed.length > 0 && (
                <Text variant="body" color="textMuted">
                  Still on your list: {missed.map((m) => m.label).join(', ')}
                </Text>
              )}
            </Card>
          </View>
        )}
      </Backdrop>
    </View>
  );
}

/* --------------------------------- pieces --------------------------------- */

type ItemProps = {
  item: Faller;
  left: number;
  top: number;
  opacity: number;
  lifted: boolean;
  handlers: RefObject<Handlers>;
};

/**
 * One item in the aisle. The pan runs through gesture-handler; the tap is a
 * plain Pressable, which also gives TalkBack its double-tap. When a drag
 * starts, gesture-handler cancels the press, so a drag never also taps.
 */
function Item({ item, left, top, opacity, lifted, handlers }: ItemProps) {
  // Where the finger first touched. Movement is measured from here, not with
  // translationX/Y: on the web those count from where the pan ACTIVATED, 12dp
  // later, so the item trailed the finger and a drop aimed at the basket fell
  // short of it. From touch-down, it is the same on every platform.
  const down = useRef({ x: 0, y: 0 });
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(`item-${item.id}`)
        .runOnJS(true)
        .minDistance(12) // a shaky tap is still a tap
        .onBegin((e) => {
          down.current = { x: e.absoluteX, y: e.absoluteY };
        })
        .onStart(() => handlers.current?.grab(item.id))
        .onUpdate((e) =>
          handlers.current?.move(item.id, e.absoluteX - down.current.x, e.absoluteY - down.current.y)
        )
        .onFinalize(() => handlers.current?.drop(item.id)),
    [item.id, handlers]
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        style={{
          position: 'absolute',
          left,
          top,
          width: CARD_W,
          opacity,
          zIndex: lifted ? 5 : 2,
          transform: lifted ? [{ scale: 1.08 }] : undefined,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityHint="Puts it in the basket"
          onPress={() => handlers.current?.tapIn(item.id)}
        >
          <Sprite framed width={CARD_W} art={item.art} label={item.label} size={TILE} />
        </Pressable>
      </View>
    </GestureDetector>
  );
}

function Pill({
  surface,
  icon,
  color,
  text,
  dashed = false,
}: {
  surface: Surface;
  icon: keyof typeof Ionicons.glyphMap;
  color: 'success' | 'danger';
  text: string;
  dashed?: boolean;
}) {
  const fill = surface === 'successSoft' ? colors.successSoft : colors.dangerSoft;
  const edge = color === 'success' ? colors.success : colors.danger;
  return (
    <SurfaceProvider value={surface}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          borderRadius: radius.pill,
          backgroundColor: fill,
          borderWidth: 2,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: edge,
        }}
      >
        <Ionicons name={icon} size={24} color={edge} />
        <Text variant="label" color={color}>
          {text}
        </Text>
      </View>
    </SurfaceProvider>
  );
}

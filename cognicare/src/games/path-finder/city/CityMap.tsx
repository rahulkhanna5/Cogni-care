import { useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { radius } from '@/theme/tokens';
import { isClosedOn, type Graph } from '../engine/graph';
import { nearestTarget } from '../engine/hit';
import { landmark } from '../engine/level';
import { nextRoads, type Target } from '../engine/route';
import type { CityLevel, NodeId, Trip } from '../engine/types';
import type { Fit } from './projection';
import { RouteLayer } from './RouteLayer';
import { Scenery } from './Scenery';

type Props = {
  g: Graph;
  trip: Trip;
  fit: Fit;
  route: NodeId[];
  /** Shown dashed once the route has been checked. */
  best?: NodeId[];
  disabled: boolean;
  /** null: a tap on grass or a roof — nothing to walk to. */
  onTarget: (t: Target | null) => void;
};

/**
 * The map: memoised scenery, the route on top, and one tap gesture over the
 * lot that picks the nearest crossroad or road (engine/hit.ts) — a thin line
 * never has to be hit exactly. Under the gesture layer, each crossroad is an
 * invisible accessible button, so a screen reader can walk the town too.
 */
export function CityMap({ g, trip, fit, route, best, disabled, onTarget }: Props) {
  const handler = useRef(onTarget);
  handler.current = onTarget;

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .withTestId('city-map')
        .runOnJS(true)
        // A slow, careful press is still a tap.
        .maxDuration(2500)
        .maxDistance(24)
        .enabled(!disabled)
        .onEnd((e, success) => {
          if (success) handler.current(nearestTarget(g, fit.toScreen, { x: e.x, y: e.y }));
        }),
    [g, fit, disabled]
  );

  const here = route[route.length - 1];
  const next = disabled ? [] : nextRoads(g, trip, route);
  const dest = landmark(g.level, trip.to).door;
  const button = Math.min(56, fit.scale * 0.7);

  return (
    <View style={{ width: fit.width, height: fit.height, borderRadius: radius.md, overflow: 'hidden' }}>
      <Scenery level={g.level} fit={fit} trip={trip} />
      <RouteLayer g={g} fit={fit} trip={trip} route={route} next={next} best={best} />

      {g.level.nodes.map((n) => {
        const p = fit.toScreen(n);
        const road = g.roadBetween(here, n.id);
        const state =
          n.id === here
            ? 'you are here'
            : road && isClosedOn(trip, road)
              ? 'the road there is closed'
              : road
                ? 'you can walk here'
                : '';
        const name = [placeName(g.level, n.id), state, n.id === dest && n.id !== here ? 'destination' : '']
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={n.id}
            testID={`node-${n.id}`}
            accessibilityRole="button"
            accessibilityLabel={name}
            disabled={disabled}
            onPress={() => onTarget({ kind: 'node', id: n.id })}
            style={{ position: 'absolute', left: p.x - button / 2, top: p.y - button / 2, width: button, height: button }}
          />
        );
      })}

      <GestureDetector gesture={tap}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: 0, top: 0, width: fit.width, height: fit.height }}
        />
      </GestureDetector>
    </View>
  );
}

const LOT_WORD = { houses: 'the houses', shops: 'the shops', trees: 'the trees', park: 'the park' } as const;

/** "Crossroad C2, by the park and the river" — a name a listener can place. */
export function placeName(level: CityLevel, id: NodeId): string {
  const door = level.landmarks.find((l) => l.door === id);
  if (door?.kind === 'park') return `The fountain in the ${door.label.toLowerCase()}`;
  const n = level.nodes.find((x) => x.id === id)!;
  const near: string[] = [];
  if (door) near.push(`the ${door.label.toLowerCase()}`);
  for (const lot of level.lots) {
    const corner = [lot.rect.x0, lot.rect.x1].includes(n.x) && [lot.rect.y0, lot.rect.y1].includes(n.y);
    if (!corner) continue;
    const mark = lot.landmark ? level.landmarks.find((l) => l.id === lot.landmark) : undefined;
    const word = mark ? `the ${mark.label.toLowerCase()}` : LOT_WORD[lot.use as keyof typeof LOT_WORD];
    if (word && !near.includes(word)) near.push(word);
  }
  if (level.water.some((w) => Math.abs(n.y - w.y0) < 0.3 || Math.abs(n.y - w.y1) < 0.3)) near.push('the river');
  const by = near.slice(0, 2);
  return `Crossroad ${id.toUpperCase()}${by.length ? `, by ${by.join(' and ')}` : ''}`;
}


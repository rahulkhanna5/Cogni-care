import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Button, Card, SurfaceProvider, Text, type IconName } from '@/ui';
import { CityMap } from './city/CityMap';
import { fitCity } from './city/projection';
import { initialState, reducer, type GameState } from './engine/game';
import { buildGraph, type Graph } from './engine/graph';
import { landmark, tripFor } from './engine/level';
import { evaluate } from './engine/rules';
import { shortfalls, toRoundResult, verdict } from './engine/score';
import type { CityLevel, Trip } from './engine/types';
import { pathLevel } from './levels';

/** How long a note ("that road is closed") stays up. */
const NOTE_MS = 2600;
/**
 * Height the screen needs besides the map: GameShell's header, the
 * instruction card, the stats and the buttons. The map gets the rest.
 */
const RESERVED = 480;
/** Below this the crossroads crowd; the screen scrolls instead. */
const MIN_MAP = 330;
/**
 * Dp per map unit below which crossroads crowd each other. A tall town gets
 * the height it needs and the page scrolls, rather than being squeezed.
 */
const MIN_SCALE = 62;

/**
 * Path Finder: plan a walk across an illustrated town, then check it. One trip
 * per GameShell turn — trip 1 of the level on turn 1, and so on. The player
 * builds the route a crossroad (or a road) at a time; Check route scores it on
 * distance, safety and planning (engine/score.ts) and draws the best route
 * dashed when theirs was not it.
 */
export function PathFinder({ level, roundNo, totalRounds, onRoundComplete }: GamePlayProps) {
  const city = pathLevel(level);
  const trip = tripFor(city, roundNo);
  const g = useMemo(() => buildGraph(city), [city]);
  const run = useMemo(() => reducer(g, trip), [g, trip]);
  const [s, dispatch] = useReducer(run, undefined, () => initialState(g, trip));
  const { width, height } = useWindowDimensions();
  const fit = useMemo(
    () =>
      fitCity(
        city.bounds,
        width - space.gutter * 2,
        Math.max(MIN_MAP, height - RESERVED, (city.bounds.y1 - city.bounds.y0) * MIN_SCALE)
      ),
    [city, width, height]
  );
  const startedAt = useRef(Date.now());

  // A note clears itself; a new one restarts the clock.
  useEffect(() => {
    if (!s.note) return;
    const t = setTimeout(() => dispatch({ type: 'clear-note' }), NOTE_MS);
    return () => clearTimeout(t);
  }, [s.note]);

  // Feel each step; feel a closed road differently.
  const steps = useRef(s.route.length);
  const closed = useRef(s.closedTaps);
  useEffect(() => {
    if (s.route.length > steps.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (s.closedTaps > closed.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    steps.current = s.route.length;
    closed.current = s.closedTaps;
  }, [s.route.length, s.closedTaps]);

  const planning = s.phase === 'planning';
  const shown = s.evaluation && verdict(s.evaluation) === 'made-it' ? s.evaluation.best : undefined;

  return (
    // Scrolls only on a small phone, where the map keeps its minimum size.
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: space.gutter,
        gap: space.sm,
        paddingBottom: space.md,
      }}
    >
      <Card style={{ padding: space.md, gap: 2 }}>
        <Text variant="caption" color="textMuted">
          {`Walk ${roundNo} of ${totalRounds} · ${trip.title}`}
        </Text>
        <Text variant="label">{trip.instruction}</Text>
      </Card>

      <View style={{ alignItems: 'center' }}>
        <CityMap
          g={g}
          trip={trip}
          fit={fit}
          route={s.route}
          best={shown}
          disabled={!planning}
          onTarget={(target) => dispatch({ type: 'tap', target })}
        />
      </View>

      {planning ? (
        <Planning
          g={g}
          trip={trip}
          s={s}
          onCheck={() =>
            dispatch({
              type: 'check',
              elapsedMs: Date.now() - startedAt.current,
            })
          }
          dispatch={dispatch}
        />
      ) : (
        <Result
          city={city}
          s={s}
          onContinue={() => onRoundComplete(toRoundResult(s.evaluation!, s.breakdown!, s.closedTaps, s.elapsedMs ?? 0))}
        />
      )}
    </ScrollView>
  );
}

/* ------------------------------- planning -------------------------------- */

function Planning({
  g,
  trip,
  s,
  onCheck,
  dispatch,
}: {
  g: Graph;
  trip: Trip;
  s: GameState;
  onCheck: () => void;
  dispatch: (a: { type: 'back' } | { type: 'reset' }) => void;
}) {
  const ev = useMemo(() => evaluate(g, trip, s.route), [g, trip, s.route]);
  const to = landmark(g.level, trip.to);
  const via = trip.via ?? [];

  return (
    <View style={{ gap: space.sm }}>
      {/* One line, fixed height: a note replaces the stats, so nothing below moves. */}
      <View style={{ minHeight: 60, justifyContent: 'center' }}>
        {s.note ? (
          <Note tone={s.note.tone} text={s.note.text} />
        ) : (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Stat label="Distance" value={`${ev.metres} m`} icon="footsteps-outline" />
            <Stat
              label="Safety"
              value={ev.busyMetres ? 'Busy road' : 'Safe'}
              icon={ev.busyMetres ? 'warning-outline' : 'shield-checkmark-outline'}
            />
            {via.length ? (
              <Stat
                label="Stops"
                value={`${via.length - ev.missedStops.length} of ${via.length}`}
                icon="flag-outline"
              />
            ) : (
              <Stat label="Going to" value={to.label} icon="flag-outline" />
            )}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Undo step"
            variant="secondary"
            icon="arrow-undo"
            disabled={s.route.length < 2}
            onPress={() => dispatch({ type: 'back' })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Start over"
            variant="secondary"
            icon="refresh"
            disabled={s.route.length < 2}
            onPress={() => dispatch({ type: 'reset' })}
          />
        </View>
      </View>
      <Button
        label="Check route"
        icon="checkmark-done"
        disabled={!ev.reached}
        disabledReason={`Walk all the way to the ${to.label.toLowerCase()} first.`}
        onPress={onCheck}
      />
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <SurfaceProvider value="surface">
      <View
        accessible
        accessibilityLabel={`${label}: ${value}`}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingVertical: 6,
          paddingHorizontal: space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={icon} size={16} color={colors.textMuted} />
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text variant="label" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </SurfaceProvider>
  );
}

function Note({ tone, text }: { tone: 'info' | 'warning'; text: string }) {
  const warn = tone === 'warning';
  return (
    <SurfaceProvider value={warn ? 'warningSoft' : 'raised'}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: warn ? colors.warningSoft : colors.surfaceRaised,
          borderColor: warn ? colors.warning : colors.edge,
          borderWidth: 2,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: 6,
        }}
      >
        <Ionicons
          name={warn ? 'construct-outline' : 'walk-outline'}
          size={22}
          color={warn ? colors.warning : colors.edge}
        />
        <Text variant="caption" style={{ flex: 1 }}>
          {text}
        </Text>
      </View>
    </SurfaceProvider>
  );
}

/* -------------------------------- result --------------------------------- */

function Result({ city, s, onContinue }: { city: CityLevel; s: GameState; onContinue: () => void }) {
  const ev = s.evaluation!;
  const b = s.breakdown!;
  const great = verdict(ev) === 'great';
  const w = city.weights;
  const lines = shortfalls(ev, city, s.corrections);

  return (
    <View style={{ gap: space.sm }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons
          name={great ? 'star' : 'checkmark-circle'}
          size={28}
          color={great ? colors.warning : colors.success}
        />
        <Text variant="heading" style={{ flex: 1 }}>
          {great ? 'Great planning!' : 'You made it!'}
        </Text>
        <Text variant="heading" color="accent">{`${b.total} / 100`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Stat label="Distance" value={`${b.distance} / ${w.distance}`} icon="footsteps-outline" />
        <Stat label="Safety" value={`${b.safety} / ${w.safety}`} icon="shield-checkmark-outline" />
        <Stat label="Planning" value={`${b.planning} / ${w.planning}`} icon="map-outline" />
      </View>
      {lines.map((line) => (
        <Text key={line} variant="caption">
          {line}
        </Text>
      ))}
      <Button label="Continue" icon="arrow-forward" onPress={onContinue} />
    </View>
  );
}

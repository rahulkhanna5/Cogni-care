import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

import type { GamePlayProps } from '@/games/shell/types';
import { colors, radius, space } from '@/theme/tokens';
import { Banner, Button, Text } from '@/ui';
import { pathLevel } from './levels';
import { TownSprite } from './sprites';
import {
  blockOnReturn,
  canStep,
  edgeKey,
  generateTown,
  neighbours,
  placeForTurn,
  PLACE_NAME,
  roadsIn,
  same,
  shortestWay,
  tripAccuracy,
  type Node,
  type Town,
} from './town';

type Props = GamePlayProps & { random?: () => number };

/** Long enough to read the result before the next trip. */
const RESULT_MS = 1800;
/** How long "that road is blocked" and similar notes stay up. */
const NOTE_MS = 1800;

/** Map colours: scenery, not information — nothing is told by colour alone. */
const GRASS = '#6E9E57';
const ROAD = '#56524E';
const ROUTE = '#FFD54A';

type Note = { tone: 'info' | 'warning' | 'success'; text: string };

/**
 * Path Finder, as a walk across town. Each turn is a trip to one place —
 * the hospital, then the school, then the police station — and back home.
 * The player taps crossroads one at a time along open roads; road blocks
 * (a broken road, an accident, roadworks) must be walked round. On the way
 * back an accident closes a road they just used, so the route that worked
 * has to be re-planned.
 *
 * Scoring is unchanged: each trip scores shortest ÷ taken, and a trip longer
 * than the shortest way is a detour — a planning error, kept as a false alarm.
 */
export function PathFinder({ level, roundNo, onRoundComplete, random = Math.random }: Props) {
  const spec = pathLevel(level);
  const place = placeForTurn(roundNo);
  const { width, height } = useWindowDimensions();

  const first = useMemo(
    () => generateTown(spec, place, random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, roundNo]
  );

  const [town, setTown] = useState<Town>(first);
  const [trip, setTrip] = useState<0 | 1>(0);
  const from = trip === 0 ? town.home.door : town.destination.door;
  const to = trip === 0 ? town.destination.door : town.home.door;
  const [route, setRoute] = useState<Node[]>([first.home.door]);
  const [note, setNote] = useState<Note | null>(null);
  const [standing, setStanding] = useState<Note>({
    tone: 'info',
    text: `Tap the crossroads to walk to the ${PLACE_NAME[place].toLowerCase()}.`,
  });

  const shortest = useMemo(() => roadsIn(shortestWay(town.n, town.blocks, from, to) ?? []), [town, from, to]);
  const scores = useRef<number[]>([]);
  const latencies = useRef<number[]>([]);
  const detours = useRef(0);
  const startedAt = useRef(Date.now());
  const locked = useRef(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (n: Note) => {
    setNote(n);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
  };

  const finishTrip = useCallback(
    (finalRoute: Node[]) => {
      locked.current = true;
      const accuracy = tripAccuracy(finalRoute, to, shortest);
      scores.current.push(accuracy);
      latencies.current.push(Date.now() - startedAt.current);
      if (accuracy < 1) detours.current += 1;
      const extra = roadsIn(finalRoute) - shortest;
      if (noteTimer.current) clearTimeout(noteTimer.current);
      setNote({
        tone: 'success',
        text:
          extra <= 0
            ? 'The shortest way — well done.'
            : `You made it — ${extra} ${extra === 1 ? 'road' : 'roads'} longer than the shortest way.`,
      });

      setTimeout(() => {
        setNote(null);
        if (trip === 0) {
          // An accident on a road they just used: the way that worked is
          // not the way back.
          const back = blockOnReturn(town, finalRoute, random);
          const added = Object.keys(back.blocks).length > Object.keys(town.blocks).length;
          setTown(back);
          setTrip(1);
          setRoute([town.destination.door]);
          setStanding({
            tone: added ? 'warning' : 'info',
            text: added
              ? 'An accident has blocked a road you used. Find another way home.'
              : 'Now walk back home.',
          });
          startedAt.current = Date.now();
          locked.current = false;
          return;
        }

        const mean = scores.current.reduce((a, b) => a + b, 0) / scores.current.length;
        onRoundComplete({
          hits: scores.current.filter((s) => s > 0).length,
          misses: scores.current.filter((s) => s === 0).length,
          // A detour is a planning error, not a wrong button — recorded as a
          // false alarm so it stays visible in the round data.
          falseAlarms: detours.current,
          accuracy: mean,
          avgReactionMs: Math.round(latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length),
          score: Math.round(mean * 50),
        });
      }, RESULT_MS);
    },
    [onRoundComplete, random, shortest, to, town, trip]
  );

  const onCrossroad = (next: Node) => {
    if (locked.current) return;
    const at = route[route.length - 1];
    // Tapping where you are steps back — undo without reaching for a button.
    if (route.length > 1 && same(next, at)) {
      setRoute((r) => r.slice(0, -1));
      return;
    }
    const step = canStep(town, route, next);
    if (step === 'blocked') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      flash({ tone: 'warning', text: 'That road is blocked — find a way round.' });
      return;
    }
    if (step === 'not-next') {
      flash({ tone: 'info', text: 'Walk one crossroad at a time, along a road — the ringed ones.' });
      return;
    }
    if (step === 'visited') {
      flash({ tone: 'info', text: 'You have been there already. Use "Back one step" to change the way.' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const walked = [...route, next];
    setRoute(walked);
    if (same(next, to)) finishTrip(walked);
  };

  // A square map, as large as fits under the prompt and above the controls.
  const board = Math.max(260, Math.min(width - space.gutter * 2, 440, height - 380));
  const message = note ?? standing;

  return (
    <View style={{ flex: 1, paddingHorizontal: space.gutter, alignItems: 'center', gap: space.xs }}>
      <Text variant="heading" center>
        {trip === 0 ? `Go to the ${PLACE_NAME[place].toLowerCase()}` : 'Now go back home'}
      </Text>
      <Text variant="body" color="textMuted" center style={{ marginBottom: space.sm }}>
        {`Trip ${trip + 1} of 2 · ${roadsIn(route)} ${roadsIn(route) === 1 ? 'road' : 'roads'} so far`}
      </Text>

      <TownMap town={town} route={route} to={to} size={board} onCrossroad={onCrossroad} />

      {/* Fixed height, so a message appearing never moves the map. */}
      <View style={{ alignSelf: 'stretch', minHeight: 72, justifyContent: 'center', marginTop: space.sm }}>
        <Banner tone={message.tone} icon={message.tone === 'warning' ? 'warning-outline' : message.tone === 'success' ? 'checkmark-circle' : 'walk-outline'}>
          {message.text}
        </Banner>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Back one step"
            variant="secondary"
            icon="arrow-undo"
            disabled={route.length < 2 || locked.current}
            onPress={() => setRoute((r) => r.slice(0, -1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Start over"
            variant="secondary"
            icon="refresh"
            disabled={route.length < 2 || locked.current}
            onPress={() => setRoute([from])}
          />
        </View>
      </View>
    </View>
  );
}

/* --------------------------------- the map -------------------------------- */

function TownMap({
  town,
  route,
  to,
  size,
  onCrossroad,
}: {
  town: Town;
  route: Node[];
  to: Node;
  size: number;
  onCrossroad: (n: Node) => void;
}) {
  const { n } = town;
  const pad = Math.max(26, size * 0.08);
  const step = (size - pad * 2) / (n - 1);
  const road = Math.max(18, Math.min(34, step * 0.3));
  const x = (c: number) => pad + c * step;
  const y = (r: number) => pad + r * step;
  const here = route[route.length - 1];

  // Crossroads the player can walk to next: next door, open road, not yet walked.
  const next = neighbours(n, here).filter((p) => canStep(town, route, p) === 'ok');
  const isNext = (p: Node) => next.some((q) => same(q, p));
  const onRoute = (p: Node) => route.some((q) => same(q, p));
  const target = Math.min(64, Math.max(48, step * 0.8));
  const sprite = (step - road) * 0.86;

  const roads: [Node, Node][] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (c + 1 < n) roads.push([{ r, c }, { r, c: c + 1 }]);
      if (r + 1 < n) roads.push([{ r, c }, { r: r + 1, c }]);
    }

  const destCell = town.destination.cell;

  return (
    <View style={{ width: size, height: size, borderRadius: radius.lg, overflow: 'hidden' }}>
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} fill={GRASS} />
        {/* Roads, then their centre dashes. */}
        {roads.map(([a, b]) => (
          <Line key={`r${edgeKey(a, b)}`} x1={x(a.c)} y1={y(a.r)} x2={x(b.c)} y2={y(b.r)} stroke={ROAD} strokeWidth={road} strokeLinecap="square" />
        ))}
        {roads.map(([a, b]) => (
          <Line
            key={`d${edgeKey(a, b)}`}
            x1={x(a.c)}
            y1={y(a.r)}
            x2={x(b.c)}
            y2={y(b.r)}
            stroke="#EDE6E3"
            strokeWidth={2}
            strokeDasharray="8 8"
            opacity={0.7}
          />
        ))}
        {/* The walked route: a wide soft glow under a bright line. */}
        {route.length > 1 && (
          <>
            <Polyline
              points={route.map((p) => `${x(p.c)},${y(p.r)}`).join(' ')}
              fill="none"
              stroke={ROUTE}
              strokeOpacity={0.45}
              strokeWidth={road * 0.95}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={route.map((p) => `${x(p.c)},${y(p.r)}`).join(' ')}
              fill="none"
              stroke={ROUTE}
              strokeWidth={road * 0.35}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {/* The destination's block, ringed, so it can be found at a glance. */}
        <Rect
          x={x(destCell.c) + road / 2 + 3}
          y={y(destCell.r) + road / 2 + 3}
          width={step - road - 6}
          height={step - road - 6}
          rx={10}
          fill="none"
          stroke={colors.accent}
          strokeWidth={4}
        />
      </Svg>

      {/* Buildings and scenery in the grass blocks. */}
      {town.cells.map((row, r) =>
        row.map((art, c) => (
          <View
            key={`b${r}-${c}`}
            pointerEvents="none"
            style={{ position: 'absolute', left: x(c) + step / 2 - sprite / 2, top: y(r) + step / 2 - sprite / 2 }}
          >
            <TownSprite art={art} size={sprite} />
          </View>
        ))
      )}

      {/* Road blocks, on the middle of the road they close. */}
      {Object.entries(town.blocks).map(([key, kind]) => {
        const [[ar, ac], [br, bc]] = key.split('|').map((p) => p.split(',').map(Number));
        const s = Math.min(step * 0.62, 56);
        return (
          <View
            key={`k${key}`}
            pointerEvents="none"
            style={{ position: 'absolute', left: (x(ac) + x(bc)) / 2 - s / 2, top: (y(ar) + y(br)) / 2 - s / 2 }}
          >
            <TownSprite art={kind} size={s} />
          </View>
        );
      })}

      {/* Crossroads: the tap targets. */}
      {Array.from({ length: n }).map((_, r) =>
        Array.from({ length: n }).map((__, c) => {
          const p = { r, c };
          const current = same(p, route[route.length - 1]);
          const door = same(p, to);
          return (
            <Pressable
              key={`n${r}-${c}`}
              accessibilityRole="button"
              accessibilityLabel={`Crossroad ${r + 1}, ${c + 1}${current ? ', you are here' : door ? ', destination' : isNext(p) ? ', you can walk here' : ''}`}
              onPress={() => onCrossroad(p)}
              style={{
                position: 'absolute',
                left: x(c) - target / 2,
                top: y(r) - target / 2,
                width: target,
                height: target,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {current ? (
                <View style={dot(30, colors.accent, colors.ink, 3)}>
                  <Ionicons name="walk" size={20} color={colors.ink} />
                </View>
              ) : door ? (
                <View style={dot(30, '#FFFFFF', colors.ink, 3)}>
                  <Ionicons name="flag" size={18} color={colors.accent} />
                </View>
              ) : isNext(p) ? (
                // "You can go here": a light ring with a coral halo — a shape
                // as well as a colour.
                <View style={[dot(24, 'rgba(255,255,255,0.35)', '#FFFFFF', 3), { borderColor: '#FFFFFF' }]} />
              ) : onRoute(p) ? (
                <View style={dot(12, ROUTE, colors.ink, 2)} />
              ) : (
                <View style={dot(8, '#EDE6E3', 'transparent', 0)} />
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const dot = (d: number, fill: string, edge: string, w: number) => ({
  width: d,
  height: d,
  borderRadius: d / 2,
  backgroundColor: fill,
  borderWidth: w,
  borderColor: edge,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { IconName } from '@/ui';
import { other, type Graph } from '../engine/graph';
import { landmark } from '../engine/level';
import type { LandmarkKind, NodeId, Road, Trip } from '../engine/types';
import { CITY } from './palette';
import type { Fit } from './projection';
import { ROAD_W } from './Scenery';

/**
 * What changes as the player plans: the roads they can take next (a soft
 * glow), the route walked (blue on a white halo), the best route after
 * checking (dashed), and the markers — you are here, the stops, the
 * destination. Every marker is a shape with an icon, never colour alone.
 */

type Props = {
  g: Graph;
  fit: Fit;
  trip: Trip;
  route: NodeId[];
  next: Road[];
  best?: NodeId[];
};

export const KIND_ICON: Record<LandmarkKind, IconName> = {
  home: 'home',
  clinic: 'medkit',
  pharmacy: 'medical',
  park: 'leaf',
};

export function RouteLayer({ g, fit, trip, route, next, best }: Props) {
  const s = fit.scale;
  const P = (id: NodeId) => fit.toScreen(g.node(id));
  const line = (ids: NodeId[]) =>
    ids
      .map(P)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  const here = route[route.length - 1];
  const dest = landmark(g.level, trip.to);

  // Stops reached so far, in order.
  let after = 0;
  const stops = (trip.via ?? []).map((id) => {
    const l = landmark(g.level, id);
    const at = route.indexOf(l.door, after + 1);
    if (at !== -1) after = at;
    return { l, done: at !== -1 };
  });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: fit.width, height: fit.height }}>
      <Svg width={fit.width} height={fit.height}>
        {next.map((r) => {
          const a = P(here);
          const b = P(other(r, here));
          return (
            <Line
              key={r.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CITY.glow}
              strokeOpacity={0.85}
              strokeWidth={(r.footpath ? 0.1 : ROAD_W * 0.8) * s}
              strokeLinecap="round"
            />
          );
        })}
        {best && (
          <>
            <Polyline points={line(best)} fill="none" stroke={CITY.routeHalo} strokeWidth={0.12 * s} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline
              points={line(best)}
              fill="none"
              stroke={CITY.best}
              strokeWidth={0.06 * s}
              strokeDasharray={`${0.1 * s} ${0.07 * s}`}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {route.length > 1 && (
          <>
            <Polyline points={line(route)} fill="none" stroke={CITY.routeHalo} strokeWidth={0.14 * s} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={line(route)} fill="none" stroke={CITY.route} strokeWidth={0.075 * s} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </Svg>

      {stops.map(({ l, done }) =>
        l.door === here ? null : (
          <Marker key={l.id} at={P(l.door)} size={30} fill="#FFFFFF" edge={colors.ink} icon={done ? 'checkmark' : KIND_ICON[l.kind]} ink={colors.accent} />
        )
      )}
      {dest.door !== here && <Marker at={P(dest.door)} size={34} fill="#FFFFFF" edge={colors.ink} icon="flag" ink={colors.accent} />}
      <Marker at={P(here)} size={36} fill={colors.accentBright} edge="#FFFFFF" icon="walk" ink={colors.textInverse} />
    </View>
  );
}

function Marker({
  at,
  size,
  fill,
  edge,
  icon,
  ink,
}: {
  at: { x: number; y: number };
  size: number;
  fill: string;
  edge: string;
  icon: IconName;
  ink: string;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: at.x - size / 2,
        top: at.y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        borderWidth: 3,
        borderColor: edge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.52} color={ink} />
    </View>
  );
}

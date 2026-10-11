import { memo, type ReactElement } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect } from 'react-native-svg';

import { colors, radius } from '@/theme/tokens';
import { SurfaceProvider, Text } from '@/ui';
import type { Point } from '../engine/hit';
import type { CityLevel, CityNode, Landmark, LandmarkKind, Lot, Rect as WorldRect, Road, Trip } from '../engine/types';
import { CITY } from './palette';
import { boxFaces, lotArt, ROAD_HALF, type Building, type Fit, type Tree } from './projection';

/**
 * Everything on the map that does not change while a trip is planned —
 * drawn once per trip and size (memoised), so a tap redraws only the route.
 * Back to front: ground, lots, river, park paths, bridges, roads, markings,
 * traffic, roadworks, then buildings and trees nearest-last, then labels.
 */

/** Road and pavement widths, in world units (1 = 100 m). */
export const ROAD_W = 0.2;
const KERB_W = 0.26;
const PATH_W = 0.07;
/** Markings stop short of a crossroad, so junctions stay plain asphalt. */
const JUNCTION = 0.15;

type Props = { level: CityLevel; fit: Fit; trip: Trip };

const pts = (ps: Point[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export const Scenery = memo(function Scenery({ level, fit, trip }: Props) {
  const s = fit.scale;
  const P = fit.toScreen;
  const node = (id: string) => level.nodes.find((n) => n.id === id)!;
  const ends = (r: Road): [CityNode, CityNode] => [node(r.a), node(r.b)];
  const streets = level.roads.filter((r) => !r.footpath);
  const paths = level.roads.filter((r) => r.footpath);

  // Buildings and trees, back to front by where they meet the ground.
  const standing: { y: number; el: ReactElement }[] = [];
  const labels: { landmark: Landmark; at: Point }[] = [];
  for (const lot of level.lots) {
    const art = lotArt(lot);
    const mark = lot.landmark ? level.landmarks.find((l) => l.id === lot.landmark) : undefined;
    art.buildings.forEach((b, i) =>
      standing.push({
        y: b.foot.y1,
        el: <BuildingArt key={`${lot.id}b${i}`} b={b} fit={fit} kind={mark?.kind} />,
      })
    );
    art.trees.forEach((t, i) =>
      standing.push({
        y: t.y,
        el: <TreeArt key={`${lot.id}t${i}`} t={t} fit={fit} />,
      })
    );
    if (mark)
      labels.push({
        landmark: mark,
        at: labelAt(level, lot, art.buildings[0], fit),
      });
  }
  standing.sort((a, b) => a.y - b.y);

  const fountain = level.landmarks.find((l) => l.kind === 'park');

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: fit.width,
        height: fit.height,
      }}
    >
      <Svg width={fit.width} height={fit.height}>
        <Rect x={0} y={0} width={fit.width} height={fit.height} fill={CITY.grass} />
        {level.lots.map((lot) => (
          <LotGround key={lot.id} lot={lot} fit={fit} />
        ))}

        {level.water.map((w, i) => (
          <Water key={`w${i}`} rect={w} fit={fit} />
        ))}

        {/* Park paths: gravel with a darker edge. */}
        {paths.map((r) => {
          const [a, b] = ends(r).map(P);
          return (
            <Line
              key={`pe${r.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CITY.pathEdge}
              strokeWidth={(PATH_W + 0.025) * s}
              strokeLinecap="round"
            />
          );
        })}
        {paths.map((r) => {
          const [a, b] = ends(r).map(P);
          return (
            <Line
              key={`p${r.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CITY.path}
              strokeWidth={PATH_W * s}
              strokeLinecap="round"
            />
          );
        })}
        {fountain && <Fountain at={P(node(fountain.door))} s={s} />}

        {streets.map((r) => {
          const over = level.water.map((w) => clip(ends(r), w)).find(Boolean);
          return over ? <Bridge key={`br${r.id}`} span={over} fit={fit} /> : null;
        })}
        {streets.map((r) => {
          const [a, b] = ends(r).map(P);
          return (
            <Line
              key={`k${r.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CITY.kerb}
              strokeWidth={KERB_W * s}
              strokeLinecap="square"
            />
          );
        })}
        {streets.map((r) => {
          const [a, b] = ends(r).map(P);
          return (
            <Line
              key={`r${r.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={CITY.road}
              strokeWidth={ROAD_W * s}
              strokeLinecap="square"
            />
          );
        })}
        {streets.map((r) => (
          <Markings key={`m${r.id}`} road={r} ends={ends(r)} fit={fit} />
        ))}

        {streets
          .filter((r) => r.busy)
          .map((r, i) => (
            <Traffic key={`c${r.id}`} ends={ends(r)} fit={fit} seed={i} />
          ))}
        {level.nodes.map((n) => {
          const here = level.roads.filter((r) => r.a === n.id || r.b === n.id);
          const meets = here.some((r) => r.busy) && here.some((r) => !r.busy && !r.footpath);
          return meets ? <TrafficLight key={`tl${n.id}`} at={P({ x: n.x + 0.13, y: n.y - 0.13 })} s={s} /> : null;
        })}

        {(trip.closed ?? []).map((c) => {
          const r = level.roads.find((x) => x.id === c.road)!;
          return <Closure key={`x${c.road}`} ends={ends(r)} fit={fit} />;
        })}

        {standing.map((x) => x.el)}
      </Svg>

      {labels.map(({ landmark, at }) => (
        <Label key={landmark.id} text={landmark.label} at={at} />
      ))}
    </View>
  );
});

/* ------------------------------- ground ---------------------------------- */

const LOT_FILL: Record<Lot['use'], string> = {
  houses: CITY.grass,
  shops: '#E6DFCF',
  trees: CITY.grassDark,
  park: CITY.lawn,
  landmark: '#ECE6D6',
};

function LotGround({ lot, fit }: { lot: Lot; fit: Fit }) {
  if (lot.use === 'houses') return null;
  const inset = ROAD_HALF - 0.03;
  const a = fit.toScreen({ x: lot.rect.x0 + inset, y: lot.rect.y0 + inset });
  const b = fit.toScreen({ x: lot.rect.x1 - inset, y: lot.rect.y1 - inset });
  return <Rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} rx={0.06 * fit.scale} fill={LOT_FILL[lot.use]} />;
}

function Water({ rect, fit }: { rect: WorldRect; fit: Fit }) {
  const s = fit.scale;
  const a = fit.toScreen({ x: rect.x0, y: rect.y0 });
  const b = fit.toScreen({ x: rect.x1, y: rect.y1 });
  const bank = 0.05 * s;
  const ripples = Array.from({ length: Math.ceil((b.x - a.x) / (0.6 * s)) }, (_, i) => i);
  return (
    <G>
      <Rect x={a.x} y={a.y - bank} width={b.x - a.x} height={b.y - a.y + bank * 2} fill={CITY.bank} />
      <Rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={CITY.water} />
      <Rect
        x={a.x}
        y={(a.y + b.y) / 2 - 0.05 * s}
        width={b.x - a.x}
        height={0.1 * s}
        fill={CITY.waterDeep}
        opacity={0.35}
      />
      {ripples.map((i) => {
        const x = a.x + (i + 0.3) * 0.6 * s;
        const y = a.y + (i % 2 ? 0.3 : 0.65) * (b.y - a.y);
        return (
          <Line
            key={i}
            x1={x}
            y1={y}
            x2={x + 0.16 * s}
            y2={y}
            stroke={CITY.ripple}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </G>
  );
}

/** The part of a road over water, in world units — null when it stays dry. */
function clip([a, b]: [CityNode, CityNode], w: WorldRect): [Point, Point] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - w.x0],
    [dx, w.x1 - a.x],
    [-dy, a.y - w.y0],
    [dy, w.y1 - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  if (t0 >= t1) return null;
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

function Bridge({ span: [a, b], fit }: { span: [Point, Point]; fit: Fit }) {
  const s = fit.scale;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const ext = 0.07;
  const p = fit.toScreen({ x: a.x - ux * ext, y: a.y - uy * ext });
  const q = fit.toScreen({ x: b.x + ux * ext, y: b.y + uy * ext });
  const half = 0.17;
  const nx = -uy * half * s;
  const ny = ux * half * s;
  return (
    <G>
      <Line x1={p.x} y1={p.y + 3} x2={q.x} y2={q.y + 3} stroke={CITY.shadow} strokeWidth={0.36 * s} />
      <Line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={CITY.bridge} strokeWidth={0.34 * s} />
      <Line
        x1={p.x + nx}
        y1={p.y + ny}
        x2={q.x + nx}
        y2={q.y + ny}
        stroke={CITY.rail}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Line
        x1={p.x - nx}
        y1={p.y - ny}
        x2={q.x - nx}
        y2={q.y - ny}
        stroke={CITY.rail}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Along a road, from `t0` to `t1` world units from its start, offset sideways. */
function along([a, b]: [CityNode, CityNode], fit: Fit, t: number, side = 0): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  return fit.toScreen({
    x: a.x + ux * t - uy * side,
    y: a.y + uy * t + ux * side,
  });
}

function Markings({ road, ends, fit }: { road: Road; ends: [CityNode, CityNode]; fit: Fit }) {
  const len = Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y);
  if (len <= JUNCTION * 2) return null;
  const s = fit.scale;
  if (road.busy) {
    // A main road: a double solid line, unlike the dashed side streets.
    return (
      <G>
        {[-0.022, 0.022].map((off) => {
          const a = along(ends, fit, JUNCTION, off);
          const b = along(ends, fit, len - JUNCTION, off);
          return <Line key={off} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#F2C94C" strokeWidth={2} />;
        })}
      </G>
    );
  }
  const a = along(ends, fit, JUNCTION);
  const b = along(ends, fit, len - JUNCTION);
  return (
    <Line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={CITY.marking}
      strokeWidth={2}
      strokeDasharray={`${0.07 * s} ${0.07 * s}`}
    />
  );
}

/* ------------------------------- traffic --------------------------------- */

function Car({ at, angle, s, color }: { at: Point; angle: number; s: number; color: string }) {
  const l = 0.17 * s;
  const w = 0.085 * s;
  return (
    <G transform={`rotate(${angle} ${at.x} ${at.y})`}>
      <Rect x={at.x - l / 2 + 1.5} y={at.y - w / 2 + 2} width={l} height={w} rx={w * 0.3} fill={CITY.shadow} />
      <Rect
        x={at.x - l / 2}
        y={at.y - w / 2}
        width={l}
        height={w}
        rx={w * 0.3}
        fill={color}
        stroke="rgba(36,50,56,0.5)"
        strokeWidth={1}
      />
      <Rect
        x={at.x - l * 0.12}
        y={at.y - w * 0.36}
        width={l * 0.36}
        height={w * 0.72}
        rx={w * 0.15}
        fill="#DDEBF1"
        opacity={0.9}
      />
    </G>
  );
}

/** Two cars each way on every block of a busy road — "busy" told by shape, not colour. */
function Traffic({ ends, fit, seed }: { ends: [CityNode, CityNode]; fit: Fit; seed: number }) {
  const [a, b] = ends;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const lane = 0.05;
  const cars: { t: number; side: number; flip: boolean }[] = [
    { t: 0.28, side: -lane, flip: false },
    { t: 0.72, side: lane, flip: true },
  ];
  return (
    <G>
      {cars.map((c, i) => (
        <Car
          key={i}
          at={along(ends, fit, len * c.t, c.side)}
          angle={angle + (c.flip ? 180 : 0)}
          s={fit.scale}
          color={CITY.cars[(seed * 2 + i) % CITY.cars.length]}
        />
      ))}
    </G>
  );
}

function TrafficLight({ at, s }: { at: Point; s: number }) {
  const w = 0.055 * s;
  const h = 0.13 * s;
  return (
    <G>
      <Line x1={at.x} y1={at.y} x2={at.x} y2={at.y - h * 0.9} stroke="#3B4245" strokeWidth={2} />
      <Rect x={at.x - w / 2} y={at.y - h * 1.6} width={w} height={h} rx={2} fill="#2F3537" />
      {['#E5534B', '#E5A93D', '#57B36A'].map((c, i) => (
        <Circle key={c} cx={at.x} cy={at.y - h * 1.6 + h * (0.2 + i * 0.3)} r={w * 0.28} fill={c} />
      ))}
    </G>
  );
}

/** Roadworks: barriers across the road and a no-entry sign between them. */
function Closure({ ends, fit }: { ends: [CityNode, CityNode]; fit: Fit }) {
  const s = fit.scale;
  const [a, b] = ends;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mid = along(ends, fit, len / 2);
  const bar = (t: number) => {
    const c = along(ends, fit, t);
    const w = 0.05 * s;
    const l = 0.3 * s;
    return (
      <G key={t} transform={`rotate(${angle} ${c.x} ${c.y})`}>
        <Rect x={c.x - w / 2} y={c.y - l / 2} width={w} height={l} fill={CITY.works} stroke="#8A5A12" strokeWidth={1} />
        {[0.2, 0.5, 0.8].map((v) => (
          <Rect
            key={v}
            x={c.x - w / 2}
            y={c.y - l / 2 + l * v - l * 0.06}
            width={w}
            height={l * 0.12}
            fill={CITY.worksStripe}
          />
        ))}
      </G>
    );
  };
  const r = 0.1 * s;
  return (
    <G>
      {bar(len / 2 - 0.22)}
      {bar(len / 2 + 0.22)}
      <Circle cx={mid.x} cy={mid.y} r={r + 2} fill="#FFFFFF" />
      <Circle cx={mid.x} cy={mid.y} r={r} fill={CITY.danger} />
      <Rect x={mid.x - r * 0.62} y={mid.y - r * 0.18} width={r * 1.24} height={r * 0.36} fill="#FFFFFF" />
    </G>
  );
}

function Fountain({ at, s }: { at: Point; s: number }) {
  return (
    <G>
      <Circle cx={at.x} cy={at.y} r={0.11 * s} fill={CITY.fountain} stroke={CITY.pathEdge} strokeWidth={1.5} />
      <Circle cx={at.x} cy={at.y} r={0.075 * s} fill={CITY.water} />
      <Circle cx={at.x} cy={at.y} r={0.025 * s} fill="#FFFFFF" />
    </G>
  );
}

/* ------------------------------ buildings -------------------------------- */

const LANDMARK_LOOK: Record<LandmarkKind, { wall: string; roof: string }> = {
  home: { wall: '#EFD0B4', roof: '#C97B62' },
  clinic: { wall: '#F7F6F1', roof: '#C9D3D6' },
  pharmacy: { wall: '#EAF3EC', roof: '#6E9C78' },
  park: { wall: '#F7F6F1', roof: '#C9D3D6' },
};

const EDGE = 'rgba(36,50,56,0.45)';

function BuildingArt({ b, fit, kind }: { b: Building; fit: Fit; kind?: LandmarkKind }) {
  const box = boxFaces(fit, b.foot, b.height);
  const look = kind ? LANDMARK_LOOK[kind] : { wall: CITY.walls[b.wall], roof: CITY.roofs[b.roof] };
  const [sw, se, tse, tsw] = box.front;
  /** A rectangle on the front wall, in wall coordinates (0..1 across, 0..1 up). */
  const onWall = (u0: number, v0: number, u1: number, v1: number) => {
    const at = (u: number, v: number) => ({
      x: sw.x + u * (se.x - sw.x) + v * (tsw.x - sw.x),
      y: sw.y + u * (se.y - sw.y) + v * (tsw.y - sw.y),
    });
    return pts([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]);
  };
  // The ground shadow: the footprint and its copy down-right, joined. The
  // building covers its own footprint, so only the cast part shows.
  const ne = box.side[0];
  const o = (p: Point) => ({
    x: p.x + 0.07 * fit.scale,
    y: p.y + 0.035 * fit.scale,
  });
  const shadow = [{ x: sw.x, y: ne.y }, ne, o(ne), o(se), o(sw), sw];
  const roofC = box.roof.reduce((c, p) => ({ x: c.x + p.x / 4, y: c.y + p.y / 4 }), { x: 0, y: 0 });
  const across = Math.abs(se.x - sw.x);

  const windows: string[] = [];
  if (b.kind === 'house') {
    windows.push(onWall(0.14, 0.42, 0.34, 0.72), onWall(0.66, 0.42, 0.86, 0.72));
  } else if (b.kind === 'landmark') {
    for (const u of [0.1, 0.32, 0.6, 0.82]) windows.push(onWall(u, 0.58, u + 0.11, 0.82));
    for (const u of [0.1, 0.27, 0.66, 0.83]) windows.push(onWall(u, 0.14, u + 0.1, 0.4));
  }

  return (
    <G>
      <Polygon points={pts(shadow)} fill={CITY.shadow} />
      <Polygon points={pts(box.side)} fill={look.wall} stroke={EDGE} strokeWidth={1} />
      <Polygon points={pts(box.side)} fill={CITY.shade} />
      <Polygon points={pts(box.front)} fill={look.wall} stroke={EDGE} strokeWidth={1} />
      {windows.map((w) => (
        <Polygon key={w} points={w} fill={CITY.window} stroke="#FFFFFF" strokeWidth={1} />
      ))}
      {b.kind === 'house' && <Polygon points={onWall(0.42, 0, 0.58, 0.55)} fill={CITY.door} />}
      {b.kind === 'landmark' && (
        <Polygon points={onWall(0.42, 0, 0.58, 0.5)} fill={kind === 'pharmacy' ? '#3F7A4C' : CITY.door} />
      )}
      {b.kind === 'shop' && (
        <>
          <Polygon points={onWall(0.08, 0.12, 0.92, 0.55)} fill={CITY.window} stroke="#FFFFFF" strokeWidth={1} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Polygon
              key={i}
              points={onWall(i / 6, 0.62, (i + 1) / 6, 0.86)}
              fill={i % 2 ? '#FFFFFF' : CITY.roofs[b.roof]}
            />
          ))}
        </>
      )}
      <Polygon points={pts(box.roof)} fill={look.roof} stroke={EDGE} strokeWidth={1} />
      {b.kind === 'house' && (
        // A ridge: the far half of the roof a shade darker reads as a pitched roof.
        <Polygon
          points={pts([box.roof[0], box.roof[1], mid(box.roof[1], box.roof[2]), mid(box.roof[0], box.roof[3])])}
          fill="rgba(36,50,56,0.16)"
        />
      )}
      {kind === 'home' && (
        <Rect
          x={box.roof[1].x - across * 0.28}
          y={box.roof[1].y - 6}
          width={across * 0.1}
          height={10}
          fill="#8F6F5A"
          stroke={EDGE}
          strokeWidth={1}
        />
      )}
      {(kind === 'clinic' || kind === 'pharmacy') && (
        <Sign
          at={roofC}
          size={Math.min(across * 0.34, 22)}
          color={kind === 'clinic' ? CITY.clinicCross : CITY.pharmacyCross}
        />
      )}
    </G>
  );
}

const mid = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** A cross on a white tile — the clinic's red, the pharmacy's green. */
function Sign({ at, size, color }: { at: Point; size: number; color: string }) {
  const arm = size * 0.22;
  return (
    <G>
      <Rect
        x={at.x - size / 2}
        y={at.y - size / 2}
        width={size}
        height={size}
        rx={size * 0.2}
        fill="#FFFFFF"
        stroke={EDGE}
        strokeWidth={1}
      />
      <Rect x={at.x - arm / 2} y={at.y - size * 0.34} width={arm} height={size * 0.68} fill={color} />
      <Rect x={at.x - size * 0.34} y={at.y - arm / 2} width={size * 0.68} height={arm} fill={color} />
    </G>
  );
}

function TreeArt({ t, fit }: { t: Tree; fit: Fit }) {
  const s = fit.scale;
  const base = fit.toScreen(t);
  const r = t.r * s;
  return (
    <G>
      <Ellipse cx={base.x + r * 0.35} cy={base.y} rx={r * 0.85} ry={r * 0.3} fill={CITY.shadow} />
      <Rect x={base.x - r * 0.12} y={base.y - r * 1.2} width={r * 0.24} height={r * 1.2} fill={CITY.trunk} />
      <Circle cx={base.x} cy={base.y - r * 1.2} r={r} fill={CITY.leaves[t.leaf]} />
      <Circle cx={base.x - r * 0.3} cy={base.y - r * 1.5} r={r * 0.45} fill="#FFFFFF" opacity={0.18} />
    </G>
  );
}

/* -------------------------------- labels --------------------------------- */

/**
 * Where a place's name goes. A pill is wider than a block, so on the town's
 * edge it sits in the margin outside the outer road, where it covers nothing;
 * a park's sits on its open lawn; anything else above its roof.
 */
function labelAt(level: CityLevel, lot: Lot, b: Building | undefined, fit: Fit): Point {
  const ys = level.nodes.map((n) => n.y);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const x = fit.toScreen({ x: (lot.rect.x0 + lot.rect.x1) / 2, y: 0 }).x;
  const y = (wy: number) => fit.toScreen({ x: 0, y: wy }).y;
  if (lot.rect.y0 <= top) return { x, y: (y(level.bounds.y0) + y(top - KERB_W / 2)) / 2 };
  if (lot.rect.y1 >= bottom) return { x, y: (y(bottom + KERB_W / 2) + y(level.bounds.y1)) / 2 };
  // A park has no roof to stand above, and its fountain marker fills the middle
  // of the lawn, so the name sits on the street along its top edge.
  if (!b) return { x, y: y(lot.rect.y0 + 0.02) };
  return { x, y: boxFaces(fit, b.foot, b.height).top - 14 };
}

/** A place name on a white pill, centred on `at`. */
function Label({ text, at }: { text: string; at: Point }) {
  const W = 140;
  const H = 26;
  return (
    <View
      style={{
        position: 'absolute',
        left: at.x - W / 2,
        top: at.y - H / 2,
        width: W,
        height: H,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      importantForAccessibility="no-hide-descendants"
    >
      <SurfaceProvider value="surface">
        <View
          style={{
            backgroundColor: CITY.label,
            borderColor: colors.edge,
            borderWidth: 1.5,
            borderRadius: radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 1,
          }}
        >
          <Text variant="caption" style={{ fontSize: 14, lineHeight: 20, fontWeight: '600' }}>
            {text}
          </Text>
        </View>
      </SurfaceProvider>
    </View>
  );
}

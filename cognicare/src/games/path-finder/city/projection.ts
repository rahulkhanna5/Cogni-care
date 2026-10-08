import type { Point } from '../engine/hit';
import type { Lot, Rect } from '../engine/types';

/**
 * Drawing the city in ¾ view: streets flat, as from above; buildings stand up
 * as boxes whose roof is lifted by their height and nudged left, so the roof,
 * the south wall and the east wall all show. True isometric would turn a
 * portrait phone's map into a short wide diamond with crossroads ~31dp apart;
 * this keeps them ~90dp apart.
 */

/** Half a road plus its pavement, in world units. Nothing built may cross it. */
export const ROAD_HALF = 0.15;
/** Roof shift left per unit of height. */
export const SLANT = 0.3;

export type Fit = { scale: number; width: number; height: number; toScreen: (p: Point) => Point };

export function fitCity(bounds: Rect, maxW: number, maxH: number): Fit {
  const w = bounds.x1 - bounds.x0;
  const h = bounds.y1 - bounds.y0;
  const scale = Math.min(maxW / w, maxH / h);
  return {
    scale,
    width: w * scale,
    height: h * scale,
    toScreen: (p) => ({ x: (p.x - bounds.x0) * scale, y: (p.y - bounds.y0) * scale }),
  };
}

export type Box = { roof: Point[]; front: Point[]; side: Point[]; top: number };

/** Screen polygons for a box on `foot` (world), `height` world units tall. */
export function boxFaces(fit: Fit, foot: Rect, height: number): Box {
  const a = fit.toScreen({ x: foot.x0, y: foot.y0 });
  const c = fit.toScreen({ x: foot.x1, y: foot.y1 });
  const h = height * fit.scale;
  const lift = (p: Point) => ({ x: p.x - SLANT * h, y: p.y - h });
  const nw = a;
  const ne = { x: c.x, y: a.y };
  const se = c;
  const sw = { x: a.x, y: c.y };
  return {
    roof: [nw, ne, se, sw].map(lift),
    front: [sw, se, lift(se), lift(sw)],
    side: [ne, se, lift(se), lift(ne)],
    top: a.y - h,
  };
}

export type Building = {
  foot: Rect;
  height: number;
  wall: number;
  roof: number;
  kind: 'house' | 'shop' | 'landmark';
};
export type Tree = { x: number; y: number; r: number; leaf: number };

/** Deterministic noise from a lot's id: the town looks the same every visit. */
function seeded(id: string) {
  let a = 2166136261;
  for (let i = 0; i < id.length; i++) a = Math.imul(a ^ id.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** What stands on a lot, in world units, always inside its pavements. */
export function lotArt(lot: Lot): { buildings: Building[]; trees: Tree[] } {
  const rnd = seeded(lot.id);
  const pick = (n: number) => Math.floor(rnd() * n);
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const x0 = lot.rect.x0 + ROAD_HALF;
  const y0 = lot.rect.y0 + ROAD_HALF;
  const x1 = lot.rect.x1 - ROAD_HALF;
  const y1 = lot.rect.y1 - ROAD_HALF;
  const w = x1 - x0;
  const h = y1 - y0;
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const tree = (x: number, y: number, r = between(0.07, 0.09)) => trees.push({ x, y, r, leaf: pick(3) });

  /** A box whose south-east corner is at (right, bottom), fitted inside the lot. */
  const box = (right: number, bottom: number, width: number, depth: number, height: number, kind: Building['kind']) =>
    buildings.push({
      foot: { x0: right - width, y0: bottom - depth, x1: right, y1: bottom },
      height,
      wall: pick(4),
      roof: pick(4),
      kind,
    });

  switch (lot.use) {
    case 'houses': {
      // Four plots; three get a house, the fourth a tree.
      const empty = pick(4);
      for (let i = 0; i < 4; i++) {
        const sx = x0 + (i % 2) * (w / 2);
        const sy = y0 + Math.floor(i / 2) * (h / 2);
        if (i === empty) {
          tree(sx + w / 4, sy + h / 2 - 0.03);
          continue;
        }
        const height = between(0.12, 0.16);
        box(sx + w / 2 - 0.02, sy + h / 2 - 0.02, between(0.2, w / 2 - 0.02 - SLANT * 0.16 - 0.02), between(0.12, 0.14), height, 'house');
      }
      break;
    }
    case 'shops': {
      tree(x0 + 0.1, y0 + 0.24);
      tree(x1 - 0.1, y0 + 0.24);
      const height = 0.14;
      const left = x0 + SLANT * height + 0.02;
      const mid = (left + x1 - 0.02) / 2;
      box(mid - 0.01, y1 - 0.04, mid - 0.01 - left, 0.22, height, 'shop');
      box(x1 - 0.02, y1 - 0.04, x1 - 0.02 - (mid + 0.01), 0.22, height, 'shop');
      break;
    }
    case 'trees':
      for (let i = 0; i < 6; i++)
        tree(x0 + (0.18 + (i % 3) * 0.32) * w + between(-0.03, 0.03), y0 + (i < 3 ? 0.4 : 0.92) * h + between(-0.04, 0.02));
      break;
    case 'park': {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      // Midway along each edge: well clear of the paths, which run corner to corner.
      tree(cx, y0 + 0.2);
      tree(x0 + 0.09, cy + 0.08);
      tree(x1 - 0.09, cy + 0.08);
      tree(cx, y1 - 0.01, 0.07);
      break;
    }
    case 'landmark': {
      tree(x0 + 0.09, y0 + 0.2);
      const height = 0.18;
      const width = 0.44;
      const right = x0 + SLANT * height + (w - SLANT * height + width) / 2;
      box(right, y1 - 0.05, width, 0.26, height, 'landmark');
      break;
    }
  }
  return { buildings, trees };
}

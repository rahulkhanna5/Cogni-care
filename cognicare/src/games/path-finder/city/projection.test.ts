import { LEVEL_1 } from '../data/level1';
import { boxFaces, fitCity, lotArt, ROAD_HALF, SLANT } from './projection';

it('fits the town inside the space given, keeping its shape', () => {
  const fit = fitCity(LEVEL_1.bounds, 328, 600);
  expect(fit.width).toBeLessThanOrEqual(328);
  expect(fit.height).toBeLessThanOrEqual(600);
  const { x0, y0, x1, y1 } = LEVEL_1.bounds;
  expect(fit.width / fit.height).toBeCloseTo((x1 - x0) / (y1 - y0), 5);
  expect(fit.toScreen({ x: LEVEL_1.bounds.x0, y: LEVEL_1.bounds.y0 })).toEqual({ x: 0, y: 0 });
});

it('a building’s roof sits its height above the footprint, shifted left to show the east wall', () => {
  const fit = fitCity({ x0: 0, y0: 0, x1: 1, y1: 1 }, 100, 100);
  const box = boxFaces(fit, { x0: 0.4, y0: 0.5, x1: 0.6, y1: 0.7 }, 0.2);
  expect(box.roof[0]).toEqual({ x: 40 - SLANT * 20, y: 30 });
  expect(box.top).toBe(30);
  // East wall: from the footprint's east edge up to the roof's.
  expect(box.side).toEqual([
    { x: 60, y: 50 },
    { x: 60, y: 70 },
    { x: 60 - SLANT * 20, y: 50 },
    { x: 60 - SLANT * 20, y: 30 },
  ]);
});

describe('no building or tree covers a street', () => {
  for (const lot of LEVEL_1.lots) {
    it(lot.id, () => {
      const { buildings, trees } = lotArt(lot);
      const inside = {
        x0: lot.rect.x0 + ROAD_HALF,
        y0: lot.rect.y0 + ROAD_HALF,
        x1: lot.rect.x1 - ROAD_HALF,
        y1: lot.rect.y1 - ROAD_HALF,
      };
      for (const b of buildings) {
        expect(b.foot.x0 - SLANT * b.height).toBeGreaterThanOrEqual(inside.x0 - 1e-9);
        expect(b.foot.y0 - b.height).toBeGreaterThanOrEqual(inside.y0 - 1e-9);
        expect(b.foot.x1).toBeLessThanOrEqual(inside.x1 + 1e-9);
        expect(b.foot.y1).toBeLessThanOrEqual(inside.y1 + 1e-9);
      }
      for (const t of trees) {
        expect(t.x - t.r).toBeGreaterThanOrEqual(inside.x0 - 1e-9);
        expect(t.x + t.r).toBeLessThanOrEqual(inside.x1 + 1e-9);
        expect(t.y - t.r * 2.2).toBeGreaterThanOrEqual(inside.y0 - 1e-9);
        expect(t.y).toBeLessThanOrEqual(inside.y1 + 1e-9);
      }
    });
  }

  it('and the same lot always gets the same art', () => {
    expect(lotArt(LEVEL_1.lots[1])).toEqual(lotArt(LEVEL_1.lots[1]));
  });
});

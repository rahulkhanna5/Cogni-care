import { levelDifficulty, tripFacts } from '../engine/difficulty';
import { buildGraph, bestRoute } from '../engine/graph';
import { validateLevel } from '../engine/level';
import { PATH_LEVELS } from '../levels';
import { ROAD_HALF, lotArt } from '../city/projection';

describe('every Path Finder level', () => {
  PATH_LEVELS.forEach((level, i) => {
    describe(`level ${i + 1}: ${level.title}`, () => {
      it('is a valid, solvable level', () => {
        expect(level.number).toBe(i + 1);
        expect(validateLevel(level)).toEqual([]);
        expect(level.trips).toHaveLength(3);
      });

      it('has trips that each need planning — a stop, a closure, or a busy road to avoid', () => {
        const g = buildGraph(level);
        for (const trip of level.trips) {
          const f = tripFacts(g, trip);
          const needsPlanning = f.stops > 0 || f.closures > 0 || f.bestMetres > f.naiveMetres || f.busyOnObviousWay;
          expect(needsPlanning).toBe(true);
          expect(bestRoute(g, trip)).not.toBeNull();
        }
      });

      it('never sends a trip back over its own steps on the best route', () => {
        const g = buildGraph(level);
        for (const trip of level.trips) {
          const route = bestRoute(g, trip)!;
          // A stop that is a dead end would make the "best" way a there-and-back.
          expect(new Set(route).size).toBe(route.length);
        }
      });

      it('asks for three different walks', () => {
        const keys = level.trips.map(
          (t) => `${t.from}>${t.to}>${(t.via ?? []).join(',')}>${(t.closed ?? []).map((c) => c.road).join(',')}`
        );
        expect(new Set(keys).size).toBe(3);
      });

      it('keeps every building and tree off the streets', () => {
        for (const lot of level.lots) {
          const { buildings, trees } = lotArt(lot);
          const inside = {
            x0: lot.rect.x0 + ROAD_HALF,
            y0: lot.rect.y0 + ROAD_HALF,
            x1: lot.rect.x1 - ROAD_HALF,
            y1: lot.rect.y1 - ROAD_HALF,
          };
          for (const b of buildings) {
            expect(b.foot.x1).toBeLessThanOrEqual(inside.x1 + 1e-9);
            expect(b.foot.y1).toBeLessThanOrEqual(inside.y1 + 1e-9);
          }
          for (const t of trees) expect(t.x + t.r).toBeLessThanOrEqual(inside.x1 + 1e-9);
        }
      });
    });
  });

  it('is harder at every level than the one before — by at least a clear step', () => {
    const scores = PATH_LEVELS.map(levelDifficulty);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeGreaterThanOrEqual(scores[i - 1]! + 2);
    }
  });

  it('keeps the map small enough to tap: five crossroads across at most', () => {
    for (const level of PATH_LEVELS) {
      const cols = Math.max(...level.nodes.filter((n) => n.id !== 'p').map((n) => n.x)) + 1;
      expect(cols).toBeLessThanOrEqual(5);
    }
  });
});

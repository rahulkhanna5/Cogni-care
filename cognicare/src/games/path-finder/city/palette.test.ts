import { contrastRatio } from '@/theme/contrast';
import { CITY } from './palette';

describe('the city map is legible', () => {
  it('place names on their white labels clear 7:1, like all text in the app', () => {
    expect(contrastRatio(CITY.labelInk, CITY.label)).toBeGreaterThanOrEqual(7);
  });

  it('the walked route stands off the road: white halo on asphalt, blue core on the halo', () => {
    expect(contrastRatio(CITY.routeHalo, CITY.road)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(CITY.route, CITY.routeHalo)).toBeGreaterThanOrEqual(3);
  });

  it('the best route (dashed) and the next-road glow are visible too', () => {
    expect(contrastRatio(CITY.best, CITY.routeHalo)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(CITY.glow, CITY.road)).toBeGreaterThanOrEqual(3);
  });
});

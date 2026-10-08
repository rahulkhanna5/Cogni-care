/**
 * Path Finder's city, as data. A level is a town (crossroads joined by roads,
 * lots holding buildings, water) plus the trips walked across it — one trip
 * per GameShell turn. Adding a level is adding one of these; no code changes.
 *
 * World units: 1 = 100 m. y grows southward (down the screen).
 */

export type NodeId = string;

/** A crossroad, or the meeting point of park paths. */
export type CityNode = { id: NodeId; x: number; y: number };

export type Road = {
  id: string;
  a: NodeId;
  b: NodeId;
  name?: string;
  /** Walkable but unsafe: costs safety points. Drawn with traffic and a label. */
  busy?: boolean;
  /** A park path — drawn as gravel, no centre line. */
  footpath?: boolean;
  /**
   * Metres for scoring. Defaults to the drawn length, on purpose: the map
   * carries no distance labels, so a road that looks short but scores long
   * would be a trap, not a puzzle.
   */
  gameDistance?: number;
};

export type LandmarkKind = 'home' | 'clinic' | 'pharmacy' | 'park';

export type Landmark = {
  id: string;
  kind: LandmarkKind;
  /** One plain word or two, shown on the map. */
  label: string;
  /** The crossroad a trip starts from or ends at. */
  door: NodeId;
  /** The lot its building (or lawn) stands on. */
  lot: string;
};

export type Rect = { x0: number; y0: number; x1: number; y1: number };

export type LotUse = 'houses' | 'shops' | 'trees' | 'park' | 'landmark';

/** A block between roads. Its art is generated from its id, so it never changes. */
export type Lot = { id: string; rect: Rect; use: LotUse; landmark?: string };

export type Closure = { road: string; kind: 'roadworks' | 'accident' };

export type Trip = {
  /** Landmark ids. */
  from: string;
  to: string;
  /** Landmarks to pass on the way, in order. */
  via?: string[];
  /** Roads that cannot be walked on this trip. */
  closed?: Closure[];
  title: string;
  instruction: string;
};

/** Points available for each part of the score; they sum to 100. */
export type Weights = { distance: number; safety: number; planning: number; time: number };

export type CityLevel = {
  number: number;
  title: string;
  /** The part of the world drawn on screen. */
  bounds: Rect;
  nodes: CityNode[];
  roads: Road[];
  landmarks: Landmark[];
  lots: Lot[];
  water: Rect[];
  trips: Trip[];
  weights: Weights;
  /** Unset means time is never scored — the default, as everywhere in the app. */
  timeLimitSec?: number;
};

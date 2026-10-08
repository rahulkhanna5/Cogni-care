# City Path Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generated-town Path Finder with a hand-made illustrated city level ("Find the Clinic", three trips) scored on distance, safety and planning.

**Architecture:** A pure TypeScript engine (graph, route, rules, score, reducer, level validation, hit-testing) under `engine/`, level data under `data/`, and a react-native-svg city renderer under `city/` (memoised scenery + a dynamic route layer + one tap gesture). `PathFinder.tsx` plays one trip per GameShell turn and reports a `RoundResult`.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, react-native-svg, react-native-gesture-handler, Jest + @testing-library/react-native v14.

**Spec:** `docs/superpowers/specs/2026-10-07-city-pathfinder-design.md`

Plan kept lean by request ("start", build fast): contracts and test cases are exact; implementation code is written straight into the files.

## Global Constraints

- Node 22: `source ~/.nvm/nvm.sh && nvm use 22` in every shell; run from `cognicare/`.
- Text clears 7:1 on its surface; tappable edges 3:1. Never hard-code UI text colour — use `Text` intents. Scenery colours are exempt (not text).
- Touch targets ≥ `TOUCH_MIN` (56dp).
- `misses` and `falseAlarms` stay separate.
- RNTL v14: `render` and `fireEvent` return promises — await them. Never wrap timer advancement in `act()`.
- macOS paths are case-insensitive: no two files in one folder whose names differ only by case (`PathFinder.tsx` exists — no `pathfinder.ts` beside it).
- Two taps in one render tick: authoritative state lives in a reducer, not read from a stale closure.
- Speed is never scored unless a level sets a time limit.
- Commit only when the user asks.

---

### Task 1: Engine types, graph, Level 1 data, level validation

**Files:**
- Create: `src/games/path-finder/engine/types.ts`, `engine/graph.ts`, `engine/level.ts`, `data/level1.ts`
- Test: `engine/graph.test.ts`, `data/level1.test.ts`

**Interfaces — Produces:**

```ts
// engine/types.ts
export type NodeId = string;
export type CityNode = { id: NodeId; x: number; y: number };          // world units, 1 = 100 m
export type Road = { id: string; a: NodeId; b: NodeId; name?: string; busy?: boolean; footpath?: boolean; gameDistance?: number };
export type LandmarkKind = 'home' | 'clinic' | 'pharmacy' | 'park';
export type Landmark = { id: string; kind: LandmarkKind; label: string; door: NodeId; lot: string };
export type Rect = { x0: number; y0: number; x1: number; y1: number };
export type LotUse = 'houses' | 'shops' | 'trees' | 'park' | 'landmark';
export type Lot = { id: string; rect: Rect; use: LotUse; landmark?: string };
export type Closure = { road: string; kind: 'roadworks' | 'accident' };
export type Trip = { from: string; to: string; via?: string[]; closed?: Closure[]; title: string; instruction: string };
export type Weights = { distance: number; safety: number; planning: number; time: number };
export type CityLevel = {
  number: number; title: string; bounds: Rect;
  nodes: CityNode[]; roads: Road[]; landmarks: Landmark[]; lots: Lot[]; water: Rect[];
  trips: Trip[]; weights: Weights; timeLimitSec?: number;
};

// engine/graph.ts
export type Graph = { level: CityLevel; node: (id: NodeId) => CityNode; road: (id: string) => Road;
  roadsAt: (id: NodeId) => Road[]; roadBetween: (a: NodeId, b: NodeId) => Road | undefined };
export function buildGraph(level: CityLevel): Graph;
export function metres(g: Graph, road: Road): number;                 // gameDistance ?? round(len × 100)
export function other(road: Road, end: NodeId): NodeId;
export function routeMetres(g: Graph, route: NodeId[]): number;
export function shortest(g: Graph, from: NodeId, to: NodeId, avoid: (r: Road) => boolean): NodeId[] | null; // Dijkstra
export function bestRoute(g: Graph, trip: Trip, opts?: { allowBusy?: boolean }): NodeId[] | null;           // legs via stops, avoiding closed (+ busy unless allowBusy)

// engine/level.ts
export function tripFor(level: CityLevel, roundNo: number): Trip;  // 1-based, wraps
export function landmark(level: CityLevel, id: string): Landmark;
export function validateLevel(level: CityLevel): string[];          // [] when valid
```

- [ ] Tests (`graph.test.ts`): `shortest` on a 3-node triangle picks the cheaper side; `avoid` excludes a road; unreachable → `null`; `bestRoute` joins via legs without duplicating the stop node; `routeMetres` sums.
- [ ] Tests (`level1.test.ts`): `validateLevel(LEVEL_1)` is `[]`; trip 1 best = 400 and with the closure removed = 200; trip 2 best = 300 and `bestRoute(..., {allowBusy:true})` is also 300 through a busy road; trip 3 best = 442, includes the fountain `p`, and the street-only shortest (no via) without footpaths is 500.
- [ ] `validateLevel` checks: unique ids; roads join known nodes; landmarks' doors and lots exist; trips name known landmarks and roads; every trip has a safe `bestRoute`.
- [ ] Run `npx jest src/games/path-finder/engine src/games/path-finder/data` → PASS.

### Task 2: Route stepping and hit-testing

**Files:** Create `engine/route.ts`, `engine/hit.ts`; Test `engine/route.test.ts`, `engine/hit.test.ts`

**Interfaces — Produces:**

```ts
// engine/route.ts
export type StepError = 'closed' | 'not-next' | 'same';
export type Target = { kind: 'node'; id: NodeId } | { kind: 'road'; id: string };
export function step(g: Graph, trip: Trip, route: NodeId[], t: Target): { ok: true; route: NodeId[] } | { ok: false; error: StepError; road?: Road };
export function nextRoads(g: Graph, trip: Trip, route: NodeId[]): Road[];   // open roads from the route's end
export function isClosed(trip: Trip, road: Road): Closure | undefined;

// engine/hit.ts
export type Point = { x: number; y: number };
export function nearestTarget(g: Graph, toScreen: (n: { x: number; y: number }) => Point, p: Point,
  opts?: { nodeRadius?: number; roadRadius?: number }): Target | null;      // node within 40, else road within 32
```

- [ ] Route tests: a node along an open road extends; a node two roads away → `not-next`; the current node → `same`; a closed road (by node or by road) → `closed` with the road; a road touching the end walks to its far end; revisiting an earlier node is allowed.
- [ ] Hit tests: a point 30dp from a node returns it; a point 60dp from every node but 10dp from a road's middle returns the road; far from everything → `null`; when two nodes are in range the nearer wins.

### Task 3: Rules, score, round result, reducer

**Files:** Create `engine/rules.ts`, `engine/score.ts`, `engine/game.ts`; Test one file each.

**Interfaces — Produces:**

```ts
// engine/rules.ts
export type Evaluation = { reached: boolean; metres: number; bestMetres: number; best: NodeId[];
  busyMetres: number; busyRoads: string[]; missedStops: string[] };
export function evaluate(g: Graph, trip: Trip, route: NodeId[]): Evaluation;  // stops must appear in order after start

// engine/score.ts
export type Breakdown = { distance: number; safety: number; planning: number; time: number; total: number };
export type Verdict = 'great' | 'made-it';
export function score(ev: Evaluation, w: Weights, corrections: number, elapsedMs: number, timeLimitSec?: number): Breakdown;
export function verdict(ev: Evaluation): Verdict;
export function toRoundResult(ev: Evaluation, b: Breakdown, closedTaps: number, elapsedMs: number): RoundResult;
export function shortfalls(ev: Evaluation, level: CityLevel): string[];  // calm lines, one per shortfall

// engine/game.ts
export type GameState = { phase: 'planning' | 'result'; route: NodeId[]; corrections: number; closedTaps: number;
  note: Note | null; evaluation?: Evaluation; breakdown?: Breakdown };
export type Note = { tone: 'info' | 'warning'; text: string };
export type Action = { type: 'tap'; target: Target } | { type: 'back' } | { type: 'reset' } | { type: 'check'; elapsedMs: number } | { type: 'clear-note' };
export function initialState(g: Graph, trip: Trip): GameState;
export function reducer(g: Graph, trip: Trip): (s: GameState, a: Action) => GameState;
```

- [ ] Rules tests: on trip 1, the best route evaluates to `metres === bestMetres`, no busy, no missed; the busy variant reports `busyRoads` and `busyMetres` 100; on trip 3 a street-only route reports `missedStops: ['park']`; a route not ending at the destination → `reached: false`.
- [ ] Score tests: perfect → 100 and `great`; busy route on trip 2 → distance 40, safety 30×(1−200/300)=10, total 80, `made-it`; 2 corrections → planning 12; missed stop → planning 0; with `timeLimitSec: 60` and 120 s → time 5.
- [ ] `toRoundResult`: hits 1 only when great; misses = missed stops; falseAlarms = busy roads + closed taps; accuracy = total/100; score = total.
- [ ] Reducer tests: tap extends; tap closed → note + `closedTaps+1`; back pops and counts a correction (no-op at start); reset clears and counts when the route had steps; check before reaching → ignored; check at destination → phase `result` with evaluation and breakdown; taps after result ignored.

### Task 4: Palette and projection

**Files:** Create `city/palette.ts`, `city/projection.ts`; Test `city/palette.test.ts`, `city/projection.test.ts`

**Interfaces — Produces:**

```ts
// city/palette.ts — scenery (brief) + label/route colours
export const CITY: { grass; grassDark; road; roadEdge; marking; water; waterDeep; bank; park; path;
  roof: string[]; wall: string[]; trunk; leaf: string[]; label; labelInk; route; routeHalo; best; glow; busy; works } ;

// city/projection.ts
export type Fit = { scale: number; width: number; height: number; toScreen: (p: { x: number; y: number }) => Point };
export function fitCity(bounds: Rect, maxW: number, maxH: number): Fit;
export type Box = { roof: Point[]; front: Point[]; side: Point[]; footprint: Rect; top: number };
export function boxFaces(fit: Fit, foot: Rect, heightWorld: number): Box;   // roof shifted up and left: roof, south wall, east wall
export type Building = { foot: Rect; height: number; roof: number; wall: number; kind: 'house' | 'shop' | 'landmark' };
export function lotArt(lot: Lot, roadHalf: number): { buildings: Building[]; trees: Point[] };  // deterministic from lot.id; world units
```

- [ ] Palette tests: `labelInk` on `label` ≥ 7:1; `routeHalo` on `road` ≥ 3:1; `route` on `routeHalo` ≥ 3:1 (use `contrastRatio` from `@/theme/contrast`).
- [ ] Projection tests: `fitCity` keeps aspect and fits within both limits; `boxFaces` roof sits `height×scale` above the footprint; for every Level 1 lot, every building's footprint and roof stay inside the lot minus the road half-width (no roof over a street); `lotArt` is deterministic.

### Task 5: City renderer

**Files:** Create `city/Scenery.tsx`, `city/RouteLayer.tsx`, `city/CityMap.tsx`

**Interfaces — Produces:**

```ts
export const Scenery: React.MemoExoticComponent<(p: { level: CityLevel; fit: Fit; trip: Trip }) => JSX.Element>;
export function RouteLayer(p: { g: Graph; fit: Fit; trip: Trip; route: NodeId[]; next: Road[]; best?: NodeId[] }): JSX.Element;
export function CityMap(p: { g: Graph; trip: Trip; fit: Fit; route: NodeId[]; best?: NodeId[]; disabled: boolean;
  onTarget: (t: Target) => void }): JSX.Element;
```

- Scenery layer order: ground → water + banks → park (lawn, paths, fountain) → roads (edge then fill) → bridges → centre markings (not on footpaths) → busy-road cars and "Busy road" pill → closures (barrier + cone) → buildings and trees sorted by footprint bottom → landmark labels (icon + word on white pill).
- RouteLayer: next-road glow, walked route (halo + core), best route dashed, stop rings, destination pin, you-are-here.
- CityMap: `Gesture.Tap().withTestId('city-map')` → `nearestTarget`; one invisible accessible `Pressable` per node (≥56dp, `accessibilityLabel` "Crossroad by the clinic, you can walk here" style) underneath the gesture layer.
- [ ] `npx tsc --noEmit` clean.

### Task 6: The turn screen and wiring

**Files:** Rewrite `PathFinder.tsx`, `levels.ts`; modify `src/app/game/[id].tsx` (path-finder entry: rounds 3, instructions, describeRound); delete `town.ts`, `town.test.ts`, `sprites.tsx`; rewrite `PathFinder.test.tsx`; update `CLAUDE.md` Path Finder bullet.

**Interfaces — Consumes:** everything above. **Produces:** `PathFinder(props: GamePlayProps)`, `PATH_LEVELS: CityLevel[]`, `PATH_MAX_LEVEL`, `pathLevel(n)`, `describePathLevel(n)`.

- Layout: instruction card ("LEVEL 01" caption, trip title, instruction), map, stats row (Distance m · Safety "Safe"/"Busy road" · Stops n/m), note banner (fixed height), buttons Back one step / Start over, primary Check route (with `disabledReason`). Result: verdict heading ("Great planning!" / "You made it!"), Distance/Safety/Planning/Score tiles, shortfall lines, Continue → `onRoundComplete(toRoundResult(...))`.
- [ ] Screen test: render round 1, press the a11y crossroads of the trip-1 best route (`d3, c3, c2, b2`), press Check route, see "Great planning!", press Continue → `onRoundComplete` called with `{hits:1, misses:0, falseAlarms:0, accuracy:1, score:100}`.
- [ ] Screen test: round 1, press `c2` from `d2` → "Roadworks — this road is closed." and Distance still 0 m.
- [ ] Gesture test: `fireGestureHandler(getByGestureTestId('city-map'), [{state: BEGAN, x, y}, {state: ACTIVE, x, y}, {state: END, x, y}])` at node `d3`'s screen point extends the route.
- [ ] Full `npx tsc --noEmit` and `npx jest` green.

### Task 7: Visual check

- [ ] Web preview on :8083, play trip 1 to the result; fix anything that reads badly (labels, overlap, glow).
- [ ] Update `CLAUDE.md` test count.

# Path Finder as a city game — design

Date: 2026-10-07 · Status: approved in chat ("Replace Path Finder") · Replaces the
generated-town Path Finder in `cognicare/src/games/path-finder/`.

## Goal

An illustrated city in which the player plans a walk between real places —
home, the clinic, the pharmacy, the park — by tapping crossroads, then presses
**Check route** and is scored on distance, safety and planning. It keeps Path
Finder's slot in the app: same `GameId`, same `GameShell` turns, same
`RoundResult`, so progress saving, adaptive levels and doctor reports carry on.

The first build ships **one hand-made level**, "Find the Clinic", played as
three trips. More levels are new data files, not new code.

## What changes from the brief

| Brief | Here | Why |
|---|---|---|
| True isometric | ¾ top-down: flat streets, buildings extruded with roof, front wall and side wall | An isometric map is a 2:1 diamond. On a portrait phone a 4×5 town puts crossroads ~31dp apart; this app's tap minimum is 56dp (`TOUCH_MIN`). Axis-aligned streets give ~90dp. |
| `src/game`, `src/components`, `src/screens` | Everything under `src/games/path-finder/` | Every game owns its folder and plugs into `GameShell`. |
| Its own palette for the whole UI | Brief palette for **scenery only**; UI stays on the app theme | Theme text must clear 7:1; the brief's status colours fail as text. |
| Time worth 10 points | Weight kept; full marks unless a level sets a time limit (Level 1 does not) | "Speed is not the point" — the app's rule for every game. |
| `visualLength` vs `gameDistance` | `gameDistance` defaults to drawn length × 100 m; a level may override | No road labels on the map, so a road that looks short but scores long would be a trap, not a puzzle. |
| States idle / playing / routeBuilding / checking / success / failure / paused | `planning` → `result` (verdict `great` or `made-it`) | Idle is GameShell's intro screen; checking is synchronous; pause is not needed. |
| Left-turn limit rule | Not built | No level uses it. |

## Rules of play

- A route starts at the trip's start door and grows one crossroad at a time.
  A step must follow a road from the current crossroad.
- Tapping a crossroad next to you along a road walks there. Tapping a road that
  touches where you are walks along it. Anything else gets a short, specific
  note ("Walk one road at a time — the glowing roads go from where you are")
  and costs nothing.
- **Closed roads** (roadworks, an accident) cannot be walked. Tapping one says
  why.
- **Busy roads** can be walked but are unsafe; they cost safety points. They
  are drawn with traffic and a "Busy road" label, never by colour alone.
- **Stops** (`via`): some trips say "stop at the park on the way". A route that
  misses a stop, or takes stops out of order, loses planning points.
- Crossroads may be revisited (a stop can be a dead end). Undo is **Back one
  step**; **Start over** clears the route. Each press counts as a correction.
- **Check route** is enabled once the route ends at the destination; until then
  it shows why it is disabled.

## Scoring

The best route is the shortest route that avoids closed and busy roads and
makes every stop in order (Dijkstra per leg, legs joined). Weights come from
the level (Level 1: distance 40, safety 30, planning 20, time 10):

- **Distance** = weight × min(1, best ÷ yours)
- **Safety** = weight × (1 − metres on busy roads ÷ your metres)
- **Planning** = 0 if a stop was missed or out of order, else
  weight × max(0, 1 − 0.2 × corrections)
- **Time** = full weight with no limit; with a limit, weight × min(1, limit ÷ taken)

Total is 0–100. Verdict is **great** when distance and safety are full and no
stop is missed; otherwise **made-it**, with one calm line per shortfall ("A
shorter safe way was 200 m less — it is the dashed line") and the best route
drawn dashed over the map.

Mapping to `RoundResult` (one trip per turn):

| Field | Value |
|---|---|
| `hits` | 1 if verdict is great, else 0 |
| `misses` | stops missed (omissions) |
| `falseAlarms` | busy roads walked + taps on closed roads (commissions) |
| `accuracy` | total ÷ 100 |
| `avgReactionMs` | time from the map appearing to Check route |
| `score` | total |

## Level 1 — "Find the Clinic"

One town, three trips that tell a story. Each trip adds one idea:

1. **Home → Clinic**, "the shortest way". Roadworks close the obvious bridge
   over the river; the other bridges give real choices.
2. **Clinic → Pharmacy**, "avoid the busy road". The direct way runs along a
   busy road; a quiet way is as short or slightly longer.
3. **Pharmacy → Home, stopping at the park**. A footpath across the park is a
   shortcut for anyone who notices it.

The map: a 4×5 grid of crossroads with a river across the middle (bridges, not
every street crosses), a park with a diagonal footpath, houses, shops, trees,
parked cars, traffic on the busy road, traffic lights where it meets other
streets. The park's paths cross at a fountain (its own crossroad), which is the
trip-3 stop.

Measured (1 unit = 100 m): trip 1 best 400 m (600 m by the west bridge; 200 m
if the bridge were open); trip 2 best 300 m, and two busy-road routes are also
300 m; trip 3 best 442 m through the park, 500 m by streets alone (which misses
the stop). Tests pin each twist: the closure lengthens trip 1, a busy route ties
trip 2's best, and the footpath is on trip 3's best.

## Architecture

```
src/games/path-finder/
  engine/            pure TypeScript, no React — every rule unit-tested
    types.ts         CityLevel, CityNode, Road, Landmark, Lot, Trip, Weights
    graph.ts         adjacency, road lookup, Dijkstra (brief: PathFinder)
    route.ts         step / back / reset, with reasons (brief: RouteEngine)
    rules.ts         evaluate a finished route (brief: RuleEngine)
    score.ts         weighted breakdown, verdict, RoundResult (brief: ScoreEngine)
    game.ts          reducer: planning → result (brief: GameEngine)
    level.ts         validate level data, trip lookup (brief: LevelEngine)
    hit.ts           screen point → crossroad or road (forgiving tap)
  data/level1.ts     "Find the Clinic"
  levels.ts          PATH_LEVELS, PATH_MAX_LEVEL, pathLevel, describePathLevel
  city/
    palette.ts       scenery colours (+ contrast test for map labels)
    projection.ts    world → screen fit; building box faces
    Scenery.tsx      memoised static layers
    RouteLayer.tsx   route, best route, next-step glows, markers
    CityMap.tsx      Scenery + RouteLayer + tap gesture + a11y crossroads
  PathFinder.tsx     the turn: instruction card, map, stats, buttons, result
```

**Data.** `CityLevel` holds nodes (world units, 1 = 100 m), roads (`busy`,
`footpath`, optional `gameDistance`), landmarks (kind, label, door node, lot),
lots (rectangles: `houses`, `shops`, `park`, `trees`, `landmark`), water
rectangles, trips (`from`, `to`, `via`, `closed`, `title`, `instruction`) and
weights. Lot art is generated deterministically from the lot's id, so the
data stays short and the town looks the same every time.

**Rendering.** react-native-svg. Layer order: ground, water, park, roads,
bridges, markings, closed-road barriers, buildings and trees (sorted by depth),
cars, traffic lights, labels — all in `Scenery`, memoised on level and size.
`RouteLayer` draws on top and is the only part that redraws on a tap: the
walked route (white halo, blue core), the best route after checking (dashed),
roads you can take next (soft glow), you-are-here, destination pin, stop
markers. Buildings are inset so no roof covers a street; a test enforces it.

**Tapping.** One gesture-handler Tap over the map; `hit.ts` picks the nearest
crossroad within 40dp, else the nearest road within 32dp. For screen readers,
each crossroad is also an invisible accessible button underneath, labelled
"Crossroad by the clinic, you can walk here".

**State.** `useReducer(game)` — the reducer always sees the latest route, so
two taps in one render tick cannot both extend a stale route.

## Retired

`town.ts`, `sprites.tsx`, their tests, and the 15 generated levels. Saved
progress above level 1 clamps to 1 (`GameShell` already does this). The
`assets/town/` image slots go with `sprites.tsx`.

## Testing

- Engine: Dijkstra (incl. via legs and unreachable), step reasons, back/reset
  corrections, each rule, score weights and verdicts, `RoundResult` mapping,
  hit-testing, level validation.
- Level 1: every trip solvable safely; each trip's twist (above); doors on
  real nodes; no building over a street.
- Palette: map label text ≥7:1 on its pill; route halo ≥3:1 on road.
- Screen: a full trip played through `PathFinder` with the a11y crossroads,
  Check route, the result, and `onRoundComplete` payload; a closed-road tap
  explains itself.
- Visual check in the web preview before calling it done.

## Later (not in this build)

Levels 2+, drag-to-draw routes, walking animation, moving traffic, varying
which trips a session uses so the town is not memorised.

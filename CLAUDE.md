# CogniCare

Cognitive-training app for older adults with **Mild Cognitive Impairment** (not
Parkinson's — the folder name is historical). Eight exercise games, a 25-item
self-report check-in, and a doctor/admin side behind an approval workflow.

Two projects in one repo:

| Path | What |
|---|---|
| `cognicare/` | Expo SDK 57 / React Native app. Android is the target; web exists only for browser preview |
| `backend/` | Express + PostgreSQL (Neon) API |

Source documents that define the product: `Questionnare.docx` (the instrument)
and `ppt for cse students.pptx` (rationale + the seven game blueprints).
`ARCHITECTURE.md` holds the design decisions; `backend/README.md` holds the
access-control model and the endpoint→guard audit table.

## Running it

Node **22** — the machine default is 26, which Expo does not test against.

```bash
source ~/.nvm/nvm.sh && nvm use 22        # required in every new shell
cd cognicare && npx expo start --port 8083   # NOT 8081, another project owns it
cd backend   && npm run dev                  # :4000
```

`npx tsc --noEmit` in either project; tests are `npx jest` (app, 333) and
`npm test` (backend, 13).

The phone reaches the API over the LAN, so the API base URL is derived from the
Expo host at runtime — never hardcode `localhost`, that is the phone itself.

## Decisions that look wrong until you know why

- **Login is optional.** The games work with no account; an account only exists
  to share results with a doctor. A login wall in front of the exercises loses
  exactly the users this app is for.
- **The device is the source of truth.** Everything writes to on-device SQLite
  first and syncs after, so play never waits on a network.
- **`isVerified` is computed, never stored.** The database keeps
  `email_verified_at` and `approved_at` apart because they are different
  decisions. One flag would let a doctor approve themselves from their inbox.
- **Authorisation never trusts JWT claims.** Role, approval and assignment are
  re-read per request, so revoking a doctor takes effect immediately rather
  than whenever their token expires.
- **Read and write authority are separate.** An assigned doctor may read a
  patient's results but not create them (`requireSelf` on the write routes).
- **The dashboard has two panels that never combine.** Games and the
  questionnaire do not measure the same things; one merged "improvement"
  number would imply a link the data cannot support.
- **`misses` and `false_alarms` stay separate** everywhere, device to server.
  That difference distinguishes an attention lapse from an inhibition failure.
- **Colours are measured, not chosen.** The app is a light theme (owner's
  palette: blue #2563EB, teal #0F766E, page #F8FAFC, cards white, text
  #172033 / #475569, status green/amber/red). Every text pair clears 7:1 (WCAG
  AAA) *on the surface it sits on*, and edges of tappable things clear 3:1 —
  `src/theme/tokens.test.ts` fails if either drifts. The owner's exact colours
  are used for shapes only (logo, icons, ticks, chart lines, selection edges:
  `accentBright`, `success`, `warning`, `danger`, `teal`); they fail 7:1 as
  text (blue 5.2, green 3.3, amber 3.2), so text and white labels use the
  darker shade (`accent`, `successText`, `warningText`, `dangerText`). `Text`
  resolves colour per surface (`contrast.ts`): on a soft status tint or the
  selection tint, coloured and muted text yields to main text. Never hard-code
  a text colour; ask for the intent. Game charts are blue, check-in charts
  teal — the two panels never share a colour.
- **Typography and layout follow the "Warm Lantern" design system** (brief:
  `DESIGN_PROMPT.md`; its dark colours were replaced by the light theme
  above). Font is Atkinson Hyperlegible Next, loaded in the root layout; each
  weight is its own family because Android ignores `fontWeight` for custom
  fonts. Sprites are SVG illustrations in `src/art/`, never emoji.
- **Market Rush is drag-into-basket, but a tap does the same.** Drag is how
  it is taught; a tremor or a screen reader must not lock anyone out. Game
  time stops while an item is held (`market-rush/rules.ts`), so a slow hand
  never costs a missed item and reaction time means "until picked up".
- **Blink Trail adds exactly one light per level** (3 → 10 over 8 levels) on
  a fixed 3×4 board, and nothing else changes — one axis per step. It stops
  at 10: older adults' spatial span is about 5-6, and a level nobody passes
  only teaches failure. Old saves at levels 9-15 clamp to 8.
- **In Speedy Current every fish is a catch, from either end** (`speedy-current/
  layout.ts`, `currentRound`): some come down from the top (2 → 7 per turn),
  the rest up from the bottom; debris is always wrong, sharks never tapped.
  Items are bare drawings (no tile, no word); direction lives in the
  accessibility label. The water flows (`Backdrop flow="down"`, mirrored tiles
  so no seam) at 24dp/s, still under Reduce Motion.
- **Path Finder is a hand-made illustrated city** (spec:
  `docs/superpowers/specs/2026-10-07-city-pathfinder-design.md`). Levels are
  data (`path-finder/data/`); the engine (`engine/`) is pure and tested; the
  map (`city/`) is ¾ view, not isometric — an isometric diamond puts
  crossroads ~31dp apart on a portrait phone. One trip per turn; Check route
  scores distance 40 / safety 30 / planning 20 / time 10 (time full unless a
  level sets a limit). Busy roads walked and closed-road taps are false
  alarms, skipped stops are misses. `gameDistance` defaults to drawn length:
  with no labels on the map, a road that looks short but scores long is a
  trap. Edge places' names sit in the map margin — a pill is wider than a
  block. Only Level 1 exists; old saves (to 15) clamp to it.
- **Daily Order steps are pictures** (`daily-order/scenes.tsx`): each step's
  scene is found by the step's exact words, so a new step needs only a scene
  in `daily-order/art/` — sequencing and scoring never see pictures. Every
  scene is built from one kit (`art/kit.tsx`: one person, shared props,
  160×120, the app's ink outline) so 60+ drawings stay one set. Wrong steps
  get ordinary-looking pictures too — a cross or warning would give the answer
  away. A step without a scene shows `ActionCard`'s fallback (routine icon,
  bold words); `scenes.test.tsx` fails if a shipped step lacks one or a scene
  key matches no step.
- **A patient chooses their own doctor** (`care/`, `app/find-doctor.tsx`,
  Profile → "Your doctor"). Asking creates a PENDING request that shares
  nothing until an admin approves it; the patient can withdraw or stop sharing
  at any time with no admin step. Doctors still cannot initiate — naming a
  patient would disclose they are one.
- **The doctor's screens answer "who needs a look?" first** (`care/insight.ts`,
  `care/doctor/`). The list ranks patients by reasons computed from the rows the
  server already returns: no play for 7 days, check-in 5+ points worse or a
  worse band, a game down 10+ points (last 3 sessions vs the 5 before). Games
  and the check-in stay separate and say which way is good — higher for games,
  LOWER for the check-in. Not built, because each needs a server change:
  misses vs false alarms per game, per-question answers, sharing a note with
  the patient, and one summary endpoint (the list currently reads each
  patient's sessions separately, so each read is logged).
- **Falling items travel in lanes** (`games/shared/lanes.ts`): Market Rush 3,
  Speedy Current 4. Random position plus random entry time stacked items on
  top of each other. In Speedy Current a lane never carries an up-swimmer and
  a down-drifter at once (they would pass through each other), and lanes take
  turns at direction so position never gives away which way an item goes.
  The overlap tests replay every level on a 320dp phone frame by frame.
- **Sound Forest's animals differ in rhythm and timbre, not just pitch**
  (`scripts/gen-audio.mjs`). Five pip trains a semitone or two apart were
  indistinguishable to anyone; pitch is also the cue age erodes first. Duck
  and crow are real recordings (BigSoundBank, CC0): `scripts/cut-recordings.py`
  cuts one call from each original in `assets/audio/source/originals/`, then
  gen-audio places it left/right/centre. `sound-forest/audio.test.ts` checks the
  shipped files — under 760ms, sharp onset, right ear, not faint, not clipped.
  The `play-animal-sounds` npm package holds no audio, only soundbible links,
  several personal-use-only; do not install it.
- **Face ink in Emotion Meadow is a fixed dark constant**, not the theme text
  colour — the face is always a light circle, so theme ink would make the
  features vanish.
- **Emotion Meadow's animal faces stand frameless on the meadow**
  (`emotion-meadow/animals.ts`). The source sheet coloured each feeling's
  background (red = angry…), which would let a player match colours instead
  of reading faces; the animals were cut out with macOS Vision. One animal per
  trial, and a trial needing worried/calm (not in the set) is all drawn faces
  — never a mix, or the odd one out gives the answer away.
- **No face photographs are bundled.** See `src/games/emotion-meadow/photos.ts`
  for why and for the licensed sets to apply to.

## Traps already paid for

- **`authedFetch` calls that expire together must share one refresh.** Refresh
  tokens rotate, so N parallel refreshes with the same old token look like
  token reuse and can sign the user out. The refresh in flight is shared
  (`store/auth.ts`, tested in `auth.refresh.test.ts`).
- **Never put a test file under `src/app/`.** expo-router makes every file
  there a route, so `find-doctor.test.tsx` broke the whole web bundle
  ("expect is not defined"). Tests of a screen live beside its feature
  (`src/care/FindDoctor.test.tsx`).
- `@testing-library/react-native` v14: **`render` and `fireEvent` both return
  promises** and must be awaited. Wrapping timer advancement in `act()` nests
  act scopes and corrupts every following test.
- An effect that sets the state it also lists as a dependency cancels itself.
  This froze Blink Trail on "Get ready…".
- An early `return` that skips `setLoading(false)` renders a permanently blank
  screen with no error. Hit twice — check-in, then GameShell.
- Reading React state inside a tap handler goes stale when two taps land in one
  render tick. Use a ref for the authoritative value.
- `helmet` defaults to `Cross-Origin-Resource-Policy: same-origin`, which makes
  the browser discard every API response once the caller is cross-origin
  isolated.
- `expo-secure-store` is native-only and throws on web.
- Sound: phone speakers roll off below ~500Hz, and localisation is computed
  from a sound's **onset** — a slow fade-in destroys it.
- **Inside `withTransaction`, pass the transaction's `client` to every query.**
  Refresh rotation once issued the new token on the pool; its FK to the row
  locked `FOR UPDATE` deadlocked against its own transaction, so every token
  refresh hung until Postgres killed the idle transaction (FATAL 25P03).
- `pool.on('error')` only covers idle clients — pg-pool drops that listener on
  checkout. A checked-out client needs its own (`guardCheckedOut`), or a
  connection the server kills mid-transaction crashes the process.
- A bundled image (`require(...)`) defaults to its own pixel size, and
  `absoluteFill` does not override it; `ImageBackground` also hands `onLayout`
  to that inner image. Market Rush's aisle drew at 941×1672 and the board
  measured itself that wide — use `Backdrop` (explicit 100% size) instead.
- gesture-handler's pan `translationX/Y` count from touch-down on Android but
  from the ACTIVATION point on web (after `minDistance`), so a dragged item
  trailed the pointer and fell short of the basket. Track `absoluteX/Y` from
  `onBegin` instead — same on every platform.
- macOS paths are case-insensitive: `Basket.tsx` and `basket.ts` in one
  folder resolve to the same module. Hence `market-rush/rules.ts`.
- A hidden browser pane skips layout, so `onLayout` never fires and a board
  runs with nothing drawn. Verify gestures in Jest (`fireGestureHandler`)
  when the pane is not on screen.
- Two browser tabs on the web preview fight over the on-device SQLite file
  (OPFS lock) — keep one tab. `useKeepAwake` needs `suppressDeactivateWarnings`
  or leaving a game throws on web.

## Accounts

Admin `admin@cognicare.local`, demo doctor `doctor@demo.com` and demo patient
`asha.demo@demo.com` exist on the Neon database. Their passwords are comments
at the end of `backend/.env` (gitignored) — never in a tracked file, the repo
is public.

## Open items

1. Rotate the Neon password — it has been shared in plain text.
2. Neon holds two schemas: pre-existing Prisma tables (`"User"`, PascalCase)
   alongside these (`users`, snake_case). They coexist; it is a stopgap.
3. Not built: the deck's advanced level variants, the PDF report
   (`expo-print` installed, unused), settings, CSV export, i18n.
4. App icon and splash are still Expo defaults.

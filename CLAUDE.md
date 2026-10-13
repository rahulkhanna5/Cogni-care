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

`npx tsc --noEmit` in either project; tests are `npx jest` (app, 444) and
`npm test` (backend, 13).

The phone reaches the API over the LAN, so the API base URL is derived from the
Expo host at runtime — never hardcode `localhost`, that is the phone itself.

## Decisions that look wrong until you know why

- **Login is optional.** The games work with no account; an account only exists
  to share results with a doctor. A login wall in front of the exercises loses
  exactly the users this app is for.
- **The device is the source of truth.** Everything writes to on-device SQLite
  first and syncs after, so play never waits on a network.
- **Email verification is switched off** (`REQUIRE_EMAIL_VERIFICATION`, default
  false). There is no mail provider, so no one could ever confirm an address
  and every new account was locked out of the API. Off, an account is
  confirmed at registration (and existing ones at next sign-in); doctors still
  need an admin's approval. Set it to `true` on Render once mail is wired up.
- **`isVerified` is computed, never stored.** The database keeps
  `email_verified_at` and `approved_at` apart because they are different
  decisions. One flag would let a doctor approve themselves from their inbox.
- **A doctor is asked, as well as the admin.** The doctor sees a request the
  moment the patient sends it and can accept (`doctor_accepted_at`) or decline
  before or after the admin approves (`ACTIVE`). Access opens only when
  both have said yes: `canAccessPatient`, `assignedPatientIds` and the patient
  list all require `doctor_accepted_at IS NOT NULL`. A decline is an ordinary
  `REJECTED` row. It is a column, not a status, so the "ACTIVE needs an
  approver" constraint is untouched; migration 004 backfills existing ACTIVE
  rows as accepted so no current relationship is cut. The doctor's Patients
  tab shows the waiting requests above the list (`IncomingRequests`).
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
  block. Six levels: Level 1 is written by hand, 2 to 6 are built from a short
  spec (`data/town.ts`, `data/towns.ts`), each a different town. Old saves (to
  15) clamp to level 6. `engine/difficulty.ts` scores every trip and
  `data/levels.test.ts` fails unless each level beats the last by 2+.
- **Daily Order never repeats a task as you go up** (`daily-order/levels.ts`).
  Every routine has SEVEN steps and THREE wrong steps, so every level has all
  eight routines to draw from; a round avoids the last six shown (module
  memory, `forgetTasks()` in tests). It used to pick at random from routines
  long enough for the level, and only one reached 7 steps — so levels 9 and
  10 showed grocery shopping every time. Eight levels, each adding exactly one
  card (3 → 10); the old ten had three levels that traded a wrong step for a
  step and felt the same.
- **Daily Order steps are pictures** (`daily-order/scenes.tsx`): each step's
  scene is found by the step's exact words, so a new step needs only a scene
  in `daily-order/art/` — sequencing and scoring never see pictures. Every
  scene is built from one kit (`art/kit.tsx`: one person, shared props,
  160×120, the app's ink outline) so 80 drawings stay one set. Wrong steps
  get ordinary-looking pictures too — a cross or warning would give the answer
  away. A step without a scene shows `ActionCard`'s fallback (routine icon,
  bold words); `scenes.test.tsx` fails if a shipped step lacks one or a scene
  key matches no step.
- **The check-in sets where each game starts** (`assessment/startLevels.ts`).
  Normal 8, Mild 5, Moderate 3, Severe 1, capped at each game's top level.
  The direction is deliberate and was confirmed with the owner: the check-in
  score runs the opposite way to a game score (higher = more impairment), so a
  healthier band starts further up and a more impaired one at level 1, where a
  first win is certain. It is written once, when a check-in is saved
  (`presetStartLevels`), and only to games with `total_plays = 0` — a level the
  player earned is never overwritten by a questionnaire. The ladder then moves
  them as usual.
- **Every level of every game must be harder than the last**
  (`games/ladder.test.ts`). It audits each game's table on its EFFECTIVE axes —
  no axis may get easier, and at least one must get harder — and
  `levels.smoke.test.tsx` draws every level of every game. Add an axis here
  when you add one to a table. It exists because a client saw tasks repeat, and
  the audit found Emotion Meadow levels 2-4 identical (four feelings can only
  make four faces, and "subtle" never reaches the animal faces) and 11-15 one
  level.
- **Emotion Meadow's ladder** (`emotion-meadow/levels.ts`): faces 3-6 (capped
  by the pool), feelings 4 then 6, a share of look-alike trials (the answer
  beside a feeling it is confused with, `LOOK_ALIKES`), and subtlety 1.0 to
  0.45 (the floor `Face.tsx` draws). The same question is never asked twice
  running.
- **Falling items travel in lanes** (`games/shared/lanes.ts`): Market Rush 3,
  Speedy Current 4. Random position plus random entry time stacked items on
  top of each other. In Speedy Current a lane never carries an up-swimmer and
  a down-drifter at once (they would pass through each other), and lanes take
  turns at direction so position never gives away which way an item goes.
  The overlap tests replay every level on a 320dp phone frame by frame.
- **Sound Forest's five animals are all real recordings** — dog, goat, cat,
  duck, crow — because synthesised calls failed four ways (see the header of
  `scripts/gen-audio.mjs`): tones read as buzzing, low sines vanish on a phone
  speaker (it rolls off below ~500Hz), a soft fade-in destroys localisation
  (computed from a sound's **onset**), and a pip a semitone apart is the same
  animal to everyone. `scripts/cut-recordings.py` cuts one call from each
  original in `assets/audio/source/originals/`, then gen-audio places it
  left/right/centre. `sound-forest/audio.test.ts` checks the shipped files —
  under 760ms, sharp onset, right ear, not faint, not clipped. Duck and crow are
  CC0 (BigSoundBank); dog, goat and cat are Mixkit, whose licence allows use in
  an app but not stand-alone redistribution, so those three originals are
  gitignored and only the cut clips are committed. A level uses the first N in
  `ANIMALS`, so that list is in difficulty order. The `play-animal-sounds` npm
  package holds no audio, only soundbible links, several personal-use-only; do
  not install it.
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

- **The admin portal is four sections** (`app/(tabs)/admin.tsx`): Review
  (approvals), Connections (every patient↔doctor pair, grouped by who it is
  waiting on), Patients, Doctors (`src/admin/`). A patient opens the same
  detail screen a doctor uses, under the admin's logged `ADMIN_OVERRIDE`; a
  doctor opens `app/admin-doctor/[id].tsx`. Directory data is one query per
  list on the server (`/admin/patients`, `/admin/doctors[/:id]`).
- **Exports are built from pure functions** (`care/report/build.ts`, tested),
  then saved by `share.ts`: web downloads the CSV and opens the print dialog
  for the PDF; a phone shares the PDF file and the CSV as text
  (`expo-file-system` is not installed). "Stuck" = two or more hard rounds on
  one level, a hard round being under 60% right or more mistakes than hits
  (`care/report/levels.ts`); the line says whether it is misses or wrong taps.
- **With email verification off, admin approval does not wait on it**: the
  pending list reports the address as confirmed and approving stamps it.

- **Terms and privacy are app text, versioned** (`legal/content.ts`,
  `LEGAL_VERSION`). Sign-up will not submit until "terms" and "privacy" are
  ticked (doctors also declare their details true); the version agreed to is
  stored on the user (`terms_version`, `terms_accepted_at`, migration 005).
  The server accepts a missing version only so an old APK can still register.
  The text is a product draft, not legal advice: have it reviewed (India: DPDP
  Act 2023) before launch, and bump the version whenever it changes. The
  privacy text says the AI features send the patient's name — they do
  (`patient-summary.service.ts`).

## Traps already paid for

- **`authedFetch` calls that expire together must share one refresh.** Refresh
  tokens rotate, so N parallel refreshes with the same old token look like
  token reuse and can sign the user out. The refresh in flight is shared
  (`store/auth.ts`, tested in `auth.refresh.test.ts`).
- Jest's default 5s timeout fails the long simulated-turn tests (Speedy
  Current, Market Rush) only when the whole suite runs in parallel — they take
  ~1.7s alone. `testTimeout` is 30s in `package.json`; do not lower it.
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
- **Render does not run migrations by itself.** `buildCommand` only compiles,
  and `tsc` does not copy `.sql`. `server.ts` now awaits `migrate()` before
  listening (and exits if it fails, so the platform keeps the previous deploy),
  and `migrate.ts` falls back to `src/db/migrations` when run from `dist/`.
  Migrations must stay additive: the old instance serves during the new one's
  boot.
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
3. Not built: the deck's advanced level variants, settings, i18n, patient
   reviews of doctors, the patient-facing view of shared remarks.
4. App icon and splash are still Expo defaults.

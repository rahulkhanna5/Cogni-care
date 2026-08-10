# Cognitive Training App — Architecture & System Design

**Target users:** Older adults with Mild Cognitive Impairment (MCI)
**Scope v1:** 7 cognitive games + per-player dashboard
**Constraints:** No login, no accounts, no backend. Local-only. Runs in Expo Go on Android.

---

## 1. Tech Stack

All versions verified against the npm registry on 2026-08-10.

| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | Expo SDK | 57.0.11 | Latest. Expo Go only supports the newest SDK. |
| Runtime | React Native | 0.86.2 | Paired with SDK 57. |
| Language | TypeScript | 5.x | Scoring logic must not silently break. |
| Navigation | expo-router | 57.0.11 | File-based routing. |
| Animation | react-native-reanimated | 4.5.1 | Runs on the UI thread — 60fps for falling items. |
| Gestures | react-native-gesture-handler | 2.32.0 | Drag paths in Path Finder. |
| Vector graphics | react-native-svg | 15.15.4 | Game art + all dashboard charts. |
| Database | expo-sqlite | 57.0.1 | On-device relational store. |
| Audio | expo-audio | 57.0.3 | Sound Forest, feedback tones. |
| Haptics | expo-haptics | 57.0.1 | Tap confirmation. |
| State | zustand | 5.0.14 | 3 KB. Current player + session only. |
| Fonts | expo-font | 57.0.1 | One legible typeface, loaded once. |
| Screen wake | expo-keep-awake | 57.0.1 | Screen must not sleep mid-game. |
| Orientation | expo-screen-orientation | 57.0.1 | Lock to portrait. |
| Dates | date-fns | 4.4.0 | Streaks and weekly grouping. |

### Deliberately excluded

| Not using | Reason |
|---|---|
| `@shopify/react-native-skia` | Not bundled in Expo Go. Would force a dev build. |
| `victory-native` | Depends on Skia. Same problem. |
| `react-native-gifted-charts` | Pulls a native gradient dep. Our charts are simple — plain SVG is safer and lighter. |
| `react-native-mmkv` | Native module, not in Expo Go. |
| Any ORM (Drizzle/Prisma) | Schema is 6 tables. Raw SQL in a thin data layer is less to debug. |
| Backend / auth / cloud | Explicitly out of scope for v1. |

**The governing rule:** if a package needs native linking, it does not work in Expo Go. Every choice above respects that.

---

## 2. Environment Setup

Current machine: Node **26.7.0**, npm 11.19.0, git 2.51.2, nvm present at `~/.nvm`.

Node 26 is ahead of what Expo officially tests against. If install or Metro misbehaves, drop to LTS:

```bash
source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22
```

Optional but recommended on macOS (faster file watching):

```bash
brew install watchman
```

### Running on the Android phone

1. Install **Expo Go** from the Play Store.
2. Phone and Mac on the **same Wi-Fi**.
3. `npx expo start --port 8083` → scan the QR code with Expo Go.
4. If the network blocks it (college Wi-Fi often does): add `--tunnel`.

**Port 8083, not the default 8081.** Another project on this machine (`repcounter`) already
occupies 8081. Starting on the default will either fail or attach to the wrong project.

Node must be 22 for this project — the machine's default `node` is 26:

```bash
source ~/.nvm/nvm.sh && nvm use 22
```

---

## 3. Domain Coverage — A Gap Worth Knowing

The questionnaire and the games measure overlapping but **not identical** things.

| Questionnaire domain | Trained by which game? |
|---|---|
| Attention & Concentration | Speedy Current, Dual Task Flow, Sound Forest |
| Short-Term Memory | Market Rush, Blink Trail, Sound Forest |
| Long-Term Memory | **Nothing** |
| Processing Speed | Speedy Current, Market Rush, Dual Task Flow |
| ADL | **Nothing directly** (Path Finder is closest) |

And two games train things the questionnaire never asks about:
- **Emotion Meadow** → social cognition
- **Path Finder** → planning / executive function

**Consequence for the dashboard:** never draw a single line implying "games improved your ADL score." The dashboard shows two separate panels — *Self-Reported* and *Trained* — and does not fake a causal link between them.

Fixable later by adding an LTM game (famous faces, autobiographical prompts) and 2–3 executive/social questionnaire items.

---

## 4. Data Model (SQLite)

```sql
players (
  id, name, age, created_at
)

assessments (
  id, player_id, taken_at,
  total_score,                 -- 0..100, HIGHER = MORE impairment
  band,                        -- normal | mild | moderate | severe
  attention, stm, ltm, speed, adl   -- 0..20 each
)

assessment_answers (
  id, assessment_id, item_no, domain, value   -- value 0..4
)

game_progress (
  player_id, game_id,
  current_level, best_score, total_plays, last_played_at
)

game_sessions (
  id, player_id, game_id, started_at, ended_at,
  level_start, level_end, accuracy, score,
  avg_reaction_ms
)

game_rounds (
  id, session_id, round_no, level,
  hits, misses, false_alarms, accuracy, avg_reaction_ms
)

settings (key, value)
```

`game_rounds` is the research-grade layer — it captures **false alarms separately from misses**, which is the distinction that actually matters for inhibition and attention measures. Do not collapse them into one "wrong" counter.

---

## 5. Scoring Engine

Two independent scoring systems. They must never be averaged together.

### Questionnaire (subjective)
- 25 items, 5 domains × 5 items, each 0–4
- Total 0–100 · Per-domain 0–20
- **Higher = worse**

| Band | Score |
|---|---|
| Normal | 0–20 |
| Mild | 21–40 |
| Moderate | 41–70 |
| Severe | 71–100 |

### Game performance (objective)
- Per session: accuracy %, mean reaction time, level reached
- **Higher = better**

**The direction trap:** questionnaire up = declining, game score up = improving. Every chart must be labelled so this is unambiguous. This is the single easiest thing to get wrong in the whole app.

### Adaptive difficulty (all 7 games, one rule)

| End-of-round accuracy | Action |
|---|---|
| ≥ 85% | Level up |
| 60–84% | Hold |
| < 60% | Level down |

Guard rule: **never demote twice in a row.** Hold instead. Two consecutive demotions reads as failure and people quit.

---

## 6. Game Architecture

All 7 games share one shell. Only the middle piece differs.

```
GameShell
  ├─ Intro       — what to do, in plain words + a demo
  ├─ Countdown   — 3 · 2 · 1
  ├─ Play        — ← the only game-specific part
  ├─ Round end   — score, then adaptive level decision
  └─ Summary     — write session + rounds to SQLite
```

Each game exports one config object:

```ts
type GameConfig = {
  id: string
  title: string
  domains: Domain[]
  levels: LevelSpec[]          // per-level tuning numbers
  roundDurationMs: number
  needsHeadphones?: boolean    // Sound Forest
}
```

Adding game #8 later = one config + one Play component. Nothing else changes.

### Rendering approach per game

| Game | Technique |
|---|---|
| Market Rush | Reanimated translateY on item sprites |
| Speedy Current | Same, bidirectional |
| Blink Trail | Grid of Pressables, timed highlight |
| Emotion Meadow | Static faces + prompt (**camera bonus cut from v1**) |
| Sound Forest | expo-audio stereo pan + tap zones (**headphone gate**) |
| Path Finder | SVG map + gesture-handler drag path |
| Dual Task Flow | Two independent timers, one screen |

---

## 7. Dashboard

Per-player, four sections:

1. **Today** — streak, minutes played, next recommended game
2. **Self-Reported** — pentagon radar of 5 questionnaire domains + band, with retake history
3. **Trained** — per-game current level, accuracy trend line, reaction-time trend
4. **Report** — export PDF via `expo-print` + `expo-sharing` for a clinician or family member

All charts hand-built in `react-native-svg`. Three chart types total: pentagon radar, line, bar.

---

## 8. Folder Structure

The SDK 57 template roots expo-router at **`src/app`**, not `app/`. Path alias `@/*` → `./src/*`.

```
src/
  app/                      # expo-router screens
    _layout.tsx             # SQLiteProvider + Stack
    index.tsx               # boot router
    welcome.tsx             # first-run player creation
    (tabs)/
      dashboard.tsx  games.tsx  assess.tsx
    game/[id].tsx           # GameShell host
  games/
    market-rush/  speedy-current/  blink-trail/
    emotion-meadow/  sound-forest/  path-finder/  dual-task-flow/
    shell/                  # GameShell, countdown, summary
  db/
    schema.sql  client.ts  queries.ts  migrations.ts
  scoring/
    questionnaire.ts  adaptive.ts  domains.ts
  ui/                       # Button, Card, Screen, Text primitives
  charts/                   # Radar, Line, Bar
  store/                    # zustand
  theme/                    # tokens
assets/  fonts/ audio/ images/
```

---

## 9. Design System — Built for Older Eyes and Hands

Not decoration. These are accessibility requirements for this user group.

| Token | Value | Rationale |
|---|---|---|
| Body text | 20 pt min | Standard 14–16 pt is unreadable for many 65+ |
| Headings | 28–32 pt | |
| Touch target | 56 dp min | Above the 44 dp norm — tremor and reduced precision |
| Contrast | 7:1 (WCAG AAA) | Age-related contrast sensitivity loss |
| Font weight | 400 / 600 only | No thin or light weights, ever |
| Spacing scale | 8 / 16 / 24 / 32 | Generous. No dense layouts. |
| Corner radius | 16 | Soft, calm |

**Palette** — calm and low-arousal, matching the "soft music, muted distractors" intent in the source deck:

| Role | Hex | Contrast |
|---|---|---|
| Background | `FAFAF8` | — |
| Surface | `FFFFFF` | — |
| Text primary | `1F2933` | 14.1:1 on bg |
| Text muted | `4A5760` | 7.1:1 on bg |
| Accent | `246257` (deep teal) | white on it = 7.1:1 |
| Success | `2A634E` | white on it = 7.0:1 |
| Warning | `814C25` | white on it = 7.0:1 |
| Danger | `A23024` | white on it = 7.0:1 |

These are the *verified* values. The first draft of this palette (`2E7D6F`, `5C6B73`, `3B8C6E`, `C97A40`) was checked with a contrast script and came in at 3.3–5.3:1 — well short of the 7:1 this section requires. Re-run the check in `src/theme/tokens.ts` before changing any of them.

Green/red alone never carries meaning — always paired with an icon or word, for colour-blind users.

**Interaction rules:** no timers anywhere outside gameplay · no auto-advancing screens · Back button on every screen, always same corner · every game is quittable mid-round without losing prior data.

---

## 10. Build Order

| Phase | Deliverable | Verifiable by |
|---|---|---|
| 0 | Scaffold + Expo Go loads on the Android phone | Blank screen renders on device |
| 1 | Design system, navigation, player create, SQLite bootstrap | Can create a player, survives app restart |
| 2 | **Blink Trail** (simplest game) end-to-end through GameShell | Full loop: play → score → level → saved |
| 3 | Dashboard v1 reading real data from phase 2 | Charts show actual sessions |
| 4 | Market Rush, Speedy Current, Dual Task Flow | Three motion-based games |
| 5 | Path Finder, Emotion Meadow, Sound Forest | Remaining three |
| 6 | Questionnaire + radar + PDF export | Full assessment flow |

Phase 2 is the important one — it proves the shell, the adaptive rule, and the DB writes all work together. Every game after it is a repeat of a known-good pattern.

---

## 11. Open Items

- Game assets (grocery icons, fish, faces, animal sounds) — need free-licence sources or generated placeholders
- Emotion Meadow faces should ideally come from a validated stimulus set if this feeds real research
- Hindi/regional language strings — i18n wired from day 1, translated later

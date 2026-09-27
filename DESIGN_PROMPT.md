# CogniCare — design brief for Claude Design

> This document describes an existing, working mobile app: every screen, every
> interaction, and all eight games. Please design a complete UI/UX for it.
> Section 3 lists hard rules. Everything else — layout, illustration, motion,
> wording polish, visual personality — is yours to improve.

---

## 0. What to produce

1. **A small design system first** — colours, type scale, spacing, and the
   components listed in §4.
2. **Every screen in §6–§12**, including their empty, loading, error and
   success states.
3. **The new screens in §13**, which the app still needs.

- **Frame:** Android phone, portrait, 360 × 800. Check that nothing breaks at 412 wide.
- **Theme:** dark (the app is dark-only today).
- **Build target:** React Native (Expo). Keep designs implementable with flat
  views, rounded rectangles, SVG icons and simple flat illustrations. No
  glass/blur effects, no web-only tricks.

**Suggested order:** design system → Login + Today + Games list → the game
shell + Blink Trail → the other seven games → check-in → doctor and admin →
new screens.

---

## 1. The product in one paragraph

CogniCare is a brain-training app for older adults with **Mild Cognitive
Impairment (MCI)** — memory, attention and thinking difficulties that are more
than normal ageing but still allow independent living. It has **eight short
exercise games** that automatically adjust their difficulty to the player, a
**25-question self-report "check-in"** about everyday difficulties, and
progress dashboards. The games work fully **offline with no account**. A
patient can optionally create an account to **share results with a doctor**.
Doctors see their assigned patients' progress and write notes with **AI help**.
An **administrator** approves doctors and every doctor–patient connection.

---

## 2. Who uses it

| Role | What they do | Where they land |
|---|---|---|
| **Patient / guest** (main user) | Plays the games, takes the check-in, sees their own progress, can ask an AI assistant about their results | Today (home dashboard) |
| **Doctor** | Sees assigned patients' results, writes remarks (with an AI draft), chats with an AI about a patient | Patients list |
| **Admin** | Approves doctor registrations and patient–doctor connections | Review desk |

**The main user is 60–85 years old** and may have: slower thinking speed;
trouble holding multi-step instructions in mind; reduced contrast sensitivity
and blurry near vision; hand tremor and less precise taps; little smartphone
experience; and anxiety about "being tested". They often use the app alone.
Sometimes a family member helps them set it up.

Design for them: **calm, obvious, forgiving, one thing at a time.**

---

## 3. Non-negotiables (hard rules)

### Accessibility
- **All text at least 7:1 contrast (WCAG AAA)** — body, captions, button
  labels, chart labels, tinted boxes. Measure against the colour the text
  *actually sits on* (a card, a tinted box), not just the page background.
- **Edges of interactive things** (input fields, unselected answer buttons,
  grid cells, chips) at least **3:1** against what is behind them.
- **Touch targets at least 56 × 56 dp.** Primary actions and answer buttons
  bigger (64 dp+). At least 8 dp between neighbouring targets.
- **Body text at least 20 sp; captions at least 16 sp.** Only regular (400)
  and semibold (600) weights — no light or thin fonts.
- **Every icon carries a visible text label**, the tab bar included. The only
  exceptions are the standard close ✕ and back ‹, which still have
  accessibility labels.
- **Tap always works.** No swipe-only, long-press, drag-only, pinch or
  double-tap interactions anywhere — games included. The one drag in the app
  (Market Rush: items into the basket) is also done by a tap, and the aisle
  pauses while an item is held.
- **Never colour alone.** Right/wrong, selected/unselected and active/inactive
  must also differ by icon, text, border weight or shape.
- Respect "reduce motion". Animations short and gentle. Nothing flashes more
  than 3 times a second.

### Tone and safety
- **Never say** "wrong", "failed", "game over" or "lose". No lives, hearts,
  leaderboards, or comparisons with other people. A mistake gets a gentle cue,
  then the game carries on or moves on.
- **No countdown clocks during play.** The 3-2-1 before a game starts is fine.
  The app's line is: *"Take your time — speed is not the point."*
- **Not a medical product.** The check-in result and all AI text carry a
  "this is not a medical diagnosis" line. The AI never gives medication,
  dosage or diagnosis.
- Plain words, short sentences. Explain every number: say *"Higher is
  better"* or *"Lower is better"* next to it.

### Data honesty (these follow from how the data works — don't simplify them away)
- **Games and check-in are always two separate panels.** Never merge them into
  one score, one chart, or an "overall improvement" number. They measure
  different things.
- **Direction is opposite and must be labelled every time:** game results —
  higher is better; check-in — higher means *more* difficulty, so **lower is
  better**.
- For doctors, **"misses"** (didn't respond to a target → an attention lapse)
  and **"false alarms"** (responded when they shouldn't have → an inhibition
  failure) are always shown separately.
- Any chart with two series has a legend.

### Product rules
- **The games never require an account.** "Continue without an account" stays
  a visible, first-class option on the sign-in screen.
- **No photographs of real faces anywhere.** Emotion Meadow uses illustrated
  faces.
- The check-in questions are a fixed instrument. **Their wording must not
  change** (it would make old and new scores incomparable).

---

## 4. Visual foundations

### Colour
**Brand colours supplied by the owner — keep these:**
background `#1F1D1E`, primary `#FF968C` (warm coral), secondary `#332F29`
(warm dark brown, used for cards).

Current tokens, as a starting point. You may adjust non-brand values; re-check
contrast after any change.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| bg | `#1F1D1E` | page | — |
| surface | `#332F29` | cards, tiles | — |
| surfaceRaised | `#3D3830` | raised blocks | — |
| text | `#EDE6E3` | main text | 13.6:1 on bg |
| textMuted | `#C4BAB5` | secondary text | 8.8:1 on bg, **only ≈7.0:1 on surface** — on the line |
| textInverse | `#1F1D1E` | text on coral buttons | 8.0:1 on accent |
| accent | `#FF968C` | primary actions, highlights | 8.0:1 on bg |
| accentSoft | `#43302E` | tint behind selected items | **coral text on this is only ≈5.9:1 — fails 7:1** |
| success | `#8FD9B6` | correct, goal | 10.2:1 on bg |
| warning | `#F0C08A` | caution notes | 10.1:1 on bg |
| danger | `#FF9B94` | errors, mistakes | 8.3:1 on bg |
| dangerSoft | `#3A2523` | error box tint | — |
| border | `#474139` | edges | **≈1.7:1 on bg — too faint for input edges** |
| disabled | `#6B635C` | placeholders, disabled | — |

### Type (current scale)
| Style | Size / line height | Weight |
|---|---|---|
| display | 34 / 42 | 600 |
| title | 28 / 36 | 600 |
| heading | 22 / 30 | 600 |
| body | 20 / 30 | 400 |
| label | 18 / 26 | 600 |
| caption | 16 / 24 | 400 |

The app uses the system font today. A face built for low-vision readers, such
as **Atkinson Hyperlegible**, would suit this audience well.

### Spacing, shape, size
- 8 pt grid: 4, 8, 16, 24, 32, 48.
- Corner radius: 8, 16, 24, pill.
- Minimum touch size 56 dp.

### Components to design (names match the code)
- **Button** — *primary* (coral fill, dark text), *secondary* (dark fill, coral
  2 px border, coral text), *quiet* (text only, coral). Full width by default.
  Also: disabled, and busy ("Signing in…").
- **Card** — surface fill, radius 24. Optionally tappable, with a chevron ›.
- **Stat tile** — big number with a small caption.
- **Text field** — label always above the field, never placeholder-only. Error
  line below.
- **Answer button** — the check-in's five big choices, with a selected state.
- **Two-option toggle** — "I am a patient / I am a doctor".
- **Suggestion chip** — tappable example questions in chat.
- **Chat bubble** — you / assistant, plus a "Thinking…" indicator.
- **Banners** — error, warning, success, info/pending.
- **Charts** — level meter (level N of max), accuracy sparkline, dumbbell
  chart (previous vs latest per area), area bars (0–20).
- **Bottom tab bar** — icon + label for every tab.
- **Game pieces** — grid cell (idle / lit / correct / mistake / disabled),
  moving sprite (picture + word), face tile, animal tile, step card (placed /
  available / mistake), big response pad.

**Icons:** Ionicons, outline style. In use today: home, grid, clipboard,
person, people, shield-checkmark, headset, hourglass, chevron-back, close,
flag, volume-high, medkit, arrow-up (send).

**Haptics:** a light tap on every correct action, a warning buzz on every
mistake. Design the *visual* cue that goes with each.

---

## 5. App map and navigation

### Where the app opens
A spinner on the background colour, then:

| Situation | Goes to |
|---|---|
| Not signed in | Login (with "Continue without an account") |
| Signed-in patient | Today (or Welcome, if they have no local profile yet) |
| Signed-in doctor, not yet approved | Awaiting approval |
| Signed-in approved doctor | Patients |
| Signed-in admin | Review |

### Bottom tabs by role
- **Patient / guest:** Today · Games · Check-in · Profile
- **Doctor:** Patients · Profile
- **Admin:** Review · Profile

### Full-screen (no tab bar)
Auth screens, Welcome, any game, the check-in questionnaire, chat, "Why this
works", the doctor's patient detail, and the doctor's patient chat.

### Key journeys (use these for prototypes)
1. **First run, no account:** Login → Continue without an account → Welcome
   (name) → Today → Suggested next → game intro → 3-2-1 → turns → summary →
   Today, now showing progress.
2. **Check-in:** Check-in tab → Start → 25 questions (can stop and resume
   later) → result → both Today and the Check-in tab update.
3. **Patient with a doctor:** Register as patient → play → Profile → Share now
   → *Connect to a doctor (new, §13)* → waiting → admin approves → the doctor
   can see results.
4. **Doctor:** Register as doctor → Awaiting approval → admin approves →
   Patients → a patient → Draft with AI → edit → Save remark → Chat.
5. **Admin:** Review → approve a doctor → approve a patient connection.
6. **Forgot password:** Login → Forgot password? → email → Check your email →
   link → Choose a new password → Password updated → Sign in.

---

## 6. Entry and account screens

### 6.1 Login
- Title **"Welcome back"**, subtitle "Sign in to continue."
- Fields: Email, Password.
- Link **"Forgot password?"**
- Primary **"Sign in"** — disabled until both fields are filled; busy state
  "Signing in…".
- Secondary **"New here? Create a patient or doctor account"**.
- Quiet **"Continue without an account"**.
- Footnote: "You can use the exercises without signing in. An account is only
  needed to share your progress with a doctor."
- Error banner examples: "Email or password is incorrect." · "Too many
  attempts. Please try again shortly." · "Could not reach the server. Check
  your connection."
- **No role picker here.** The account itself decides the role; the app routes
  doctors and admins automatically. Role is chosen only when registering.

### 6.2 Register
- Title **"Create an account"**.
- Two-option toggle: **"I am a patient" / "I am a doctor"**.
- Fields: Full name, Email, Password (at least 10 characters).
- **Doctor only:** Specialty, Registration / licence number, Short bio
  (optional), and a **"What happens next"** card:
  1. Confirm your email address.
  2. An administrator checks your registration number against the medical
     council register.
  3. Once approved, patients can ask to be connected to you.

  *"You can sign in while you wait. No patient information is visible until
  both your account and each patient connection are approved."*
- Primary **"Create account"** (busy: "Creating…"). Quiet **"I already have an
  account"**.
- After success: a patient goes to Today; a doctor goes to Awaiting approval.

### 6.3 Forgot password
- **"Reset your password"** — "Enter the email on your account. If it is
  registered, we will send a link to reset your password."
- Email field → **"Send reset link"** (busy: "Sending…") · "Back to sign in".
- Confirmation state **"Check your email"** — "If you@example.com is
  registered, we have sent a link to reset the password. It expires in 30
  minutes." The message is the same whether or not the email exists — that is
  deliberate, for privacy.

### 6.4 Choose a new password
- **"Choose a new password"** — "Set a new password below."
- A **"Reset code"** field ("Paste the code from your email") appears only if
  the user arrived without a link.
- New password (at least 10 characters), Confirm new password ("Type it
  again"). Inline: "Passwords do not match."
- **"Update password"** (busy: "Updating…").
- Success state: **"Password updated"** — "Sign in with your new password. For
  safety, this also signed you out everywhere else." → **"Go to sign in"**.
- Expired link: "This reset link is invalid or has expired."

### 6.5 Awaiting approval (doctor)
- Large hourglass icon. **"Awaiting approval"**.
- Card: "Thanks, [name] — your account has been created and your email is
  confirmed." / "An administrator now reviews your specialty and registration
  number. Until that is done you cannot be connected to patients, and no
  patient information is visible." / "You will not lose anything by closing the
  app — just sign in again later."
- **"Check again"** (busy: "Checking…") · quiet **"Sign out"**.
- This must feel like *waiting*, not like an error the doctor caused.

### 6.6 Welcome (local profile — no account)
- **"Welcome"** — "A few brain exercises, a few minutes a day. Let's start with
  your name."
- **Your name** ("First name"), **Your age (optional)** ("e.g. 68", numbers
  only).
- **"Continue"** (busy: "Saving…").
- "Everything stays on this phone. Nothing is sent anywhere."
- Deliberately two fields and one button. This screen is where this audience
  drops out if it asks for more.

---

## 7. Patient screens

### 7.1 Today (home dashboard)
Top to bottom:
1. **"Hello, [name]"**.
2. **Three stat tiles:** Day streak · Today (sessions played) · This week.
3. **"Suggested next" card** — the game played least recently, so practice
   rotates across skills. Shows its title and one-line description, plus
   **"Play [game]"**.
4. **Panel 1 — "Trained"**: "How you are doing in the games. Higher is better."
   One row per game played:
   - name and "Level N"
   - a level meter
   - an accuracy sparkline (recent sessions) with the average %
   - "7 sessions · best 180"

   Empty state: "No games played yet. Your progress will show up here."
5. **"Have a question?" card** — "Ask about your practice results in plain
   language." → **"Ask about your results"** (opens chat, §7.5).
6. **Panel 2 — "Self-reported"**: "Your check-in answers. Lower is better here."
   - the latest score **"39 / 100"**
   - its band label, e.g. **"Mild cognitive impairment"**
   - a dumbbell chart of the five areas, previous vs latest
   - legend: "Previous check-in" / "Latest check-in"

   Empty state: "No check-in yet." + **"Take the check-in"**.

**Panels 1 and 2 must stay visibly separate.**

### 7.2 Games
- **"Games"** — "8 exercises. Each one trains something different."
- Eight cards: title, a headphones icon where needed, one-line description,
  **"Tap to play ›"**.
- Improvement idea: also show the player's current level and small "Trains:"
  tags on each card.

| Game | Card text | Trains |
|---|---|---|
| Blink Trail | Watch the lights, then tap them back in the same order. | Short-term memory, attention |
| Market Rush | Remember the shopping list, then pick those items out of the crowd. | Short-term memory, speed, attention |
| Speedy Current | Tap only the fish swimming against the current. | Processing speed, attention, self-control |
| Sound Forest 🎧 | Listen to the forest and find where each sound came from. | Listening attention, short-term memory |
| Path Finder | Plan the shortest safe route across town. | Planning, problem solving, daily living |
| Emotion Meadow | Find the face showing the feeling you are asked for. | Emotion recognition, social thinking |
| Daily Order | Put the steps of an everyday task into the right order. | Long-term memory, daily living, sequencing |
| Dual Task Flow | Two things at once — watch and listen at the same time. | Divided attention, task switching, speed |

### 7.3 Check-in tab
- **"Check-in"** — "25 short questions about how things have felt lately.
  There are no wrong answers."
- **Last result card:** "Last check-in · 11 Aug 2026", "39 / 100", the band
  label, and a change sentence spelled out in words:
  - "12 points lower than last time — fewer difficulties reported."
  - "4 points higher than last time — more difficulties reported."
  - "The same as your previous check-in."
- Or, the first time: **"Not done yet"** — "Taking this once now gives you
  something to compare against later."
- **"By area"** card — five bars, each "N / 20", and the caption "A higher
  number means more difficulty in that area."
- Primary button: **"Start check-in"**, or **"Continue from question 14"** if a
  check-in was left part-way.
- **"Earlier check-ins"** list: date — score.

### 7.4 Profile
- **Identity card:** avatar, name, and email — or "Not signed in".
- **Signed in:** Role, Email confirmed (Yes / Not yet), Approved by admin
  (doctors only), Member since. A tinted pending notice for unapproved doctors.
- **Guest:** **"Playing without an account"** card — "Everything works and is
  saved on this phone. Sign in only if you want to share your progress with a
  doctor." → **"Sign in or create an account"**.
- **"Your results"** card, showing sync status:
  - "3 results are saved on this phone and not yet shared." → **"Share now"**
    (busy: "Sharing…")
  - "Everything on this phone has been shared." / "Saved on this phone."
  - Outcome line: "Shared 4 sessions and 1 check-ins." or "2 could not be
    sent — they stay on the phone and will retry."
- **"About"** card: app name, server, "These exercises are for practice and
  tracking. They are not a medical diagnosis." → **"Why this works"**.
- **"Sign out"** (signed-in users only).

### 7.5 Ask about your results (patient chat)
- Header with back ‹ and **"Ask about your results"**.
- **Empty state:** "Ask a question to get started. For example:" with three
  chips: "How am I doing overall?" · "What should I practise this week?" ·
  "What does my last check-in score mean?"
- **Bubbles:** "You" (right, coral tint) and "Assistant" (left, card colour).
  "Thinking…" while waiting — answers take roughly 5–15 seconds.
- Error box, e.g. "The AI is busy right now. Please try again in a minute."
  The question the user typed stays on screen when this happens.
- Input: multi-line field "Ask a question…" and a round **send** button
  (arrow-up). Dimmed when empty or while waiting.
- **Not signed in:** "Sign in to ask about your results" — "This needs an
  account, so the assistant knows whose results it is looking at." → **"Sign
  in or create an account"**.
- **How the AI behaves:** it answers only from this person's own results, in
  plain words, addressed as "you". It refuses medication, dosage and diagnosis
  questions and points to their doctor instead. For example, "Should I take
  medication for my memory?" gets "Whether you should take medication is a
  question that needs to be answered by a qualified clinician."

### 7.6 Why this works (About)
Back ‹ with **"Why this works"**, then four cards:
1. **Mild Cognitive Impairment** — what it is; an increased risk of dementia.
2. **What changes, and why:**
   - *Attention* — the frontal lobe is less efficient.
   - *Memory* — the hippocampus stores new information less well.
   - *Processing speed* — thinner myelin slows signals, "like a slower
     connection".
3. **Neuroplasticity** — the brain can form new connections; in MCI the
   cells are still alive but communicate less efficiently.
4. **Research** — five tappable paper links.

Then the disclaimer and **"Back"**. Keep it short — background reading, not a
lecture.

---

## 8. The game system (shared by all eight games)

Every game runs inside the same shell. **Design the shell once**; each game
fills the play area.

### Phases
1. **Intro**
   - Header: game title and close ✕.
   - Card **"How to play"** — three numbered lines, specific to the game.
   - Card **"Level 4"**, a one-line description of the level (e.g. "4 by 4
     grid, 5 lights to remember"), and "5 turns. Take your time — speed is not
     the point."
   - Primary **"Start"**.
   - If there is no local profile: **"Almost there"** — "Your results are saved
     against a name, so tell us who you are before playing." → **"Set up"**.
2. **Countdown** — a huge coral **3 · 2 · 1 · Go**, 0.8 s each, centred.
3. **Play** — a slim header ("Turn 2 of 5" + ✕); the game fills the rest. The
   screen stays awake.
4. **Between turns** — "Turn 2 of 5", a one-line result, **"Next turn"**.
5. **Summary**
   - **"All done"**
   - Card: Score, Accuracy %, **Level 4 → 5**
   - One encouragement line — one of exactly four:
     - "Well done — moving up a level."
     - "Nice work. Same level next time."
     - "Let's take that one a little easier next time."
     - "Great work — you're at the top level."
   - **"Done"**

### How difficulty adapts
- Every game has **15 levels** (Daily Order has 10).
- After each session, from overall accuracy:
  - **85% or more** → up one level
  - **60–84%** → stay
  - **below 60%** → down one level — **but never down twice in a row** (two
    demotions in a row feel like failing, and people quit)
- The level is remembered per game and per player. Levels only ever change
  **between** sessions, never mid-game.

### Feedback during play
- Correct: a brief green highlight + light tap.
- Mistake: a brief soft-red highlight + warning buzz. **No text scolding.**

### Stopping
✕ is always available. A half-finished session simply isn't counted — no
penalty. (Consider a gentle confirm; see §14.)

---

## 9. The eight games

For each game: what it trains, the round flow, what the player taps, the
feedback, and how it gets harder. All sprites currently use emoji plus a word
label — the word matters, because emoji look different on different Android
versions. You may replace the emoji with a consistent flat illustration set,
but keep the word labels.

### 9.1 Blink Trail — short-term memory, attention
- **Session:** 5 turns.
- **Screen:** a square grid of tiles (3 × 3 at level 1, up to 6 × 6), with a
  prompt line above and a counter below it.
- **Round flow:**
  1. **"Watch the lights"** ("5 lights") — tiles light up coral one at a time.
     The same tile never lights twice in a row.
  2. **"Get ready…"** — one second with the grid blank. This pause is the
     memory load.
  3. **"Your turn — tap them in order"** ("2 of 5") — the player taps the
     tiles in the same order.
- **Feedback:** a correct tap flashes that tile green. A mistake flashes it
  soft red and **ends the turn** — credit is kept for the taps already right.
- **Help:** **"Show me again (1 left)"** replays the sequence (levels 1–6
  only).
- **Harder:** grid 3 → 6; lights 3 → 10; each light shows for 0.8 s → 0.3 s.
  Only one of these changes per level.
- **Design notes:**
  - Idle tiles need clearly visible edges (the 3:1 rule).
  - A lit tile must differ from an idle one by more than colour — for example
    a glow or an inner shape.

### 9.2 Market Rush — short-term memory, speed, attention
- **Session:** 4 turns.
- **Round flow:**
  1. **"Remember this list"** — a card listing 3–7 grocery items as picture +
     word (🍞 Bread, 🥛 Milk, 🥚 Eggs…). It shows for 4 s (2 s at top levels),
     then disappears by itself.
  2. **"Tap only the items from your list"**, with "3 left to find" — items
     drift **downward** across a board. Every list item passes **exactly
     once**. Distractors (groceries not on the list) outnumber targets 2–3 to
     1. The round lasts 24–30 s.
- **Scoring:**
  - tapping a list item = found (it disappears)
  - tapping anything else = a false alarm
  - a list item that drifts away untapped = a miss
- **Harder:** list 3 → 7 items; viewing time 4 s → 2 s; items cross faster
  (7 s → 3 s); more distractors.
- **Items (18):** Bread, Milk, Eggs, Banana, Apple, Cheese, Rice, Tomato,
  Carrot, Fish, Tea, Honey, Orange, Potato, Onion, Butter, Grapes, Corn.
- **Design notes:** the board could become a market stall or a conveyor.
  Sprites stay at least 56 dp and labelled.

### 9.3 Speedy Current — processing speed, attention, self-control
- **Session:** 4 turns.
- **Screen:** a river board. **Fish swim UP** against the current; **leaves,
  drops, weed and shells drift DOWN** with it.
- **Prompt:** "Tap only the fish swimming up".
- **From level 6 there are sharks**: "Tap the fish swimming up — **never the
  sharks**". Sharks swim **up too**, so the player can't rely on direction —
  they have to recognise the animal. This is the self-control (inhibition)
  part.
- **Scoring:**
  - fish tapped = hit
  - debris or shark tapped = false alarm
  - fish that escape = misses
- **Harder:** fish 6 → 14 per round; debris 6 → 32; sharks 0 → 5; items cross
  in 7 s → 2.8 s; rounds 24–34 s.
- **Sprites:** 🐟 🐠 🐡 fish; 🍃 🍂 💧 🌿 🐚 debris; 🦈 shark.
- **Design notes:** show which way the water flows, and make up versus down
  unmistakable.

### 9.4 Sound Forest — listening attention, short-term memory (needs headphones)
- **Session:** 3 turns — one of each mini-game, in rotation.
- **Before the first turn — "Headphones needed":** "This game plays sounds
  from your left and right. A phone speaker cannot do that — without
  headphones every sound arrives in the middle."
  - **"Try it first"**: **◀ Left** and **Right ▶** test buttons.
  - "Turn the volume up if you hear nothing."
  - **"I can hear the difference — start"**.
- **Mini-game A — "Which side was that?"** ("2 of 5")
  - An animal sound plays from the left or right (and the middle, from
    level 5).
  - The player taps big **Left / Middle / Right** buttons.
  - 4 → 8 sounds.
- **Mini-game B — "Tap when you hear the owl"**, "Ignore every other animal"
  - A long series of animal sounds plays; about a third are the target.
  - A huge pad (the animal picture + "Tap here") fills the screen.
  - Tapping for another animal = false alarm; letting the target pass = miss.
  - 6 → 15 sounds.
- **Mini-game C — "Listen…", then "Now tap them in order"** ("1 of 4")
  - A sequence of 3–6 animal sounds plays from the middle.
  - The player taps animal tiles (picture + name) in the same order.
  - The tiles are dimmed while the sounds play. A mistake ends the turn.
- **Animals:** 🦉 Owl, 🐦 Bird, 🐸 Frog, 🦗 Cricket, 🦆 Duck — 2 in play at
  level 1, up to 5.
- **Harder:** more animals; three positions instead of two; shorter silence
  between sounds (1.3 s → 0.5 s); longer series and sequences.
- **Design notes:**
  - Show the headphones requirement on the Games card too.
  - There is nothing to *see* while a sound plays — design a calm "listening"
    visual (for example a gently pulsing ear or speaker) so the screen
    doesn't look frozen.

### 9.5 Path Finder — planning, problem solving, daily living
- **Session:** 3 turns × 2 maps each.
- **Screen:**
  - **"Find the shortest way home"**, "Map 1 of 2 · 4 steps so far".
  - A square "town" grid (4 × 4 → 8 × 8). **Grey = blocked**; 🏠 = start;
    🏁 = goal (green border). The route squares turn coral.
- **Input:**
  - tap a square **next to** the end of the route to extend it
  - tap the **last** square again to step back
  - a tap that can't join the route does nothing (warning buzz)
  - **"Start over"** clears the route
- **Scoring:** reaching the flag finishes the map. Accuracy = shortest
  possible length ÷ the length actually walked. A detour is recorded as a
  planning slip.
- **Harder:** a bigger town (4 → 8), then more blocked squares (10% → 30%),
  one change at a time.
- **Design notes:**
  - Blocked squares could be buildings or roadworks.
  - After each map, a friendly result would help, e.g. "Nice route — just 1
    step longer than the shortest."

### 9.6 Emotion Meadow — emotion recognition, social thinking
- **Session:** 4 turns × 4 questions.
- **Screen:**
  - **"Who looks worried?"**, "2 of 4".
  - A grid of 3–6 **illustrated faces** — 2 columns up to 4 faces, 3 columns
    for 5–6. Each face shows a different feeling.
- **Input:** tap one face.
- **Feedback:** the right face gets a green ring. If the player picked another
  face, that one gets a soft-red ring, so they see the right answer. After
  0.7 s the next question appears.
- **Feelings:** happy, sad, angry, surprised (levels 1–4), plus worried and
  calm from level 5.
- **Harder:** more faces (3 → 6), then **subtler expressions** (full
  intensity → half). Worried and calm are added late on purpose: they are the
  easiest to confuse with sad and happy.
- **How the faces work now** (SVG):
  - a light face circle with **dark ink features**, whatever the theme
  - the feeling is carried by **brows, eyes and mouth**:
    - angry — inner brow ends pulled down
    - sad and worried — inner ends raised
    - surprised — wide eyes, open mouth
    - sad — also a small tear
  - a soft tint supports it: happy warm yellow, sad blue, angry pink-red,
    surprised pale yellow, worried beige, calm neutral
- **Design notes:**
  - You may restyle the faces. Keep them illustrated (**no photos**), keep
    dark features on a light face, and make each feeling readable from shape
    alone — never tint alone.
  - The design must also work when expressions are dialled down to half
    strength.

### 9.7 Daily Order — long-term memory, daily living, sequencing
- **Session:** 4 turns, one everyday routine each.
- **Screen:**
  - The routine title with an emoji, e.g. **"☕ Making a cup of tea"**.
  - "Tap the steps in the order you would really do them".
  - A list of shuffled step cards, and "2 of 5 in place" at the bottom.
- **Input:** tap the step that comes next.
  - Correct: it moves up into a **numbered stack** above (1, 2, 3…, coral
    tint), so the sequence built so far is always visible.
  - Mistake: the card flashes soft red and **stays available**. The turn
    carries on — the task is familiar, so one slip shouldn't end it.
- **Distractors** from level 3: a step that doesn't belong at all ("Wash the
  car", "Put the cup in the fridge").
- **Routines (8):** making a cup of tea, taking your morning medicine, going to
  buy groceries, posting a letter, paying an electricity bill, cooking rice,
  washing clothes, going to a doctor's appointment.
- **Example (tea):**
  1. Fill the kettle with water
  2. Switch the kettle on
  3. Put a tea bag in the cup
  4. Pour the hot water into the cup
  5. Let it brew, then remove the tea bag
  6. Add milk or sugar if you like
- **Harder:** 3 → 7 steps, then 0 → 2 distractors. 10 levels.
- **Design notes:** step cards hold full sentences at 20 sp, so they need
  room to wrap to two lines.

### 9.8 Dual Task Flow — divided attention, task switching, speed
- **Session:** 3 turns.
- **Screen:**
  - A large central panel, and "5 of 16" below it.
  - Two big buttons at the bottom: **"Odd number"** and **"High sound"**.
- **Flow:** one item at a time, randomly either:
  - a **number** in huge type ("Look at the number"), or
  - a **tone** with a speaker icon ("Listen to the sound")

  The two never happen at once, and never more than three of the same kind in
  a row.
- **Input:** tap **"Odd number"** if the number is odd; tap **"High sound"** if
  the tone is the high one. Ignore even numbers and low tones.
  - Only the button for the current item is active; the other dims to 40%.
  - Tapping for a non-target = false alarm; letting a target pass = miss.
- **Feedback:** the central panel briefly tints — coral for a hit, soft red
  for a mistake.
- **Harder:** 12 → 28 items per turn; 2.6 s → 1.2 s per item; numbers from
  1–9 up to 1–99.
- **Design notes:**
  - Make "which task is live right now" unmistakable — by more than opacity
    alone.
  - Each button needs its own identity (the high-sound button has a green
    border today).

---

## 10. The check-in questionnaire

- Full screen.
- Top row: **"Question 3 of 25"** and a close ✕. A progress bar under it.
- A small caption naming the area (e.g. "Short-Term Memory").
- The question in **title size** (28 sp) — see below for the longest wording.
- **Five big answer buttons**, stacked: **Never · Rarely · Sometimes · Often ·
  Always** (scored 0–4).
- Tapping an answer **moves to the next question automatically**. Every answer
  is saved immediately, so the user can close the check-in and later
  "Continue from question 14". A skipped question is brought back before the
  score is calculated.
- Quiet **"Go back"**, and the caption: "There are no wrong answers. Your
  progress is saved as you go."

### Scoring
- 5 areas × 5 questions. Each area scores 0–20; the total is 0–100.
- **Higher = more difficulty.** Label that everywhere.

### Bands
| Score | Label | Line |
|---|---|---|
| 0–20 | No cognitive impairment | Occasional lapses only. |
| 21–40 | Mild cognitive impairment | Noticeable but manageable difficulties. |
| 41–70 | Moderate cognitive impairment | Clear functional difficulties. |
| 71–100 | Severe cognitive impairment | Significant impairment affecting independence. |

### Result screen
- **"All finished"**.
- Card: "Your score", **"39 out of 100"**, the band label, and the band line.
- **"By area"** — five bars.
- Disclaimer: *"This check-in is a way of tracking how things feel over time.
  It is not a medical diagnosis. Please talk to a doctor about any concerns."*
- **"Done"**.
- **Design note:** the band labels sound clinical, and the instrument is
  self-made. Present them gently: the score and the plain line first, the
  disclaimer always visible.

### The 25 questions (exact wording — do not change)

*Attention & Concentration*
1. I have difficulty maintaining attention on a task for several minutes.
2. I am easily distracted by sounds or activities around me.
3. I lose focus while reading or watching television.
4. I find it difficult to follow conversations, especially in a group.
5. I need information to be repeated because I miss parts of it.

*Short-Term Memory*
6. I forget what I was about to do a few moments earlier.
7. I misplace commonly used objects such as keys, phone, or glasses.
8. I forget instructions that were given to me recently.
9. I forget recent conversations or events.
10. I need reminders for things I was told earlier the same day.

*Long-Term Memory*
11. I have difficulty recalling events from my past.
12. I forget the names of people I have known for a long time.
13. I forget important dates such as birthdays or anniversaries.
14. I have difficulty remembering information learned long ago.
15. I find it difficult to clearly recall past experiences.

*Processing Speed*
16. I take longer than before to understand instructions.
17. I need more time to think before responding to questions.
18. I feel mentally slower while performing simple tasks.
19. I take longer to complete daily activities than I used to.
20. I feel that my thinking speed has reduced.

*Activities of Daily Living*
21. I have difficulty managing my personal hygiene (bathing, dressing, grooming).
22. I have difficulty managing my medications independently.
23. I have difficulty handling money or paying bills.
24. I find it difficult to prepare meals independently.
25. I need help remembering appointments or daily tasks.

---

## 11. Doctor screens

### 11.1 Patients (doctor's home tab)
- **"Your patients"** — "Signed in as Dr Meera Rao".
- Patient cards: an initial-letter avatar, name, email, chevron ›.
- **States:**
  - **Awaiting approval** — hourglass. "An administrator is reviewing your
    registration. Patients cannot be assigned to you until that is done." +
    "Check again".
  - **Error** + "Try again".
  - **Loading.**
  - **Empty** — "No patients yet" / "Patients appear here once they have
    requested you and an administrator has approved the assignment."

### 11.2 Patient detail (full screen)
Top to bottom:
1. Back ‹ and the patient's name.
2. Secondary button **"Chat about this patient"**.
3. **Summary card:** email; stat tiles for Sessions, Check-ins and Games used.
4. **Games panel** — "Performance in the exercises. Higher is better." Per
   game:
   - name and "Level 3"
   - level meter
   - sparkline of the last 10 sessions' accuracy, with the average %
   - caption: "7 sessions · 956 ms average · last 10 Aug 2026"

   Empty: "No sessions shared yet."
5. **Check-in panel** — "Self-reported difficulty. Lower is better."
   - "39 / 100", the band label, "Taken 11 Aug 2026"
   - a dumbbell row per area: previous and latest dots, the value "9 / 20",
     and "3 lower than last time"
   - legend: "Previous (11 Aug 2026)" / "Latest"

   Empty: "No check-in shared yet."
6. **Check-in history** — date — score · band, for every check-in.
7. **Remarks panel** — "Notes for the care team. Not shown to the patient."
   - **List** (newest first). Each remark shows the author and date, the
     **observations** (bullet text), and a separate tinted **"Training plan"**
     box. Empty: "No remarks yet."
   - **"Write a remark"** opens an inline composer:
     - Secondary **"Draft with AI"** (busy: "Drafting…", takes 5–15 s).
     - Once drafted: "Drafted by [model name]. Read it over — edit anything
       before saving."
     - **Observations** — a multi-line field, filled in by the draft and fully
       editable.
     - **Training plan (optional)** — a multi-line field.
     - Error banner, e.g. "This patient has not shared any results yet, so
       there is nothing to summarise."
     - **"Save remark"** (primary, needs observations) + **"Cancel"**.
8. Disclaimer: "These scores are practice and self-report data, not a
   diagnostic assessment."

**Hard rule:** the AI only *drafts*. Nothing is saved until the doctor presses
Save, and the doctor can change every word. The design should make "this is a
draft for you to check" obvious — the draft must never look final.

### 11.3 Chat about a patient
- Same chat design as §7.5.
- Header **"Chat about Asha Patel"**.
- Chips: "How is this patient doing overall?" · "Which game shows the most
  misses or false alarms?" · "What changed since the last check-in?"
- For doctors the AI uses clinical terms (misses, false alarms, inhibition).
  It still never prescribes or diagnoses.

---

## 12. Admin screen

### 12.1 Review (admin's home tab)
- **"Review"** — "Doctors and patient assignments waiting on you."
- **"Doctor applications (2)"** — a card per doctor:
  - name, "email · applied 12 Aug 2026"
  - fields: Specialty, Registration no., Bio, Email confirmed (Yes / Not yet)
  - warning caption: "Check the registration number against your medical
    council register before approving."
  - **Approve** / **Reject** — or, if the email is unconfirmed, "Cannot be
    approved until they confirm their email address." instead of the buttons.
  - Empty: "Nothing waiting. New doctor registrations appear here."
- **"Patient assignments (1)"** — a card per request:
  - patient (person icon), doctor (medkit icon), "Requested 14 Aug 2026"
  - "Approving lets this doctor read this patient's results."
  - **Approve** / **Reject**
  - Empty: "Nothing waiting. Requests appear here when a patient asks to be
    connected to a doctor."
- Quiet **"Refresh"**. An error banner at the top when an action fails.
- Keep the two queues visibly separate. They are two different decisions:
  *is this person a clinician at all*, and *may this clinician see this one
  patient*.

---

## 13. New screens to design (not built yet)

### 13.1 Connect to a doctor — needed; the backend already supports it
Right now **a patient has no way to connect to a doctor from the app**. The
server is ready for it; only the UI is missing. Put it on **Profile** as a
**"Your doctor"** card (signed-in patients only).

**What the server provides:**
- a directory of **approved doctors only** — name, specialty and a short bio
  (never their registration number)
- a "request this doctor" action
- connection statuses **Pending → Active**, or **Rejected**
- **Revoked**, when a connection is ended later

**States to design:**
1. **No doctor yet** — **"Connect to your doctor"**.
2. **Choose a doctor** — a searchable list of cards (name, specialty, bio).
3. **Confirm** — consent in plain words: *"Connecting lets Dr Meera Rao see
   your game results and check-in scores. An administrator approves every
   connection. You can disconnect at any time."*
4. **Waiting for approval** — "An administrator checks every connection."
5. **Connected** — doctor name and specialty, "Can see your results", and
   **"Disconnect"** (with a confirm).
6. **Not approved** — a gentle message + "Choose another doctor".

### 13.2 App icon and splash — needed
Both are still Expo defaults.
- Splash: background `#1F1D1E`. The Android adaptive-icon background is
  `#332F29`.
- The icon should be warm, calm and non-clinical, and readable at 48 px. No
  brain anatomy, no medical cross.

### 13.3 Optional, lower priority
- **Settings:** larger text, a sound check with a volume test, haptics on/off,
  a daily reminder time.
- **Share a progress report:** a one-page summary to show a doctor at a visit
  (PDF).

---

## 14. Problems in the current UI to fix in the redesign

1. **Coral text on the coral tint fails contrast (≈5.9:1).** This pairing is
   used for selected answers, the selected role, the Daily Order step numbers,
   "Tap here" in Sound Forest, "Odd number" in Dual Task Flow, the Training
   plan label, and the pending notice. Use light text on the tint, or a darker
   tint.
2. **Muted text on cards is ≈7.0:1** — right on the limit.
3. **Borders are ≈1.7:1**, so input fields, idle grid tiles and unselected
   answers are hard to see. They need 3:1.
4. **The between-turns line says "N of M remembered" for every game.** That
   only fits the memory games. Write game-appropriate lines, e.g. "You found 5
   of 6 fish", "Route finished", "4 of 4 faces".
5. **Level meters show "of 15" for every game**, but Daily Order stops at 10.
   Show progress against each game's own maximum.
6. **Two identities.** The local profile name (from Welcome) and the account
   name are separate, so a signed-in user can be greeted "Hello, there".
   Design one identity: don't ask for a name twice, and fall back to the
   account name.
7. **✕ quits a game instantly.** With hand tremor that's an easy accidental
   tap. Consider a gentle "Stop this game? Your progress in this game won't be
   saved." confirm.
8. **Nothing to look at while sounds play** in Sound Forest (see §9.4).
9. **Emoji sprites** vary across Android versions — a consistent illustration
   set would look more polished. Keep the word labels either way.

---

## 15. Sample data for mockups (fictional demo accounts)

**Patient: Asha Patel**
- 13 sessions, 6 check-ins, 4 games used.
- Blink Trail — level 2, 71%, 7 sessions, 956 ms average.
- Path Finder — level 3, 100%, 2 sessions.
- Market Rush — level 3, 62%, 3 sessions.
- Dual Task Flow — level 1, 41%, 1 session, 12 misses and 4 false alarms.
- Latest check-in (11 Aug 2026): **39 / 100, Mild** — Attention 9, Short-term
  memory 8, Long-term memory 7, Processing speed 8, Daily living 7.
- Previous check-in: **51 / 100, Moderate** — 12, 6, 13, 10, 10.

**Doctor:** Dr Meera Rao. Patients: Asha Patel, Vikram Shah.

**Example remark**
> *Observations* — Dual Task Flow accuracy is 41%, driven by 12 misses. Path
> Finder is at 100% over 2 sessions at level 3. Self-reported difficulty
> improved from 51 (moderate) to 39 (mild).
>
> *Training plan* — Prioritise Dual Task Flow three times this week. Continue
> Path Finder at level 3. Keep Blink Trail going to steady its results.

---

## 16. Deliverables checklist

- [ ] Design system: colours (with contrast checked on every background they
      sit on), type, spacing, and every component in §4
- [ ] Bottom tab bars for the three roles
- [ ] Auth and entry: Login, Register (patient and doctor), Forgot password +
      Check your email, Choose a new password + Password updated, Awaiting
      approval, Welcome
- [ ] Patient: Today (with data, and empty), Games, Check-in tab (first time,
      with history, resume), Profile (guest, signed in, doctor pending), Chat
      (empty, conversation, thinking, error, signed out), Why this works
- [ ] Game shell: Intro, No-profile state, Countdown, Between turns, Summary
      (all four encouragement variants)
- [ ] All 8 games mid-play, each with its correct and mistake feedback, plus
      Sound Forest's headphones check and its three mini-games
- [ ] Check-in: a question (short and longest wording), a selected answer, the
      result screen
- [ ] Doctor: Patients (all 5 states), Patient detail (full, empty, composer
      drafting, composer filled, saved remarks), Patient chat
- [ ] Admin: Review with items, and empty
- [ ] New: Connect to a doctor (all 6 states), app icon, splash
- [ ] Prototype links for the six journeys in §5

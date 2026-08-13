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

`npx tsc --noEmit` and `npx jest` in either project. 90 tests.

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
- **Colours are measured, not chosen.** Every text pair clears 7:1 (WCAG AAA)
  for age-related contrast loss; chart colours were validated and the first two
  candidate pairs failed. Re-check before changing any of them.
- **Face ink in Emotion Meadow is a fixed dark constant**, not the theme text
  colour — the face is always a light circle, so theme ink would make the
  features vanish.
- **No face photographs are bundled.** See `src/games/emotion-meadow/photos.ts`
  for why and for the licensed sets to apply to.

## Traps already paid for

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

## Accounts

Seeded admin is in `backend/.env` (gitignored). Demo doctor `doctor@demo.com`
and patient `asha.demo@demo.com` exist on the Neon database.

## Open items

1. Rotate the Neon password — it has been shared in plain text.
2. Neon holds two schemas: pre-existing Prisma tables (`"User"`, PascalCase)
   alongside these (`users`, snake_case). They coexist; it is a stopgap.
3. Not built: the deck's advanced level variants, the PDF report
   (`expo-print` installed, unused), settings, CSV export, i18n.
4. App icon and splash are still Expo defaults.

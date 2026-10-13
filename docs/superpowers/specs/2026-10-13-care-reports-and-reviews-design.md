# Doctor / admin patient detail, exports, shared remarks, reviews

Approved in chat 2026-10-13. Choices: exports are **PDF report + CSV**; a review
is seen by **that doctor + admin**; a remark is shared **per remark, by the
doctor** (private by default).

## What exists

- Doctor patient screen (`app/patient/[id].tsx`): Games / Check-in / Remarks.
  Remarks save with `visible_to_patient = false`; nothing can change it, and
  the patient app has no screen that reads remarks.
- Admin (`app/(tabs)/admin.tsx`): pending doctors and pending assignments only.
- Server stores `game_rounds` (level, hits, misses, false_alarms, accuracy,
  reaction) but no route returns rounds. No export anywhere.
- The server has no patient age or phone — `users` holds name, email, role,
  dates. Age lives only on the device (`players.age`). **Out of scope** here;
  the profile shows what the server knows.

## Server (`backend/`)

| Route | Who | Returns |
|---|---|---|
| `GET /patients/:id/rounds?gameId=&limit=` | doctor (assigned), patient (self), admin | rounds joined to their session, with `level`, `misses`, `false_alarms`, `accuracy`, date |
| `GET /patients/:id/report` | same guard as above | one JSON document: profile, assessments, per-game summary, per-level breakdown, stuck levels, remarks the caller may see |
| `GET /patients/:id/export.csv` | same | one row per round |
| `GET /admin/patients`, `GET /admin/patients/:id` | admin | directory; detail = the report + assignments + access history |
| `GET /admin/doctors`, `GET /admin/doctors/:id` | admin | directory; detail = profile, patients, status, reviews |
| `PATCH /patients/:id/remarks/:remarkId` | the author doctor | `{ visible_to_patient }` |
| `POST /assignments/:id/review` | the assignment's patient | `{ rating 1-5, comment? }`, upsert, once per assignment |
| `GET /doctors/:id/reviews` | that doctor, admin | reviews with patient name, date |

- Migration `004_reviews.sql`: `reviews(id, assignment_id UNIQUE, patient_id,
  doctor_id, rating CHECK 1..5, comment, created_at, updated_at)`.
- A review needs an assignment that is ACTIVE or REVOKED (the person has
  consulted); never PENDING or REJECTED.
- Every report/export call writes an `access_log` row with action `export`, so
  admin can see who took a patient's data out.
- Authorisation is re-read per request, as everywhere else. Read and write
  authority stay separate: an assigned doctor may export, may not create
  results.
- "Stuck" is computed in one pure function (`services/stuck.ts`), tested: a
  level is stuck when, across its rounds, accuracy < 0.6 or misses + false
  alarms exceed hits, in at least 2 rounds; or the player was demoted from it.
  Misses and false alarms stay separate in every output.

## App (`cognicare/`)

- **Doctor patient screen:** new Profile section (name, email, since, assigned
  date, last played, latest band) above the tabs. Games tab gains a
  level-by-level table per game and a "Where they get stuck" list, plain words
  ("Daily Order, level 5: missed 3 of 7 steps in 4 turns"). Remarks: a
  Share-with-patient switch on each remark. An Export button (PDF, CSV).
- **Admin:** a segmented control on the Review screen — Applications / Patients
  / Doctors. Patient detail = same Profile + Games + Check-in components the
  doctor uses (shared), plus assignments and who exported. Doctor detail =
  profile, patients, reviews, average. Export on both.
- **Patient:** "From your doctor" card on the Profile tab listing shared
  remarks; a rating card (stars + comment) under My doctor, editable.
- **Export mechanics:** CSV and PDF are generated from the one report JSON.
  Native: `expo-print` + `expo-sharing`. Web: browser download. The report
  shows the date, the patient's name, bands and per-level detail, and says it
  is a self-report tool, not a diagnosis.

## Tests

- Server: stuck-level function; review rules (status gate, one per assignment,
  patient-only); remark visibility patch (author only); each report route
  against the endpoint→guard audit table in `backend/README.md`.
- App: report → CSV/PDF content; the Share switch; the patient sees only
  shared remarks; rating submit; admin directory screens.

## Order of work

1. Server: migration, rounds + report + CSV + admin + review + remark routes,
   tests, README audit table.
2. Shared report types and builders (CSV/PDF) in the app.
3. Doctor screen. 4. Admin screens. 5. Patient remarks + rating.
Each step ends green (`tsc`, jest, backend tests) and is committed.

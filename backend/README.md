# CogniCare Backend

Node.js / Express / PostgreSQL. JWT auth, three roles, admin-approved
doctor–patient assignments as the access-control mechanism.

> **Status:** built against my own assumed contract. The frontend's real
> endpoint list has not been supplied yet, so route names and response fields
> below are provisional. See "Open questions".

## Running it

```bash
cp .env.example .env      # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate           # applies src/db/migrations/*.sql in order
npm run seed:admin        # ADMIN_EMAIL=... ADMIN_PASSWORD=... — creates admin #1
npm run dev
```

`.env` is gitignored. It holds a live database credential and this repository
is public.

## Deliverable 3 — patient-data endpoints and the guard that enforces each

`requirePatientAccess()` wraps `canAccessPatient(requesterId, requesterRole,
patientId)` in `src/middleware/canAccessPatient.ts`. It is the only path to a
single patient's data. Handlers read the id via `patientScope(req)`, which
**throws if the guard was not mounted** — so a new route that forgets it fails
loudly instead of leaking.

| Endpoint | Patient | Doctor | Admin | Enforced by |
|---|---|---|---|---|
| `GET /api/v1/patients` | own record only | active assignments only | all | query layer — doctor's list is built **from** `assignments`, not filtered afterwards |
| `GET /api/v1/patients/:patientId` | self | active assignment | yes | `requirePatientAccess()` |
| `GET /api/v1/patients/:patientId/assessments` | self | active assignment | yes | `requirePatientAccess()` |
| `GET /api/v1/patients/:patientId/sessions` | self | active assignment | yes | `requirePatientAccess()` |
| `GET /api/v1/assignments` | own | own | 403 → use admin route | role branch in handler |
| `GET /api/v1/admin/access-log` | ✗ | ✗ | yes | `requireRole('ADMIN')` |
| `GET /api/v1/admin/users` | ✗ | ✗ | yes | `requireRole('ADMIN')` |
| `GET /api/v1/doctors` | yes | yes | yes | no patient data; approved doctors only |

Non-patient-data routes and their guards:

| Endpoint | Guard |
|---|---|
| `POST /api/v1/auth/register` | rate limited; rejects `role: ADMIN` |
| `POST /api/v1/auth/login` | rate limited (IP + email) |
| `POST /api/v1/auth/forgot-password` | rate limited; identical response regardless of whether the account exists |
| `POST /api/v1/assignments` | `requireRole('PATIENT')` |
| `POST /api/v1/assignments/:id/approve` | `requireRole('ADMIN')` |
| `POST /api/v1/assignments/:id/revoke` | own patient **or** admin |
| `POST /api/v1/admin/doctors/:id/approve` | `requireRole('ADMIN')` |

Every decision, allowed or denied, is written to `access_log`.

## Decisions I made where the brief left a gap

**`isVerified` was one flag doing two jobs.** For a patient it meant "email
confirmed"; for a doctor it meant "an admin vouched for them". The database
now keeps `email_verified_at` and `approved_at` as separate columns, and
`isVerified` is computed for the API response. One flag would eventually let
a doctor approve themselves by clicking a link in their own inbox.

**Approving a doctor does not activate their pending assignments.** Those are
two different admin decisions: one is about credentials, the other about a
specific patient relationship. Conflating them is the sneaky path by which a
doctor gains access to a named patient without anyone approving *that*.

**Authorisation never trusts the JWT.** `authenticate` re-loads the user, and
the assignment guard re-queries on every request. Otherwise revoking a doctor
would leave them up to 15 minutes of live access to records.

**Patients revoke without admin approval.** Granting access needs an admin;
withdrawing consent does not. The alternative is a patient who cannot stop a
doctor reading their records.

**Only approved doctors appear in the directory.** An unapproved account must
not be able to collect patient requests, or to be mistaken for a real
clinician. Impersonation does damage without reading a single row.

**Doctors cannot initiate an assignment.** Doing so requires naming a patient,
which itself discloses that the named person is a patient here.

### Admin bootstrap

`/register` rejects `role: ADMIN` outright, so **no request body can ever mint
an admin**. Admin #1 comes from `npm run seed:admin`, run by whoever already
holds database and environment access; the script refuses if an admin exists.
Further admins are created by an existing admin via `POST /api/v1/admin/users`.

| Alternative | Why not |
|---|---|
| First-admin-bootstrap | Whoever hits it first wins. Deploy publicly before registering and a stranger owns the system. Also racy. |
| Invite code in env | Leaks like any shared secret, rotation needs a redeploy, and one code for every admin means no attribution. |

If you want self-service admin signup later, use single-use codes in a table
with an expiry and `created_by`, so each is attributable and burns on use.

## What the database enforces on its own

Verified against a real PostgreSQL instance — 13/13 rejected or allowed as
intended, with no application code in the loop:

- an `ACTIVE` assignment cannot exist without `approved_by` (CHECK)
- the approver of a doctor or an assignment **must** be an ADMIN (trigger)
- an assignment cannot go `ACTIVE` while the doctor is unapproved (trigger)
- `role` is immutable after creation (trigger) — no privilege escalation even
  if a handler passes `req.body` into an UPDATE
- only a DOCTOR can be a `doctor_id`, only a PATIENT a `patient_id` (trigger)
- one open assignment per doctor/patient pair (partial unique index)
- `approved_at` on a non-doctor is rejected (CHECK)
- licence numbers and emails are unique, case-insensitively

## Error envelope

```json
{ "error": { "code": "DOCTOR_PENDING_APPROVAL", "message": "…" } }
```

`code` is the stable contract. `DOCTOR_PENDING_APPROVAL` is deliberately
distinct from `FORBIDDEN`: it resolves by waiting, not by the user doing
anything differently, and the app should say so.

## Open questions

1. **The frontend's real endpoint list.** Everything here is my naming.
2. **Route prefix** — currently `/api/v1/...`.
3. **Token transport** — currently response body (React Native + SecureStore).
4. **Case convention** — camelCase JSON over snake_case Postgres.
5. **Email delivery** — verification and reset tokens are logged to the console;
   no mail provider is wired up.
6. `002_clinical_data.sql` is a guess at the clinical tables. Replace it with a
   `003` once the real shapes are known — never by editing a shipped migration.

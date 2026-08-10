-- 001_init.sql — users, doctor profiles, assignments, tokens, audit log.
--
-- The access-control guarantees live HERE, not only in application code.
-- Constraints and triggers below make the dangerous states unrepresentable,
-- so a future route that forgets a guard still cannot produce them.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');
CREATE TYPE assignment_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');
CREATE TYPE token_purpose AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

/* ---------------------------------- users --------------------------------- */

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  email             CITEXT      NOT NULL UNIQUE,
  password_hash     TEXT        NOT NULL,
  role              user_role   NOT NULL,

  -- Deliberately TWO columns, not one `is_verified`.
  -- email_verified_at means "this address is real".
  -- approved_at means "an admin vouched for this doctor's credentials".
  -- Collapsing them into one flag is how a doctor ends up approved merely by
  -- clicking a link in their own inbox.
  email_verified_at TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES users (id) ON DELETE SET NULL,

  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Approval is a doctor-only concept, and it never exists anonymously.
  CONSTRAINT users_approval_is_doctor_only
    CHECK (approved_at IS NULL OR role = 'DOCTOR'),
  CONSTRAINT users_approval_has_an_approver
    CHECK ((approved_at IS NULL) = (approved_by IS NULL))
);

CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_pending_doctors_idx
  ON users (created_at)
  WHERE role = 'DOCTOR' AND approved_at IS NULL;

/* ----------------------------- doctor profiles ---------------------------- */

CREATE TABLE doctor_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  specialty      TEXT NOT NULL CHECK (length(btrim(specialty)) > 0),
  license_number TEXT NOT NULL CHECK (length(btrim(license_number)) > 0),
  bio            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-reported at signup and unverified until an admin looks at it, but two
-- accounts must never claim the same licence.
CREATE UNIQUE INDEX doctor_profiles_license_key
  ON doctor_profiles (lower(btrim(license_number)));

/* -------------------------------- assignments ------------------------------ */

CREATE TABLE assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status        assignment_status NOT NULL DEFAULT 'PENDING',

  requested_by  UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  revoked_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  revoked_at    TIMESTAMPTZ,
  revoke_reason TEXT,

  CONSTRAINT assignments_distinct_parties CHECK (doctor_id <> patient_id),

  -- The core guarantee: an ACTIVE assignment cannot exist without a recorded
  -- approver. No application bug can grant a doctor access on its own.
  CONSTRAINT assignments_active_requires_approver
    CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),

  CONSTRAINT assignments_revoked_is_stamped
    CHECK (status <> 'REVOKED' OR revoked_at IS NOT NULL)
);

-- At most one live relationship per doctor/patient pair. History is kept as
-- REJECTED/REVOKED rows, which stay readable for audit.
CREATE UNIQUE INDEX assignments_one_open_per_pair
  ON assignments (doctor_id, patient_id)
  WHERE status IN ('PENDING', 'ACTIVE');

CREATE INDEX assignments_doctor_active_idx ON assignments (doctor_id) WHERE status = 'ACTIVE';
CREATE INDEX assignments_patient_idx       ON assignments (patient_id);
CREATE INDEX assignments_pending_idx       ON assignments (requested_at) WHERE status = 'PENDING';

/* ------------------------------ refresh tokens ---------------------------- */

CREATE TABLE refresh_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Only the hash is stored; a database leak must not yield usable tokens.
  token_hash     TEXT NOT NULL UNIQUE,
  -- All tokens rotated from one login share a family. Replaying a spent token
  -- is a theft signal, and the whole family is revoked in response.
  family_id      UUID NOT NULL,
  parent_id      UUID REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  user_agent     TEXT,
  ip             INET,
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx   ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

/* ----------------------------- one-time tokens ---------------------------- */

CREATE TABLE one_time_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    token_purpose NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX one_time_tokens_user_purpose_idx ON one_time_tokens (user_id, purpose);

/* -------------------------------- access log ------------------------------ */

-- Every decision about patient data, allowed or denied. This is the only way
-- to answer "did anyone read this record after access was revoked?".
CREATE TABLE access_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  actor_role    user_role,
  patient_id    UUID REFERENCES users (id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES assignments (id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  method        TEXT,
  route         TEXT,
  allowed       BOOLEAN NOT NULL,
  reason        TEXT,
  ip            INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX access_log_patient_idx ON access_log (patient_id, created_at DESC);
CREATE INDEX access_log_actor_idx   ON access_log (actor_id, created_at DESC);
CREATE INDEX access_log_denied_idx  ON access_log (created_at DESC) WHERE allowed = FALSE;

/* --------------------------------- triggers -------------------------------- */

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER doctor_profiles_touch BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Role is immutable. Privilege escalation should be impossible even if some
-- future handler passes req.body straight into an UPDATE.
CREATE OR REPLACE FUNCTION forbid_role_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'role is immutable (user %, % -> %)', OLD.id, OLD.role, NEW.role
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_role_immutable BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION forbid_role_change();

-- Only an ADMIN may appear as the approver of a doctor or an assignment.
-- A foreign key cannot express "and that user's role must be ADMIN".
CREATE OR REPLACE FUNCTION assert_approver_is_admin() RETURNS TRIGGER AS $$
DECLARE
  approver_role user_role;
BEGIN
  IF NEW.approved_by IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT role INTO approver_role FROM users WHERE id = NEW.approved_by;
  IF approver_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'approver % is not an ADMIN', NEW.approved_by
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_approver_is_admin BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION assert_approver_is_admin();
CREATE TRIGGER assignments_approver_is_admin BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION assert_approver_is_admin();

-- An assignment is only meaningful between a DOCTOR and a PATIENT.
CREATE OR REPLACE FUNCTION assert_assignment_parties() RETURNS TRIGGER AS $$
DECLARE
  d user_role;
  p user_role;
BEGIN
  SELECT role INTO d FROM users WHERE id = NEW.doctor_id;
  SELECT role INTO p FROM users WHERE id = NEW.patient_id;
  IF d IS DISTINCT FROM 'DOCTOR' THEN
    RAISE EXCEPTION 'doctor_id % is not a DOCTOR', NEW.doctor_id USING ERRCODE = 'check_violation';
  END IF;
  IF p IS DISTINCT FROM 'PATIENT' THEN
    RAISE EXCEPTION 'patient_id % is not a PATIENT', NEW.patient_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_parties BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION assert_assignment_parties();

-- An assignment may only go ACTIVE if the doctor is themselves approved.
-- Verification and assignment are separate admin decisions; this stops a
-- pending assignment springing to life the moment a doctor is approved.
CREATE OR REPLACE FUNCTION assert_doctor_approved_on_activate() RETURNS TRIGGER AS $$
DECLARE
  approved TIMESTAMPTZ;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN
    RETURN NEW;
  END IF;
  SELECT approved_at INTO approved FROM users WHERE id = NEW.doctor_id;
  IF approved IS NULL THEN
    RAISE EXCEPTION 'doctor % is not approved; assignment cannot be ACTIVE', NEW.doctor_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_doctor_approved BEFORE INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION assert_doctor_approved_on_activate();

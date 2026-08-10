-- 002_clinical_data.sql
--
-- PROVISIONAL. These tables mirror the mobile app's local SQLite schema so the
-- patient-data endpoints have something real to read. Column names are my
-- best guess at the contract; replace this migration (with a 003, never by
-- editing this file) once the frontend's actual payload shapes are known.
--
-- The access-control model does not depend on these shapes. Whatever the
-- clinical tables end up looking like, they are reached only through
-- requirePatientAccess.

CREATE TABLE assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  band        TEXT    NOT NULL CHECK (band IN ('normal', 'mild', 'moderate', 'severe')),
  attention   INTEGER NOT NULL CHECK (attention BETWEEN 0 AND 20),
  stm         INTEGER NOT NULL CHECK (stm       BETWEEN 0 AND 20),
  ltm         INTEGER NOT NULL CHECK (ltm       BETWEEN 0 AND 20),
  speed       INTEGER NOT NULL CHECK (speed     BETWEEN 0 AND 20),
  adl         INTEGER NOT NULL CHECK (adl       BETWEEN 0 AND 20),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assessments_patient_idx ON assessments (patient_id, taken_at DESC);

CREATE TABLE assessment_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
  item_no       INTEGER NOT NULL CHECK (item_no BETWEEN 1 AND 25),
  domain        TEXT    NOT NULL,
  value         INTEGER NOT NULL CHECK (value BETWEEN 0 AND 4),
  UNIQUE (assessment_id, item_no)
);

CREATE TABLE game_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id         TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  level_start     INTEGER NOT NULL,
  level_end       INTEGER,
  accuracy        REAL,
  score           INTEGER,
  avg_reaction_ms INTEGER
);

CREATE INDEX game_sessions_patient_idx ON game_sessions (patient_id, started_at DESC);

CREATE TABLE game_rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  round_no        INTEGER NOT NULL,
  level           INTEGER NOT NULL,
  hits            INTEGER NOT NULL DEFAULT 0,
  -- misses and false_alarms stay separate, as they do on the device: the
  -- difference is what distinguishes an attention lapse from an inhibition
  -- failure, and merging them destroys that signal permanently.
  misses          INTEGER NOT NULL DEFAULT 0,
  false_alarms    INTEGER NOT NULL DEFAULT 0,
  accuracy        REAL    NOT NULL DEFAULT 0,
  avg_reaction_ms INTEGER,
  UNIQUE (session_id, round_no)
);

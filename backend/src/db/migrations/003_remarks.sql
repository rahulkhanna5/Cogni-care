/*
 * Clinical remarks: an AI-drafted note that a doctor edits and saves.
 *
 * The draft and the saved text are separate columns on purpose. Keeping the
 * model's original wording next to what the doctor actually signed off makes
 * it answerable later whether a phrase in the record came from the clinician
 * or from the model — which is the whole reason the review step exists.
 */

CREATE TABLE remarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- The doctor who saved it. Never the model: a remark has a human author or
  -- it does not exist.
  author_id    UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,

  -- What the model returned, verbatim, before any editing.
  ai_draft     TEXT,
  -- The model that produced ai_draft, so an odd note can be traced to a
  -- specific model version rather than to "the AI".
  ai_model     TEXT,

  -- What the doctor actually saved. This is the clinical content.
  body         TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  -- Suggested training plan, kept apart from the observations so the UI can
  -- present them differently and neither gets buried in the other.
  plan         TEXT,

  -- Doctor-only for now. A column rather than a hard-coded rule, so opening
  -- remarks up to patients later is a data change, not a code change.
  visible_to_patient BOOLEAN NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX remarks_patient_created_idx ON remarks (patient_id, created_at DESC);

/*
 * Only a doctor or an admin may author a remark. A patient writing into their
 * own clinical record would defeat the point of the record.
 *
 * Enforced here as well as in the route because the route is one line of
 * TypeScript away from being wrong, and this is not.
 */
CREATE OR REPLACE FUNCTION remarks_author_must_be_clinician()
RETURNS TRIGGER AS $$
DECLARE
  author_role user_role;
BEGIN
  SELECT role INTO author_role FROM users WHERE id = NEW.author_id;
  IF author_role NOT IN ('DOCTOR', 'ADMIN') THEN
    RAISE EXCEPTION 'remarks.author_id must be a DOCTOR or ADMIN, got %', author_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER remarks_author_check
  BEFORE INSERT OR UPDATE OF author_id ON remarks
  FOR EACH ROW EXECUTE FUNCTION remarks_author_must_be_clinician();

/* The subject of a remark is always a patient. */
CREATE OR REPLACE FUNCTION remarks_subject_must_be_patient()
RETURNS TRIGGER AS $$
DECLARE
  subject_role user_role;
BEGIN
  SELECT role INTO subject_role FROM users WHERE id = NEW.patient_id;
  IF subject_role <> 'PATIENT' THEN
    RAISE EXCEPTION 'remarks.patient_id must be a PATIENT, got %', subject_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER remarks_subject_check
  BEFORE INSERT OR UPDATE OF patient_id ON remarks
  FOR EACH ROW EXECUTE FUNCTION remarks_subject_must_be_patient();

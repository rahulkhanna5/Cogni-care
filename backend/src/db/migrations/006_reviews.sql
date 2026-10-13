/*
 * A patient's rating of a doctor they were connected to. One per connection
 * (editable), so a review always belongs to a real relationship. Seen by that
 * doctor and by admins, never by other patients.
 */
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES assignments (id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  doctor_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT CHECK (comment IS NULL OR length(comment) <= 1000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_doctor_idx ON reviews (doctor_id, created_at DESC);

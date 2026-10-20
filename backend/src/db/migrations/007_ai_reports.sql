/*
 * An AI chat reply someone flagged as wrong or harmful. Google Play requires an
 * in-app way to report AI-generated content to the developer; this is where
 * those reports land. The reply is copied, not referenced: chats are not stored.
 */
CREATE TABLE ai_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users (id) ON DELETE SET NULL,
  patient_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question    TEXT CHECK (question IS NULL OR length(question) <= 2000),
  reply       TEXT NOT NULL CHECK (length(reply) <= 8000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_reports_created_idx ON ai_reports (created_at DESC);

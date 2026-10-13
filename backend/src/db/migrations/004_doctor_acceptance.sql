/*
 * The doctor's own yes/no.
 *
 * Until now an admin's approval was the last step: the patient simply showed
 * up in the doctor's list. A doctor should be asked. The relationship is open
 * to the doctor only when BOTH have said yes:
 *
 *   patient asks -> admin approves (status ACTIVE) -> doctor accepts
 *
 * A decline is an ordinary REJECTED row, so every existing guard already
 * treats it as closed. `doctor_accepted_at` is a column, not a new status, so
 * the "ACTIVE needs an approver" guarantee and the one-open-per-pair index stay
 * exactly as they were.
 */
ALTER TABLE assignments ADD COLUMN doctor_accepted_at TIMESTAMPTZ;

-- Relationships that were already running were agreed to by everyone in the
-- only way available then. Do not lock any doctor out of a current patient.
UPDATE assignments SET doctor_accepted_at = approved_at WHERE status = 'ACTIVE';

CREATE INDEX assignments_awaiting_doctor_idx
  ON assignments (doctor_id)
  WHERE status = 'ACTIVE' AND doctor_accepted_at IS NULL;

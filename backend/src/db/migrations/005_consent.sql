/*
 * Which terms and privacy text a person agreed to, and when. Recorded at
 * registration from the version the app showed (LEGAL_VERSION in the app).
 * Nullable: accounts made before this existed, or by an admin, have none.
 */
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN terms_version TEXT;

import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';

import { pool, query, queryOne, withTransaction } from '../src/db/pool.js';
import { hashPassword } from '../src/lib/password.js';

/**
 * Two reviewer accounts for the Google Play "Sign in details" form: a patient
 * and a specialist, already connected, with a little data so no screen is empty.
 *
 *   npm run seed:demo
 *
 * Needs an ADMIN to exist (it records as the approver). Passwords are random,
 * written to backend/.env as comments (gitignored) and never printed. Refuses to
 * run if either address already exists, so it is safe to run once.
 */
const PATIENT = { email: 'reviewer.patient@demo.com', name: 'Rhea Sharma' };
const SPECIALIST = { email: 'reviewer.specialist@demo.com', name: 'Dr Arjun Mehta' };
const TERMS_VERSION = '2026-10-20';

const password = () => randomBytes(12).toString('base64url');

async function main() {
  const taken = await queryOne<{ n: string }>(
    'SELECT count(*)::text AS n FROM users WHERE email = ANY($1)',
    [[PATIENT.email, SPECIALIST.email]]
  );
  if (Number(taken?.n ?? 0) > 0) {
    console.error('A reviewer account already exists. Nothing changed.');
    process.exit(1);
  }
  const admin = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1`
  );
  if (!admin) {
    console.error('Create an admin first (npm run seed:admin).');
    process.exit(1);
  }

  const pw = { patient: password(), specialist: password() };

  await withTransaction(async (client) => {
    const p = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, 'PATIENT', now(), now(), $4) RETURNING id`,
      [PATIENT.name, PATIENT.email, await hashPassword(pw.patient), TERMS_VERSION],
      client
    );
    const d = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at, approved_at, approved_by,
                          terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, 'DOCTOR', now(), now(), $5, now(), $4) RETURNING id`,
      [SPECIALIST.name, SPECIALIST.email, await hashPassword(pw.specialist), TERMS_VERSION, admin.id],
      client
    );
    const patientId = p[0]!.id;
    const specialistId = d[0]!.id;

    await query(
      `INSERT INTO doctor_profiles (user_id, specialty, license_number, bio)
       VALUES ($1, 'Memory and attention', 'REVIEW-DEMO-0001', 'Demo specialist account for app review.')`,
      [specialistId],
      client
    );
    await query(
      `INSERT INTO assignments (doctor_id, patient_id, status, requested_by, approved_by, approved_at, doctor_accepted_at)
       VALUES ($1, $2, 'ACTIVE', $2, $3, now(), now())`,
      [specialistId, patientId, admin.id],
      client
    );

    // One check-in and three sessions across the last two weeks.
    await query(
      `INSERT INTO assessments (patient_id, taken_at, total_score, band, attention, stm, ltm, speed, adl)
       VALUES ($1, now() - interval '3 days', 26, 'mild', 6, 6, 5, 5, 4)`,
      [patientId],
      client
    );
    const games = [
      ['blink-trail', 11, 1, 2, 0.78, 3200, 78],
      ['market-rush', 6, 1, 1, 0.82, 2400, 82],
      ['daily-order', 2, 2, 3, 0.9, null, 90],
    ] as const;
    for (const [i, g] of games.entries()) {
      const s = await query<{ id: string }>(
        `INSERT INTO game_sessions (patient_id, game_id, started_at, ended_at, level_start, level_end, accuracy, score, avg_reaction_ms)
         VALUES ($1, $2, now() - ($3 || ' days')::interval, now() - ($3 || ' days')::interval + interval '4 minutes',
                 $4, $5, $6, $7, $8) RETURNING id`,
        [patientId, g[0], String(g[1]), g[2], g[3], g[4], g[6], g[5]],
        client
      );
      await query(
        `INSERT INTO game_rounds (session_id, round_no, level, hits, misses, false_alarms, accuracy, avg_reaction_ms)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7), ($1, 2, $2, $8, $9, $10, $6, $7)`,
        [s[0]!.id, g[2], 4 + i, 1, 0, g[4], g[5], 3 + i, 0, 1],
        client
      );
    }
  });

  appendFileSync(
    new URL('../.env', import.meta.url),
    `\n# Google Play reviewer accounts (created ${new Date().toISOString().slice(0, 10)}):\n` +
      `# Patient: ${PATIENT.email} / ${pw.patient}\n# Specialist: ${SPECIALIST.email} / ${pw.specialist}\n`
  );
  console.log(`Created ${PATIENT.email} and ${SPECIALIST.email}. Passwords are in backend/.env (comments).`);
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

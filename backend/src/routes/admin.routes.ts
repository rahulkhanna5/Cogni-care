import { Router } from 'express';

import { config } from '../config.js';
import { query, queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { approveDoctorSchema, paginationSchema, registerSchema } from '../lib/schemas.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { hashPassword } from '../lib/password.js';
import { logAccess } from '../services/audit.service.js';
import { toPublicUser, type UserRow } from '../types.js';

export const adminRoutes = Router();
adminRoutes.use(authenticate, requireVerifiedEmail, requireRole('ADMIN'));

/* ---------------------------- doctor verification -------------------------- */

adminRoutes.get('/doctors/pending', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.created_at,
              -- With verification switched off an address needs no confirming,
              -- so it is never shown as the thing holding an approval up.
              CASE WHEN $3::boolean THEN u.email_verified_at
                   ELSE COALESCE(u.email_verified_at, u.created_at) END AS email_verified_at,
              p.specialty, p.license_number, p.bio
         FROM users u
         JOIN doctor_profiles p ON p.user_id = u.id
        WHERE u.role = 'DOCTOR' AND u.approved_at IS NULL AND u.is_active
        ORDER BY u.created_at
        LIMIT $1 OFFSET $2`,
      [limit, offset, config.requireEmailVerification]
    );
    res.json({ doctors: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * The only way approved_at is ever written. Approving a doctor is a statement
 * about their credentials — it does NOT activate any pending assignment. Each
 * patient relationship still needs its own admin decision.
 */
adminRoutes.post('/doctors/:id/approve', async (req, res, next) => {
  try {
    approveDoctorSchema.parse(req.body ?? {});
    const { id } = req.params;

    const doctor = await queryOne<UserRow>(
      `SELECT * FROM users WHERE id = $1 AND role = 'DOCTOR'`,
      [id]
    );
    if (!doctor) throw Errors.notFound('Doctor');
    if (config.requireEmailVerification && !doctor.email_verified_at) {
      throw Errors.conflict(
        'EMAIL_NOT_VERIFIED',
        'This doctor has not confirmed their email address yet.'
      );
    }
    if (doctor.approved_at) {
      throw Errors.conflict('ALREADY_APPROVED', 'This doctor is already approved.');
    }

    const updated = await queryOne<UserRow>(
      `UPDATE users SET approved_at = now(), approved_by = $2,
              email_verified_at = COALESCE(email_verified_at, now())
        WHERE id = $1 RETURNING *`,
      [id, req.user!.id]
    );

    await logAccess({
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      patientId: null,
      assignmentId: null,
      action: 'APPROVE_DOCTOR',
      allowed: true,
      reason: `doctor=${id}`,
      ip: req.ip ?? null,
    });

    res.json({ user: toPublicUser(updated!) });
  } catch (error) {
    next(error);
  }
});

/** Withdraws approval. Because every guard re-reads the database, this takes
 *  effect on the doctor's very next request — not when their token expires. */
adminRoutes.post('/doctors/:id/revoke-approval', async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await queryOne<UserRow>(
      `UPDATE users SET approved_at = NULL, approved_by = NULL
        WHERE id = $1 AND role = 'DOCTOR' RETURNING *`,
      [id]
    );
    if (!updated) throw Errors.notFound('Doctor');

    // Their existing assignments must not survive the loss of approval.
    await query(
      `UPDATE assignments
          SET status = 'REVOKED', revoked_at = now(), revoked_by = $2,
              revoke_reason = 'DOCTOR_APPROVAL_REVOKED'
        WHERE doctor_id = $1 AND status IN ('PENDING','ACTIVE')`,
      [id, req.user!.id]
    );

    await logAccess({
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      patientId: null,
      assignmentId: null,
      action: 'REVOKE_DOCTOR_APPROVAL',
      allowed: true,
      reason: `doctor=${id}`,
      ip: req.ip ?? null,
    });

    res.json({ user: toPublicUser(updated) });
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- users ----------------------------------- */

adminRoutes.get('/users', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const rows = await query<UserRow>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ users: rows.map(toPublicUser) });
  } catch (error) {
    next(error);
  }
});

/** The only route that can mint an ADMIN — and it requires an existing one. */
adminRoutes.post('/users', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      input.email,
    ]);
    if (existing) throw Errors.conflict('EMAIL_IN_USE', 'That email is already registered.');

    const created = await queryOne<UserRow>(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING *`,
      [input.name.trim(), input.email, await hashPassword(input.password), input.role]
    );

    res.status(201).json({ user: toPublicUser(created!) });
  } catch (error) {
    next(error);
  }
});

adminRoutes.post('/users/:id/disable', async (req, res, next) => {
  try {
    const updated = await queryOne<UserRow>(
      'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!updated) throw Errors.notFound('User');
    await query(
      `UPDATE refresh_tokens SET revoked_at = now(), revoked_reason = 'ACCOUNT_DISABLED'
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.params.id]
    );
    res.json({ user: toPublicUser(updated) });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- assignments ------------------------------- */

adminRoutes.get('/assignments', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status : null;

    const rows = await query(
      `SELECT a.*, d.name AS doctor_name, p.name AS patient_name
         FROM assignments a
         JOIN users d ON d.id = a.doctor_id
         JOIN users p ON p.id = a.patient_id
        WHERE ($1::text IS NULL OR a.status::text = $1)
        ORDER BY a.requested_at DESC
        LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    res.json({ assignments: rows });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- audit log -------------------------------- */

adminRoutes.get('/access-log', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : null;

    const rows = await query(
      `SELECT * FROM access_log
        WHERE ($1::uuid IS NULL OR patient_id = $1::uuid)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );
    res.json({ entries: rows });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- directories ------------------------------- */

/**
 * Every patient with who they are connected to and how they are doing, in one
 * query, for the admin's Patients list. Activity comes from the uploaded
 * sessions and check-ins; nothing here is computed on the device.
 */
adminRoutes.get('/patients', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.created_at, u.is_active,
              (SELECT COUNT(*)::int FROM game_sessions s WHERE s.patient_id = u.id AND s.ended_at IS NOT NULL) AS sessions,
              (SELECT MAX(s.started_at) FROM game_sessions s WHERE s.patient_id = u.id) AS last_played_at,
              (SELECT AVG(s.accuracy)::float FROM game_sessions s
                 WHERE s.patient_id = u.id AND s.started_at > now() - interval '30 days') AS accuracy_30d,
              la.band AS latest_band, la.total_score AS latest_score, la.taken_at AS latest_check_in,
              COALESCE(
                (SELECT json_agg(json_build_object(
                          'assignment_id', a.id, 'doctor_id', d.id, 'doctor_name', d.name,
                          'status', a.status, 'doctor_accepted_at', a.doctor_accepted_at)
                        ORDER BY a.requested_at DESC)
                   FROM assignments a JOIN users d ON d.id = a.doctor_id
                  WHERE a.patient_id = u.id AND a.status IN ('PENDING','ACTIVE')),
                '[]') AS doctors
         FROM users u
         LEFT JOIN LATERAL (
           SELECT band, total_score, taken_at FROM assessments
            WHERE patient_id = u.id ORDER BY taken_at DESC LIMIT 1
         ) la ON TRUE
        WHERE u.role = 'PATIENT'
        ORDER BY u.name`
    );
    await logAccess({
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      patientId: null,
      assignmentId: null,
      action: 'ADMIN_LIST_PATIENTS',
      allowed: true,
      reason: 'ADMIN_OVERRIDE',
      ip: req.ip ?? null,
    });
    res.json({ patients: rows });
  } catch (error) {
    next(error);
  }
});

/** Every doctor, approved or not, with how many patients they have. */
adminRoutes.get('/doctors', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.created_at, u.approved_at, u.is_active,
              p.specialty, p.license_number,
              (SELECT COUNT(*)::int FROM assignments a
                WHERE a.doctor_id = u.id AND a.status = 'ACTIVE' AND a.doctor_accepted_at IS NOT NULL) AS patients,
              (SELECT COUNT(*)::int FROM assignments a
                WHERE a.doctor_id = u.id AND a.status IN ('PENDING','ACTIVE')
                  AND NOT (a.status = 'ACTIVE' AND a.doctor_accepted_at IS NOT NULL)) AS waiting,
              (SELECT AVG(rating)::float FROM reviews r WHERE r.doctor_id = u.id) AS rating,
              (SELECT COUNT(*)::int FROM reviews r WHERE r.doctor_id = u.id) AS reviews
         FROM users u
         LEFT JOIN doctor_profiles p ON p.user_id = u.id
        WHERE u.role = 'DOCTOR'
        ORDER BY u.approved_at IS NULL, u.name`
    );
    res.json({ doctors: rows });
  } catch (error) {
    next(error);
  }
});

/** One doctor: profile, and every patient they are or were connected to. */
adminRoutes.get('/doctors/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await queryOne(
      `SELECT u.id, u.name, u.email, u.created_at, u.approved_at, u.is_active,
              p.specialty, p.license_number, p.bio
         FROM users u LEFT JOIN doctor_profiles p ON p.user_id = u.id
        WHERE u.id = $1 AND u.role = 'DOCTOR'`,
      [id]
    );
    if (!doctor) throw Errors.notFound('Doctor');

    const patients = await query(
      `SELECT a.id AS assignment_id, a.status, a.requested_at, a.approved_at, a.doctor_accepted_at,
              a.revoked_at, a.revoke_reason,
              u.id AS patient_id, u.name AS patient_name, u.email AS patient_email,
              (SELECT COUNT(*)::int FROM game_sessions s WHERE s.patient_id = u.id AND s.ended_at IS NOT NULL) AS sessions,
              (SELECT MAX(s.started_at) FROM game_sessions s WHERE s.patient_id = u.id) AS last_played_at,
              (SELECT AVG(s.accuracy)::float FROM game_sessions s
                 WHERE s.patient_id = u.id AND s.started_at > now() - interval '30 days') AS accuracy_30d,
              (SELECT band FROM assessments x WHERE x.patient_id = u.id ORDER BY taken_at DESC LIMIT 1) AS latest_band,
              (SELECT total_score FROM assessments x WHERE x.patient_id = u.id ORDER BY taken_at DESC LIMIT 1) AS latest_score,
              (SELECT COUNT(*)::int FROM remarks r WHERE r.patient_id = u.id AND r.author_id = a.doctor_id) AS remarks
         FROM assignments a JOIN users u ON u.id = a.patient_id
        WHERE a.doctor_id = $1
        ORDER BY a.requested_at DESC`,
      [id]
    );
    const reviews = await query(
      `SELECT r.rating, r.comment, r.updated_at, u.name AS patient_name
         FROM reviews r JOIN users u ON u.id = r.patient_id
        WHERE r.doctor_id = $1 ORDER BY r.updated_at DESC`,
      [id]
    );
    res.json({ doctor, patients, reviews });
  } catch (error) {
    next(error);
  }
});

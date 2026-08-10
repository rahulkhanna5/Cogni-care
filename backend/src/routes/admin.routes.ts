import { Router } from 'express';

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
      `SELECT u.id, u.name, u.email, u.created_at, u.email_verified_at,
              p.specialty, p.license_number, p.bio
         FROM users u
         JOIN doctor_profiles p ON p.user_id = u.id
        WHERE u.role = 'DOCTOR' AND u.approved_at IS NULL AND u.is_active
        ORDER BY u.created_at
        LIMIT $1 OFFSET $2`,
      [limit, offset]
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
    if (!doctor.email_verified_at) {
      throw Errors.conflict(
        'EMAIL_NOT_VERIFIED',
        'This doctor has not confirmed their email address yet.'
      );
    }
    if (doctor.approved_at) {
      throw Errors.conflict('ALREADY_APPROVED', 'This doctor is already approved.');
    }

    const updated = await queryOne<UserRow>(
      `UPDATE users SET approved_at = now(), approved_by = $2 WHERE id = $1 RETURNING *`,
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

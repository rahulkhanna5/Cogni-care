import { Router } from 'express';

import { query, queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import {
  rejectAssignmentSchema,
  requestAssignmentSchema,
  revokeAssignmentSchema,
} from '../lib/schemas.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

export const assignmentRoutes = Router();
assignmentRoutes.use(authenticate, requireVerifiedEmail);

/**
 * Assignment lifecycle:
 *
 *   patient requests  -> PENDING
 *   admin approves    -> ACTIVE    (only an admin can reach this state)
 *   admin rejects     -> REJECTED
 *   patient revokes   -> REVOKED   (immediate, no admin step)
 *   admin revokes     -> REVOKED
 *
 * Doctors cannot initiate. A doctor-initiated request would have to name a
 * patient, which by itself discloses that the named person is a patient here.
 */

/* ------------------------------ patient actions ---------------------------- */

assignmentRoutes.post('/', requireRole('PATIENT'), async (req, res, next) => {
  try {
    const { doctorId } = requestAssignmentSchema.parse(req.body);

    // Only approved doctors are requestable — an unapproved account must not
    // be able to collect patient requests while it waits.
    const doctor = await queryOne<{ id: string }>(
      `SELECT id FROM users
        WHERE id = $1 AND role = 'DOCTOR' AND approved_at IS NOT NULL AND is_active`,
      [doctorId]
    );
    if (!doctor) throw Errors.notFound('Doctor');

    const existing = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM assignments
        WHERE doctor_id = $1 AND patient_id = $2 AND status IN ('PENDING','ACTIVE')`,
      [doctorId, req.user!.id]
    );
    if (existing) {
      throw Errors.conflict(
        'ASSIGNMENT_EXISTS',
        `A ${existing.status.toLowerCase()} request already exists for this doctor.`
      );
    }

    const row = await queryOne(
      `INSERT INTO assignments (doctor_id, patient_id, requested_by, status)
       VALUES ($1, $2, $2, 'PENDING')
       RETURNING id, doctor_id, patient_id, status, requested_at`,
      [doctorId, req.user!.id]
    );

    res.status(201).json({ assignment: row });
  } catch (error) {
    next(error);
  }
});

/** Consent withdrawal — deliberately NOT gated on an admin. A patient must be
 *  able to stop a doctor seeing their records immediately. */
assignmentRoutes.post('/:id/revoke', async (req, res, next) => {
  try {
    const { reason } = revokeAssignmentSchema.parse(req.body ?? {});
    const { id } = req.params;

    const assignment = await queryOne<{ patient_id: string; status: string }>(
      'SELECT patient_id, status FROM assignments WHERE id = $1',
      [id]
    );
    if (!assignment) throw Errors.notFound('Assignment');

    const isOwnPatient = req.user!.role === 'PATIENT' && assignment.patient_id === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwnPatient && !isAdmin) throw Errors.forbidden();

    if (!['PENDING', 'ACTIVE'].includes(assignment.status)) {
      throw Errors.conflict('ASSIGNMENT_NOT_OPEN', 'This assignment is not active.');
    }

    const row = await queryOne(
      `UPDATE assignments
          SET status = 'REVOKED', revoked_at = now(), revoked_by = $2, revoke_reason = $3
        WHERE id = $1
        RETURNING id, status, revoked_at`,
      [id, req.user!.id, reason ?? null]
    );

    res.json({ assignment: row });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------- listing ---------------------------------- */

/** Patients see their own; doctors see theirs; admins use /admin/assignments. */
assignmentRoutes.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const column = user.role === 'PATIENT' ? 'patient_id' : 'doctor_id';
    if (user.role === 'ADMIN') throw Errors.forbidden('Use /api/v1/admin/assignments.');

    const rows = await query(
      `SELECT a.id, a.status, a.requested_at, a.approved_at, a.revoked_at,
              d.id AS doctor_id, d.name AS doctor_name,
              p.id AS patient_id, p.name AS patient_name
         FROM assignments a
         JOIN users d ON d.id = a.doctor_id
         JOIN users p ON p.id = a.patient_id
        WHERE a.${column} = $1
        ORDER BY a.requested_at DESC`,
      [user.id]
    );

    res.json({ assignments: rows });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- admin actions ----------------------------- */

assignmentRoutes.post('/:id/approve', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const assignment = await queryOne<{ status: string; doctor_id: string }>(
      'SELECT status, doctor_id FROM assignments WHERE id = $1',
      [id]
    );
    if (!assignment) throw Errors.notFound('Assignment');
    if (assignment.status !== 'PENDING') {
      throw Errors.conflict('ASSIGNMENT_NOT_PENDING', 'Only pending assignments can be approved.');
    }

    // Guarded again in the database: a trigger refuses ACTIVE when the doctor
    // is unapproved, and a constraint refuses ACTIVE without an approver.
    const doctor = await queryOne<{ approved_at: Date | null }>(
      'SELECT approved_at FROM users WHERE id = $1',
      [assignment.doctor_id]
    );
    if (!doctor?.approved_at) {
      throw Errors.conflict(
        'DOCTOR_NOT_APPROVED',
        'Approve the doctor before activating their assignments.'
      );
    }

    const row = await queryOne(
      `UPDATE assignments
          SET status = 'ACTIVE', approved_by = $2, approved_at = now()
        WHERE id = $1
        RETURNING id, status, approved_at`,
      [id, req.user!.id]
    );

    res.json({ assignment: row });
  } catch (error) {
    next(error);
  }
});

assignmentRoutes.post('/:id/reject', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { reason } = rejectAssignmentSchema.parse(req.body ?? {});
    const { id } = req.params;

    const row = await queryOne(
      `UPDATE assignments
          SET status = 'REJECTED', revoked_at = now(), revoked_by = $2, revoke_reason = $3
        WHERE id = $1 AND status = 'PENDING'
        RETURNING id, status`,
      [id, req.user!.id, reason ?? null]
    );
    if (!row) throw Errors.conflict('ASSIGNMENT_NOT_PENDING', 'No pending assignment with that id.');

    res.json({ assignment: row });
  } catch (error) {
    next(error);
  }
});

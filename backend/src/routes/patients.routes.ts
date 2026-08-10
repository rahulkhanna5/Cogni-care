import { Router } from 'express';

import { query, queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { paginationSchema } from '../lib/schemas.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authenticate.js';
import {
  assignedPatientIds,
  patientScope,
  requirePatientAccess,
} from '../middleware/canAccessPatient.js';
import { logAccess } from '../services/audit.service.js';

export const patientRoutes = Router();
patientRoutes.use(authenticate, requireVerifiedEmail);

/**
 * EVERY route below that reads one patient's data mounts requirePatientAccess.
 * Handlers read the id through patientScope(req), which throws if the guard is
 * missing — so a new route cannot quietly serve data without it.
 */

/* ------------------------------- list endpoint ----------------------------- */

/**
 * The one patient-data route with no :patientId to guard, so it filters at the
 * query layer instead: a doctor's list is built FROM the assignments table, not
 * filtered after the fact.
 */
patientRoutes.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const { limit, offset } = paginationSchema.parse(req.query);

    if (user.role === 'PATIENT') {
      const self = await queryOne(
        `SELECT id, name, email, created_at FROM users WHERE id = $1`,
        [user.id]
      );
      return res.json({ patients: self ? [self] : [], total: self ? 1 : 0 });
    }

    if (user.role === 'DOCTOR') {
      const ids = await assignedPatientIds(user);
      if (ids.length === 0) {
        await logAccess({
          actorId: user.id,
          actorRole: user.role,
          patientId: null,
          assignmentId: null,
          action: 'LIST_PATIENTS',
          allowed: true,
          reason: 'NO_ASSIGNMENTS',
          ip: req.ip ?? null,
        });
        return res.json({ patients: [], total: 0 });
      }

      const rows = await query(
        `SELECT u.id, u.name, u.email, u.created_at, a.id AS assignment_id
           FROM assignments a
           JOIN users u ON u.id = a.patient_id
          WHERE a.doctor_id = $1 AND a.status = 'ACTIVE'
          ORDER BY u.name
          LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      );

      await logAccess({
        actorId: user.id,
        actorRole: user.role,
        patientId: null,
        assignmentId: null,
        action: 'LIST_PATIENTS',
        allowed: true,
        reason: 'ACTIVE_ASSIGNMENTS',
        ip: req.ip ?? null,
      });

      return res.json({ patients: rows, total: ids.length });
    }

    // ADMIN — an explicit, named path, logged as an override rather than an
    // incidental consequence of being an admin.
    const rows = await query(
      `SELECT id, name, email, created_at FROM users
        WHERE role = 'PATIENT' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    await logAccess({
      actorId: user.id,
      actorRole: user.role,
      patientId: null,
      assignmentId: null,
      action: 'LIST_PATIENTS',
      allowed: true,
      reason: 'ADMIN_OVERRIDE',
      ip: req.ip ?? null,
    });
    return res.json({ patients: rows });
  } catch (error) {
    next(error);
  }
});

/* --------------------------- single-patient reads -------------------------- */

patientRoutes.get('/:patientId', requirePatientAccess(), async (req, res, next) => {
  try {
    const { patientId } = patientScope(req);
    const patient = await queryOne(
      `SELECT id, name, email, created_at FROM users WHERE id = $1 AND role = 'PATIENT'`,
      [patientId]
    );
    if (!patient) throw Errors.notFound('Patient');
    res.json({ patient });
  } catch (error) {
    next(error);
  }
});

patientRoutes.get('/:patientId/assessments', requirePatientAccess(), async (req, res, next) => {
  try {
    const { patientId } = patientScope(req);
    const { limit, offset } = paginationSchema.parse(req.query);
    const rows = await query(
      `SELECT * FROM assessments WHERE patient_id = $1
        ORDER BY taken_at DESC LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );
    res.json({ assessments: rows });
  } catch (error) {
    next(error);
  }
});

patientRoutes.get('/:patientId/sessions', requirePatientAccess(), async (req, res, next) => {
  try {
    const { patientId } = patientScope(req);
    const { limit, offset } = paginationSchema.parse(req.query);
    const rows = await query(
      `SELECT * FROM game_sessions WHERE patient_id = $1
        ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );
    res.json({ sessions: rows });
  } catch (error) {
    next(error);
  }
});

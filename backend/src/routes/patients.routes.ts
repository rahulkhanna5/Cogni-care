import { Router, type NextFunction, type Request, type Response } from 'express';

import { query, queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { assessmentSchema, paginationSchema, sessionSchema } from '../lib/schemas.js';
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
      // An unapproved doctor gets the explicit pending code, not an empty
      // list. "No patients yet" and "your account is still under review" are
      // different situations and the app must be able to say which.
      if (!user.approvedAt) throw Errors.doctorPendingApproval();

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

/* ------------------------------ patient writes ----------------------------- */

/**
 * Clinical data is written by the patient's own device and by nobody else.
 *
 * requirePatientAccess would also admit an assigned doctor and any admin, which
 * is right for reading and wrong for writing: a record of what someone scored
 * must not be creatable by a third party. Read and write authority are
 * different questions and are answered separately.
 */
function requireSelf(req: Request, _res: Response, next: NextFunction) {
  const { patientId } = patientScope(req);
  if (req.user!.id !== patientId) {
    return next(Errors.forbidden('Only the patient can submit their own results.'));
  }
  next();
}

patientRoutes.post(
  '/:patientId/sessions',
  requirePatientAccess(),
  requireSelf,
  async (req, res, next) => {
    try {
      const { patientId } = patientScope(req);
      const body = sessionSchema.parse(req.body);

      const row = await queryOne<{ id: string }>(
        `INSERT INTO game_sessions
           (patient_id, game_id, started_at, ended_at, level_start, level_end,
            accuracy, score, avg_reaction_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          patientId,
          body.gameId,
          body.startedAt,
          body.endedAt,
          body.levelStart,
          body.levelEnd,
          body.accuracy,
          body.score,
          body.avgReactionMs,
        ]
      );

      // Rounds carry the misses / false-alarms split, which is the part of
      // this data that is actually worth analysing.
      for (const round of body.rounds ?? []) {
        await query(
          `INSERT INTO game_rounds
             (session_id, round_no, level, hits, misses, false_alarms, accuracy, avg_reaction_ms)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (session_id, round_no) DO NOTHING`,
          [
            row!.id,
            round.roundNo,
            round.level,
            round.hits,
            round.misses,
            round.falseAlarms,
            round.accuracy,
            round.avgReactionMs,
          ]
        );
      }

      res.status(201).json({ id: row!.id });
    } catch (error) {
      next(error);
    }
  }
);

patientRoutes.post(
  '/:patientId/assessments',
  requirePatientAccess(),
  requireSelf,
  async (req, res, next) => {
    try {
      const { patientId } = patientScope(req);
      const body = assessmentSchema.parse(req.body);

      const row = await queryOne<{ id: string }>(
        `INSERT INTO assessments
           (patient_id, taken_at, total_score, band, attention, stm, ltm, speed, adl)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          patientId,
          body.takenAt,
          body.totalScore,
          body.band,
          body.domains.attention,
          body.domains.stm,
          body.domains.ltm,
          body.domains.speed,
          body.domains.adl,
        ]
      );

      for (const answer of body.answers ?? []) {
        await query(
          `INSERT INTO assessment_answers (assessment_id, item_no, domain, value)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (assessment_id, item_no) DO NOTHING`,
          [row!.id, answer.itemNo, answer.domain, answer.value]
        );
      }

      res.status(201).json({ id: row!.id });
    } catch (error) {
      next(error);
    }
  }
);

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

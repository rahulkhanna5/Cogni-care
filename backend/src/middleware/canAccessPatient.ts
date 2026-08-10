import type { NextFunction, Request, Response } from 'express';

import { queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { logAccess } from '../services/audit.service.js';
import type { AuthUser, UserRole } from '../types.js';

export type AccessDecision =
  | { allowed: true; assignmentId: string | null; reason: string }
  | { allowed: false; error: ReturnType<typeof Errors.forbidden>; reason: string };

/**
 * The single source of truth for "may this requester see this patient's data?"
 *
 * Every route that touches patient data goes through this. It is deliberately
 * not inlined anywhere: a new route that forgets to call it fails closed,
 * because it will not have `req.patientAccess` and the handler helper below
 * throws without it.
 */
export async function canAccessPatient(
  requesterId: string,
  requesterRole: UserRole,
  patientId: string
): Promise<AccessDecision> {
  // A patient may read their own record and nothing else.
  if (requesterRole === 'PATIENT') {
    return requesterId === patientId
      ? { allowed: true, assignmentId: null, reason: 'SELF' }
      : { allowed: false, error: Errors.forbidden(), reason: 'NOT_SELF' };
  }

  // Admin access to clinical data is real but never silent — it is recorded
  // under its own reason so an audit can separate it from care-team access.
  if (requesterRole === 'ADMIN') {
    return { allowed: true, assignmentId: null, reason: 'ADMIN_OVERRIDE' };
  }

  if (requesterRole === 'DOCTOR') {
    // Re-checked from the database, not from the token: approval can be
    // withdrawn between issuing a token and using it.
    const doctor = await queryOne<{ approved_at: Date | null; is_active: boolean }>(
      'SELECT approved_at, is_active FROM users WHERE id = $1',
      [requesterId]
    );

    if (!doctor?.is_active) {
      return { allowed: false, error: Errors.accountDisabled(), reason: 'DOCTOR_DISABLED' };
    }
    if (!doctor.approved_at) {
      return {
        allowed: false,
        error: Errors.doctorPendingApproval(),
        reason: 'DOCTOR_NOT_APPROVED',
      };
    }

    const assignment = await queryOne<{ id: string }>(
      `SELECT id FROM assignments
        WHERE doctor_id = $1 AND patient_id = $2 AND status = 'ACTIVE'
        LIMIT 1`,
      [requesterId, patientId]
    );

    return assignment
      ? { allowed: true, assignmentId: assignment.id, reason: 'ACTIVE_ASSIGNMENT' }
      : { allowed: false, error: Errors.noAssignment(), reason: 'NO_ACTIVE_ASSIGNMENT' };
  }

  return { allowed: false, error: Errors.forbidden(), reason: 'UNKNOWN_ROLE' };
}

/**
 * Express wrapper. Reads the patient id from a route param, runs the guard,
 * writes an audit row either way, and stashes the decision on the request.
 */
export function requirePatientAccess(paramName = 'patientId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw Errors.unauthenticated();

      // Express 5 types a param as string | string[] (repeated params).
      // Take the first value rather than letting an array reach a SQL binding.
      const raw = req.params[paramName];
      const patientId = Array.isArray(raw) ? raw[0] : raw;
      if (!patientId) throw Errors.notFound('Patient');

      const decision = await canAccessPatient(user.id, user.role, patientId);

      await logAccess({
        actorId: user.id,
        actorRole: user.role,
        patientId,
        assignmentId: decision.allowed ? decision.assignmentId : null,
        action: `${req.method} ${req.baseUrl}${req.route?.path ?? ''}`,
        method: req.method,
        route: `${req.baseUrl}${req.path}`,
        allowed: decision.allowed,
        reason: decision.reason,
        ip: req.ip ?? null,
      });

      if (!decision.allowed) throw decision.error;

      req.patientAccess = {
        patientId,
        assignmentId: decision.assignmentId,
        reason: decision.reason,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Handlers call this instead of reading req.params directly. If the guard was
 * not mounted, this throws rather than serving data — so forgetting the
 * middleware is a 500 in development, not a silent data leak in production.
 */
export function patientScope(req: Request): { patientId: string; assignmentId: string | null } {
  if (!req.patientAccess) {
    throw new Error(
      'patientScope() called without requirePatientAccess() on the route — refusing to serve patient data.'
    );
  }
  return req.patientAccess;
}

/** Patient ids a doctor may currently see. Used for list endpoints, which have
 *  no single :patientId to guard. */
export async function assignedPatientIds(doctor: AuthUser): Promise<string[]> {
  if (!doctor.approvedAt) return [];
  const rows = await queryOne<{ ids: string[] }>(
    `SELECT COALESCE(array_agg(patient_id), '{}') AS ids
       FROM assignments WHERE doctor_id = $1 AND status = 'ACTIVE'`,
    [doctor.id]
  );
  return rows?.ids ?? [];
}

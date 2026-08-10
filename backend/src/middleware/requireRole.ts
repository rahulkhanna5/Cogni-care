import type { NextFunction, Request, Response } from 'express';

import { Errors } from '../lib/errors.js';
import type { UserRole } from '../types.js';

/**
 * Coarse gate only.
 *
 * Being a DOCTOR is never sufficient to read a patient's data — that is what
 * canAccessPatient is for. This exists to keep patients out of admin screens
 * and to fail fast, not to protect clinical records.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthenticated());
    if (!roles.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}

/**
 * A doctor who has confirmed their email but has not been approved by an
 * admin is hard-blocked here, with a code the app can act on rather than a
 * generic denial: this state resolves by waiting, not by the user doing
 * anything differently.
 */
export function requireApprovedDoctor(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Errors.unauthenticated());
  if (req.user.role !== 'DOCTOR') return next(Errors.forbidden());
  if (!req.user.emailVerifiedAt) return next(Errors.emailNotVerified());
  if (!req.user.approvedAt) return next(Errors.doctorPendingApproval());
  next();
}

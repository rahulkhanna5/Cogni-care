import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { toAuthUser, type UserRow } from '../types.js';

/**
 * Verifies the access token, then RE-LOADS the user from the database.
 *
 * The reload is the point. If authorisation trusted the JWT's claims, then
 * disabling an account, revoking a doctor's approval, or ending an assignment
 * would not take effect until the token expired — up to 15 minutes of live
 * access to patient records after someone hit "revoke". One indexed primary-key
 * lookup per request is a cheap price for revocation being immediate.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw Errors.unauthenticated();

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw Errors.unauthenticated();

    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw Errors.tokenExpired();
      throw Errors.unauthenticated('Invalid access token.');
    }

    const row = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [claims.sub]);
    if (!row) throw Errors.unauthenticated('Account no longer exists.');
    if (!row.is_active) throw Errors.accountDisabled();

    req.user = toAuthUser(row);
    next();
  } catch (error) {
    next(error);
  }
}

/** Routes that require a confirmed email address (all roles). */
export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Errors.unauthenticated());
  if (!req.user.emailVerifiedAt) return next(Errors.emailNotVerified());
  next();
}

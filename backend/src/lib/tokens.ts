import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { UserRole } from '../types.js';

export type AccessClaims = {
  sub: string;
  role: UserRole;
};

/**
 * The access token carries identity only.
 *
 * `role` is included for cheap coarse routing, but NOTHING that gates patient
 * data may trust it — approval state and assignments are re-read from the
 * database on every request. Otherwise revoking a doctor leaves them with up
 * to 15 minutes of live access to records.
 */
export function signAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ role } satisfies Omit<AccessClaims, 'sub'>, config.jwt.secret, {
    subject: userId,
    expiresIn: config.jwt.accessTtl as jwt.SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  const decoded = jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
  }) as jwt.JwtPayload;

  if (!decoded.sub) throw new jwt.JsonWebTokenError('missing subject');
  return { sub: decoded.sub, role: decoded.role as UserRole };
}

/** Opaque random string. Refresh tokens are not JWTs — they must be revocable. */
export const generateOpaqueToken = () => randomBytes(48).toString('base64url');

/**
 * Only hashes are stored, so a database dump yields no usable tokens.
 * SHA-256 rather than argon2 is correct here: the input is 48 random bytes,
 * so there is nothing to brute-force, and this runs on every refresh.
 */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

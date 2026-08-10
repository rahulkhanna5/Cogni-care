import type { PoolClient } from 'pg';

import { config } from '../config.js';
import { query, queryOne, withTransaction } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { hashPassword } from '../lib/password.js';
import { generateOpaqueToken, hashToken, signAccessToken } from '../lib/tokens.js';
import type { UserRole, UserRow } from '../types.js';

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  specialty?: string;
  licenseNumber?: string;
  bio?: string;
};

export async function registerUser(input: RegisterInput): Promise<{
  user: UserRow;
  emailVerifyToken: string;
}> {
  // ADMIN can never be created from a request body. See README, "Admin bootstrap".
  if (input.role === 'ADMIN' && !config.allowAdminSelfRegistration) {
    throw Errors.forbidden('Administrator accounts cannot be self-registered.');
  }

  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [input.email],
      client
    );
    if (existing) {
      throw Errors.conflict('EMAIL_IN_USE', 'That email address is already registered.');
    }

    const user = await queryOne<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.name.trim(), input.email, passwordHash, input.role],
      client
    );
    if (!user) throw Errors.internal();

    if (input.role === 'DOCTOR') {
      // Captured verbatim and stored UNVERIFIED. An admin reads these fields
      // when deciding whether to approve; nothing here grants anything.
      const duplicate = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM doctor_profiles WHERE lower(btrim(license_number)) = lower(btrim($1))',
        [input.licenseNumber ?? ''],
        client
      );
      if (duplicate) {
        throw Errors.conflict(
          'LICENSE_IN_USE',
          'That registration number is already on file. Contact support if this is yours.'
        );
      }

      await query(
        `INSERT INTO doctor_profiles (user_id, specialty, license_number, bio)
         VALUES ($1, $2, $3, $4)`,
        [user.id, input.specialty, input.licenseNumber, input.bio ?? null],
        client
      );
    }

    const emailVerifyToken = await issueOneTimeToken(
      user.id,
      'EMAIL_VERIFY',
      config.tokens.emailVerifyTtlHours * 60,
      client
    );

    return { user, emailVerifyToken };
  });
}

export async function issueOneTimeToken(
  userId: string,
  purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
  ttlMinutes: number,
  client?: PoolClient
): Promise<string> {
  const token = generateOpaqueToken();
  await query(
    `INSERT INTO one_time_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, purpose, hashToken(token), String(ttlMinutes)],
    client
  );
  return token;
}

/** Consumes a one-time token, or throws. Single-use and time-limited. */
export async function consumeOneTimeToken(
  token: string,
  purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET'
): Promise<string> {
  const row = await queryOne<{ id: string; user_id: string }>(
    `UPDATE one_time_tokens
        SET used_at = now()
      WHERE token_hash = $1
        AND purpose = $2
        AND used_at IS NULL
        AND expires_at > now()
      RETURNING id, user_id`,
    [hashToken(token), purpose]
  );
  if (!row) throw new AppTokenError();
  return row.user_id;
}

class AppTokenError extends Error {
  constructor() {
    super('invalid or expired token');
  }
}
export { AppTokenError };

/* ------------------------------ refresh tokens ----------------------------- */

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function issueSession(
  user: Pick<UserRow, 'id' | 'role'>,
  meta: { userAgent?: string | null; ip?: string | null },
  familyId?: string,
  parentId?: string
): Promise<IssuedSession> {
  const refreshToken = generateOpaqueToken();

  const row = await queryOne<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, parent_id, user_agent, ip, expires_at)
     VALUES ($1, $2, COALESCE($3, gen_random_uuid()), $4, $5, $6, now() + ($7 || ' days')::interval)
     RETURNING id`,
    [
      user.id,
      hashToken(refreshToken),
      familyId ?? null,
      parentId ?? null,
      meta.userAgent ?? null,
      meta.ip ?? null,
      String(config.refresh.ttlDays),
    ]
  );
  if (!row) throw Errors.internal();

  return {
    accessToken: signAccessToken(user.id, user.role),
    refreshToken,
    expiresIn: 15 * 60,
  };
}

/**
 * Rotates a refresh token.
 *
 * If a token that has ALREADY been used is presented again, that is the
 * signature of a stolen token being replayed: the legitimate client rotated
 * it, so nobody honest still holds it. The entire family is revoked, which
 * signs out the attacker and the real user together — deliberately, because
 * the alternative is leaving the attacker with a live session.
 */
export async function rotateRefreshToken(
  presented: string,
  meta: { userAgent?: string | null; ip?: string | null }
): Promise<IssuedSession> {
  const tokenHash = hashToken(presented);

  return withTransaction(async (client) => {
    const stored = await queryOne<{
      id: string;
      user_id: string;
      family_id: string;
      used_at: Date | null;
      revoked_at: Date | null;
      expires_at: Date;
    }>(
      'SELECT id, user_id, family_id, used_at, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
      [tokenHash],
      client
    );

    if (!stored) throw Errors.unauthenticated('Invalid refresh token.');

    if (stored.used_at || stored.revoked_at) {
      await query(
        `UPDATE refresh_tokens
            SET revoked_at = now(), revoked_reason = 'REUSE_DETECTED'
          WHERE family_id = $1 AND revoked_at IS NULL`,
        [stored.family_id],
        client
      );
      throw Errors.refreshReuse();
    }

    if (stored.expires_at.getTime() <= Date.now()) {
      throw Errors.unauthenticated('Refresh token has expired.');
    }

    const user = await queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [stored.user_id],
      client
    );
    if (!user) throw Errors.unauthenticated('Account no longer exists.');
    if (!user.is_active) throw Errors.accountDisabled();

    await query('UPDATE refresh_tokens SET used_at = now() WHERE id = $1', [stored.id], client);

    return issueSession(user, meta, stored.family_id, stored.id);
  });
}

export async function revokeRefreshToken(presented: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now(), revoked_reason = 'LOGOUT'
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(presented)]
  );
}

/** Used after a password reset — every existing session must die. */
export async function revokeAllSessions(userId: string, reason: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now(), revoked_reason = $2
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason]
  );
}

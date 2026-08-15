import { Router } from 'express';

import { config } from '../config.js';
import { query, queryOne } from '../db/pool.js';
import { Errors } from '../lib/errors.js';
import { fakeVerify, hashPassword, verifyPassword } from '../lib/password.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../lib/schemas.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
} from '../middleware/rateLimit.js';
import {
  AppTokenError,
  consumeOneTimeToken,
  issueOneTimeToken,
  issueSession,
  registerUser,
  revokeAllSessions,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../services/auth.service.js';
import { toPublicUser, type UserRow } from '../types.js';

export const authRoutes = Router();

const meta = (req: { get: (h: string) => string | undefined; ip?: string }) => ({
  userAgent: req.get('user-agent') ?? null,
  ip: req.ip ?? null,
});

/* --------------------------------- register -------------------------------- */

authRoutes.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const { user, emailVerifyToken } = await registerUser(input);

    // TODO(email): hand emailVerifyToken to the mail provider. Returned in the
    // response only outside production so the flow is testable without SMTP.
    console.log(`[email] verify token for ${user.email}: ${emailVerifyToken}`);

    res.status(201).json({
      user: toPublicUser(user),
      // Tells the app which screen to show next without it having to infer
      // the rule from role + flags.
      nextStep:
        user.role === 'DOCTOR' ? 'VERIFY_EMAIL_THEN_AWAIT_APPROVAL' : 'VERIFY_EMAIL',
      ...(config.env !== 'production' ? { devEmailVerifyToken: emailVerifyToken } : {}),
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- verify email ------------------------------ */

authRoutes.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const userId = await consumeOneTimeToken(token, 'EMAIL_VERIFY').catch(() => {
      throw Errors.conflict('INVALID_TOKEN', 'This link is invalid or has expired.');
    });

    // Only ever sets email confirmation. A doctor's approval is a separate
    // column that only an admin can write — confirming your own email must
    // never be able to approve you.
    const user = await queryOne<UserRow>(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now())
        WHERE id = $1 RETURNING *`,
      [userId]
    );
    if (!user) throw Errors.notFound('User');

    res.json({
      user: toPublicUser(user),
      nextStep: user.role === 'DOCTOR' && !user.approved_at ? 'AWAIT_APPROVAL' : 'READY',
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------- login ---------------------------------- */

authRoutes.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);

    if (!user) {
      // Same work and same error as a wrong password, so neither timing nor
      // response reveals whether the account exists.
      await fakeVerify();
      throw Errors.invalidCredentials();
    }

    const ok = await verifyPassword(user.password_hash, password);
    if (!ok) throw Errors.invalidCredentials();
    if (!user.is_active) throw Errors.accountDisabled();

    const session = await issueSession(user, meta(req));

    // Login succeeds for unapproved doctors on purpose: they need to reach a
    // screen that explains they are waiting. Their access is blocked at the
    // guards, not at the door.
    res.json({
      ...session,
      user: toPublicUser(user),
      pendingApproval: user.role === 'DOCTOR' && !user.approved_at,
    });
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- refresh --------------------------------- */

authRoutes.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const session = await rotateRefreshToken(refreshToken, meta(req));
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- logout ---------------------------------- */

authRoutes.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/* ----------------------------- forgot password ----------------------------- */

authRoutes.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);

    let devResetToken: string | undefined;
    if (user?.is_active) {
      const token = await issueOneTimeToken(
        user.id,
        'PASSWORD_RESET',
        config.tokens.passwordResetTtlMinutes
      );
      console.log(`[email] reset token for ${user.email}: ${token}`);
      // TODO(email): hand token to the mail provider instead. Returned in the
      // response only outside production, same convention as
      // devEmailVerifyToken on /register, so the flow is testable without SMTP.
      if (config.env !== 'production') devResetToken = token;
    }

    // Always the same response shape and the same delay-free path whether or
    // not the address is registered — telling the caller which turns this
    // endpoint into an account-enumeration oracle. devResetToken is the one
    // exception, and only outside production: a dev build needs SOME way to
    // see the token, and only ever seeing it for real accounts is the whole
    // point of testing the enumeration-safe path in the first place.
    res.json({
      message: 'If that email is registered, a reset link has been sent.',
      ...(devResetToken ? { devResetToken } : {}),
    });
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    let userId: string;
    try {
      userId = await consumeOneTimeToken(token, 'PASSWORD_RESET');
    } catch (error) {
      if (error instanceof AppTokenError) {
        throw Errors.conflict('INVALID_TOKEN', 'This reset link is invalid or has expired.');
      }
      throw error;
    }

    await query('UPDATE users SET password_hash = $2 WHERE id = $1', [
      userId,
      await hashPassword(password),
    ]);

    // A reset usually means the account was at risk. Kill every session so a
    // thief holding a refresh token is signed out too.
    await revokeAllSessions(userId, 'PASSWORD_RESET');

    res.json({ message: 'Password updated. Please sign in again.' });
  } catch (error) {
    next(error);
  }
});

/* ----------------------------------- me ------------------------------------ */

authRoutes.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.id]);
    if (!user) throw Errors.notFound('User');
    res.json({
      user: toPublicUser(user),
      pendingApproval: user.role === 'DOCTOR' && !user.approved_at,
    });
  } catch (error) {
    next(error);
  }
});

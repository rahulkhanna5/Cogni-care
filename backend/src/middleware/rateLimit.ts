import rateLimit from 'express-rate-limit';

import { Errors } from '../lib/errors.js';

const handler = () => {
  throw Errors.tooManyRequests();
};

/** Credential stuffing defence. Keyed on IP + email so one attacker cannot
 *  lock out every user by hammering a shared IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  handler,
});

/** Password reset is an email-sending endpoint — rate limited so it cannot be
 *  used to spam somebody else's inbox. */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  handler,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

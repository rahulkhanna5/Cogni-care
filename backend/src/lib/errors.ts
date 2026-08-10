/**
 * Every failure the client sees carries a stable machine-readable `code`.
 * The frontend must be able to tell "your doctor account is awaiting
 * approval" apart from "you are not allowed here" without string-matching
 * a human sentence.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  validation: (details: unknown) =>
    new AppError(400, 'VALIDATION_FAILED', 'Some fields are invalid.', details),

  unauthenticated: (message = 'Authentication required.') =>
    new AppError(401, 'UNAUTHENTICATED', message),

  invalidCredentials: () =>
    // Deliberately identical whether the email is unknown or the password is
    // wrong — anything else lets an attacker enumerate accounts.
    new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'),

  tokenExpired: () => new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired.'),

  refreshReuse: () =>
    new AppError(
      401,
      'REFRESH_TOKEN_REUSED',
      'This session has been ended for security reasons. Please sign in again.'
    ),

  forbidden: (message = 'You do not have access to this resource.') =>
    new AppError(403, 'FORBIDDEN', message),

  emailNotVerified: () =>
    new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please confirm your email address first.'),

  /** Distinct from FORBIDDEN on purpose: this one resolves by waiting, not by
   *  the user changing anything. The app should say so. */
  doctorPendingApproval: () =>
    new AppError(
      403,
      'DOCTOR_PENDING_APPROVAL',
      'Your doctor account is awaiting review by an administrator.'
    ),

  doctorRejected: () =>
    new AppError(403, 'DOCTOR_NOT_APPROVED', 'Your doctor account has not been approved.'),

  noAssignment: () =>
    new AppError(
      403,
      'NO_ACTIVE_ASSIGNMENT',
      'You do not have an approved assignment for this patient.'
    ),

  accountDisabled: () => new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.'),

  notFound: (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`),

  conflict: (code: string, message: string) => new AppError(409, code, message),

  tooManyRequests: () =>
    new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please try again shortly.'),

  internal: () => new AppError(500, 'INTERNAL_ERROR', 'Something went wrong.'),
} as const;

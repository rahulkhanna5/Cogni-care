import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail at boot rather than at the first request that needs it. A server
    // running without JWT_SECRET is worse than a server that refuses to start.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),

  jwt: {
    secret: required('JWT_SECRET'),
    /** Short by design — a revoked user keeps a valid token until it expires. */
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    issuer: process.env.JWT_ISSUER ?? 'cognicare',
  },

  refresh: {
    ttlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  },

  tokens: {
    emailVerifyTtlHours: Number(process.env.EMAIL_VERIFY_TTL_HOURS ?? 24),
    passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30),
  },

  /**
   * ADMIN is never accepted by /register. The first admin comes from
   * `npm run seed:admin`; later ones are created by an existing admin.
   * See README "Admin bootstrap" for why.
   */
  allowAdminSelfRegistration: false,
} as const;

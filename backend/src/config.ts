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

  /**
   * Not `required()` — the AI features are optional. Without a key the server
   * still boots and every non-AI route works; only the remark and chat
   * endpoints answer 503. Making this mandatory would take the whole API down
   * over a feature nobody has to use.
   */
  llm: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    /**
     * Tried in order, first to answer wins.
     *
     * Free models share a pool across every OpenRouter user, so a single one
     * returns 429 fairly often through no fault of this key — a one-model
     * config makes the whole feature look broken when it is just busy.
     *
     * Order matters for a second reason: some models (the nemotron family in
     * particular) emit their reasoning into the reply text, which is unusable
     * for a clinical note. The instruction-tuned Gemmas answer cleanly, so
     * they lead.
     */
    models: (
      process.env.OPENROUTER_MODEL ??
      'google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,openai/gpt-oss-20b:free'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    baseUrl: 'https://openrouter.ai/api/v1',
    /** A model that hangs must not hold an Express handler open forever. */
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS ?? 45_000),
  },
} as const;

export const llmConfigured = () => config.llm.apiKey.length > 0;

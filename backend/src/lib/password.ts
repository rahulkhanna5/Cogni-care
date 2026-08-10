import argon2 from 'argon2';

/** argon2id — memory-hard, so GPU cracking gains far less than against bcrypt. */
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB — OWASP minimum
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed hash in the database must read as "wrong password",
    // never as an exception that a caller might treat as success.
    return false;
  }
}

/**
 * Burns roughly the same time as a real verification. Called on the
 * unknown-email path of /login so response timing does not reveal whether
 * an account exists.
 */
export async function fakeVerify(): Promise<void> {
  await argon2.hash('timing-equaliser', OPTIONS);
}

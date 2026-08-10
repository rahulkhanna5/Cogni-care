import { pool, queryOne } from '../src/db/pool.js';
import { hashPassword } from '../src/lib/password.js';
import type { UserRow } from '../src/types.js';

/**
 * Creates the first ADMIN.
 *
 * Run by someone who already holds database and environment access:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run seed:admin
 *
 * This is the whole reason /register refuses ADMIN. See README, "Admin
 * bootstrap", for the alternatives considered.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrator';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Choose an admin password of at least 12 characters.');
    process.exit(1);
  }

  const existing = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM users WHERE role = 'ADMIN'`
  );

  if (Number(existing?.count ?? 0) > 0) {
    // Refuses to run twice. Further admins are created by an existing admin
    // through POST /api/v1/admin/users, which leaves an attributable trail.
    console.error(
      'An ADMIN already exists. Create further admins via POST /api/v1/admin/users.'
    );
    process.exit(1);
  }

  const created = await queryOne<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, email_verified_at)
     VALUES ($1, $2, $3, 'ADMIN', now())
     RETURNING *`,
    [name, email.toLowerCase(), await hashPassword(password)]
  );

  console.log(`Created admin ${created?.email} (${created?.id})`);
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

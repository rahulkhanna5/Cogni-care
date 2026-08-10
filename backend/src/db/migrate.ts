import { realpathSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { pool } from './pool.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Applies every .sql file in migrations/ that has not run yet, in filename
 * order, each inside its own transaction. Already-applied files are recorded
 * in schema_migrations and never re-run.
 *
 * Migrations are append-only: never edit one that has been applied anywhere.
 */
export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  const applied = new Set(
    (await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations')).rows.map(
      (r) => r.filename
    )
  );

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log('migrations: up to date');
    return;
  }

  for (const filename of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`migrations: applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`migrations: FAILED on ${filename}`);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run directly: `npm run migrate`
//
// Compared via pathToFileURL rather than string-concatenating "file://".
// The naive form does not match under tsx, so `npm run migrate` loaded this
// module, ran nothing, and exited 0 — a migration command that silently does
// nothing is worse than one that fails.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

if (invokedDirectly) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

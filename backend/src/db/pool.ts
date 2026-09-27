import pg from 'pg';

import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
});

/**
 * Neon can and does close idle pooled connections on its own — compute
 * suspend, an idle-in-transaction timeout, routine connection recycling.
 * pg.Pool surfaces that as an 'error' event on the pool, and Node's default
 * behaviour for an EventEmitter 'error' with no listener is to throw. With
 * nothing here, one connection Neon decided to drop took the entire server
 * down (2026-08-18, FATAL 25P03). The pool already replaces a dead
 * connection with a fresh one on the next checkout; the only job left here
 * is to stop that from being fatal.
 */
pool.on('error', (error) => {
  console.error('[db] pool client error (connection dropped, pool continues):', error);
});

export type Queryable = pg.Pool | pg.PoolClient;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: Queryable = pool
): Promise<T[]> {
  const result = await client.query<T>(sql, params as never[]);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: Queryable = pool
): Promise<T | null> {
  const rows = await query<T>(sql, params, client);
  return rows[0] ?? null;
}

type CheckedOut = Pick<pg.PoolClient, 'on' | 'removeListener' | 'release'>;

/**
 * Covers a client while it is checked out of the pool.
 *
 * pool.on('error') above only protects IDLE clients: pg-pool removes its
 * listener from a client when it is handed out. A connection the server kills
 * mid-transaction therefore emitted 'error' with no listener at all — which
 * is what actually crashed the server (the stack trace said "on Client
 * instance", not the pool). The query in flight rejects on its own; this only
 * stops the event from being fatal, and makes sure a dead connection is
 * destroyed rather than handed to the next request.
 */
export function guardCheckedOut(client: CheckedOut) {
  let broken: Error | undefined;
  const onError = (error: Error) => {
    broken = error;
    console.error('[db] connection lost while in use:', error.message);
  };
  client.on('error', onError);

  return {
    release() {
      client.removeListener('error', onError);
      // release(err) destroys the client instead of returning it to the pool.
      client.release(broken);
    },
  };
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  const guard = guardCheckedOut(client);
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // On a dead connection ROLLBACK fails too; that must not replace the
    // error that actually explains what went wrong.
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    guard.release();
  }
}

import { migrate } from './migrations';

/** node:sqlite has no bundled types here; only these few calls are used. */
type Raw = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...p: unknown[]): unknown;
    get(...p: unknown[]): unknown;
    all(...p: unknown[]): unknown[];
  };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => Raw };

function openDb() {
  const raw = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => void raw.exec(sql),
    runAsync: async (sql: string, ...p: unknown[]) => void raw.prepare(sql).run(...p),
    getFirstAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).get(...p) ?? null,
    getAllAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).all(...p),
  };
  return { raw, db: db as never };
}

it('v4 puts every unplayed game back to level 1 and keeps levels earned by playing', async () => {
  const { raw, db } = openDb();
  await migrate(db);
  raw.exec("INSERT INTO players (name) VALUES ('A')");
  // As a check-in preset left them: unplayed at 5, and one played up to 4.
  raw.exec(
    "INSERT INTO game_progress (player_id, game_id, current_level, total_plays) VALUES (1, 'blink-trail', 5, 0)"
  );
  raw.exec(
    "INSERT INTO game_progress (player_id, game_id, current_level, total_plays) VALUES (1, 'daily-order', 4, 3)"
  );
  raw.exec('PRAGMA user_version = 3');

  await migrate(db);

  const level = (g: string) =>
    (raw.prepare('SELECT current_level l FROM game_progress WHERE game_id = ?').get(g) as { l: number }).l;
  expect(level('blink-trail')).toBe(1);
  expect(level('daily-order')).toBe(4);
});

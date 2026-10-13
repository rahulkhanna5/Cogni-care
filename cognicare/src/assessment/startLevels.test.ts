import { migrate } from '@/db/migrations';
import { presetStartLevels } from '@/db/queries';
import { GAME_MAX_LEVEL, START_LEVEL, startLevelFor, startLevelsFor } from './startLevels';

/** node:sqlite has no bundled types here; only these few calls are used. */
type Raw = {
  exec(sql: string): void;
  prepare(sql: string): { run(...p: unknown[]): unknown; get(...p: unknown[]): unknown; all(...p: unknown[]): unknown[] };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => Raw };

/** Just enough of expo-sqlite's async API over a real in-memory SQLite. */
function openDb() {
  const raw = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => void raw.exec(sql),
    runAsync: async (sql: string, ...p: unknown[]) => void raw.prepare(sql).run(...p),
    getFirstAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).get(...p) ?? null,
    getAllAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).all(...p),
    withTransactionAsync: async (fn: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { raw, db: db as never };
}

const levelOf = (raw: Raw, game: string) =>
  (raw.prepare('SELECT current_level l FROM game_progress WHERE player_id = 1 AND game_id = ?').get(game) as { l: number }).l;

it('a healthier band starts further up, a more impaired one at the bottom', () => {
  expect(START_LEVEL).toEqual({ normal: 8, mild: 5, moderate: 3, severe: 1 });
});

it('never exceeds a game top level, and covers all eight games', () => {
  expect(Object.keys(GAME_MAX_LEVEL)).toHaveLength(8);
  for (const [id, max] of Object.entries(GAME_MAX_LEVEL)) {
    expect(startLevelFor('normal', id)).toBe(Math.min(8, max));
    expect(startLevelFor('severe', id)).toBe(1);
  }
  expect(Object.keys(startLevelsFor('mild'))).toHaveLength(8);
});

describe('presetStartLevels', () => {
  it('creates a row for every game the player has not opened', async () => {
    const { raw, db } = openDb();
    await migrate(db);
    raw.exec("INSERT INTO players (name) VALUES ('A')");
    await presetStartLevels(db, 1, startLevelsFor('mild'));
    expect(levelOf(raw, 'blink-trail')).toBe(5);
    expect(levelOf(raw, 'path-finder')).toBe(Math.min(5, GAME_MAX_LEVEL['path-finder']));
  });

  it('moves an unplayed game when a later check-in lands in another band', async () => {
    const { raw, db } = openDb();
    await migrate(db);
    raw.exec("INSERT INTO players (name) VALUES ('A')");
    await presetStartLevels(db, 1, startLevelsFor('moderate'));
    expect(levelOf(raw, 'blink-trail')).toBe(3);
    await presetStartLevels(db, 1, startLevelsFor('mild'));
    expect(levelOf(raw, 'blink-trail')).toBe(5);
  });

  it('never overwrites a level the player earned by playing', async () => {
    const { raw, db } = openDb();
    await migrate(db);
    raw.exec("INSERT INTO players (name) VALUES ('A')");
    raw.exec(
      "INSERT INTO game_progress (player_id, game_id, current_level, total_plays) VALUES (1, 'blink-trail', 2, 6)"
    );
    await presetStartLevels(db, 1, startLevelsFor('normal'));
    expect(levelOf(raw, 'blink-trail')).toBe(2);
    expect(levelOf(raw, 'market-rush')).toBe(Math.min(8, GAME_MAX_LEVEL['market-rush']));
  });
});

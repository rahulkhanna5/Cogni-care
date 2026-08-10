import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Versioned migrations, applied in order via PRAGMA user_version.
 *
 * Append-only: never edit a migration that has shipped, add a new one.
 * The device is the only copy of a participant's data — there is no server to
 * re-sync from if a migration destroys it.
 */
const MIGRATIONS: ((db: SQLiteDatabase) => Promise<void>)[] = [
  // v1 — initial schema
  async (db) => {
    await db.execAsync(`
      CREATE TABLE players (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        age         INTEGER,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      -- Questionnaire results. NOTE: higher score = MORE impairment.
      CREATE TABLE assessments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        taken_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        total_score INTEGER NOT NULL,
        band        TEXT    NOT NULL,
        attention   INTEGER NOT NULL,
        stm         INTEGER NOT NULL,
        ltm         INTEGER NOT NULL,
        speed       INTEGER NOT NULL,
        adl         INTEGER NOT NULL
      );

      CREATE TABLE assessment_answers (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        item_no       INTEGER NOT NULL,
        domain        TEXT    NOT NULL,
        value         INTEGER NOT NULL CHECK (value BETWEEN 0 AND 4)
      );

      -- One row per player per game: where the adaptive ladder currently sits.
      CREATE TABLE game_progress (
        player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        game_id       TEXT    NOT NULL,
        current_level INTEGER NOT NULL DEFAULT 1,
        best_score    INTEGER NOT NULL DEFAULT 0,
        total_plays   INTEGER NOT NULL DEFAULT 0,
        last_played_at TEXT,
        PRIMARY KEY (player_id, game_id)
      );

      CREATE TABLE game_sessions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id      INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        game_id        TEXT    NOT NULL,
        started_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        ended_at       TEXT,
        level_start    INTEGER NOT NULL,
        level_end      INTEGER,
        accuracy       REAL,
        score          INTEGER,
        avg_reaction_ms INTEGER
      );

      -- Research-grade detail. misses and false_alarms are kept apart on
      -- purpose: the difference between them is what distinguishes an
      -- attention lapse from an inhibition failure. Do not merge them.
      CREATE TABLE game_rounds (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id      INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        round_no        INTEGER NOT NULL,
        level           INTEGER NOT NULL,
        hits            INTEGER NOT NULL DEFAULT 0,
        misses          INTEGER NOT NULL DEFAULT 0,
        false_alarms    INTEGER NOT NULL DEFAULT 0,
        accuracy        REAL    NOT NULL DEFAULT 0,
        avg_reaction_ms INTEGER
      );

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX idx_sessions_player_game ON game_sessions(player_id, game_id);
      CREATE INDEX idx_sessions_started     ON game_sessions(started_at);
      CREATE INDEX idx_rounds_session       ON game_rounds(session_id);
      CREATE INDEX idx_assessments_player   ON assessments(player_id, taken_at);
    `);
  },

  // v2 — remember the last level change so the adaptive rule can refuse to
  // demote twice in a row. Needs to persist across sessions, so it lives here
  // rather than in memory.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE game_progress ADD COLUMN last_direction TEXT;
    `);
  },
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (let i = version; i < MIGRATIONS.length; i++) {
    await MIGRATIONS[i](db);
    version = i + 1;
  }

  // PRAGMA will not accept a bound parameter, so it is interpolated. Safe here:
  // the value is a loop counter, never user input.
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

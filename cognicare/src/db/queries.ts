import type { SQLiteDatabase } from 'expo-sqlite';

import type { Assessment, GameProgress, GameSession, Player } from './types';

/* ---------------------------------- players --------------------------------- */

export async function listPlayers(db: SQLiteDatabase): Promise<Player[]> {
  return db.getAllAsync<Player>('SELECT * FROM players ORDER BY created_at DESC');
}

export async function getPlayer(db: SQLiteDatabase, id: number): Promise<Player | null> {
  return db.getFirstAsync<Player>('SELECT * FROM players WHERE id = ?', id);
}

export async function createPlayer(
  db: SQLiteDatabase,
  name: string,
  age: number | null
): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO players (name, age) VALUES (?, ?)',
    name.trim(),
    age
  );
  return res.lastInsertRowId;
}

export async function deletePlayer(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM players WHERE id = ?', id);
}

/* ------------------------------- game progress ------------------------------ */

export async function getProgress(
  db: SQLiteDatabase,
  playerId: number,
  gameId: string
): Promise<GameProgress> {
  const existing = await db.getFirstAsync<GameProgress>(
    'SELECT * FROM game_progress WHERE player_id = ? AND game_id = ?',
    playerId,
    gameId
  );
  if (existing) return existing;

  await db.runAsync(
    'INSERT INTO game_progress (player_id, game_id) VALUES (?, ?)',
    playerId,
    gameId
  );
  return {
    player_id: playerId,
    game_id: gameId,
    current_level: 1,
    best_score: 0,
    total_plays: 0,
    last_played_at: null,
    last_direction: null,
  };
}

export async function updateProgress(
  db: SQLiteDatabase,
  playerId: number,
  gameId: string,
  next: { level: number; direction: string; score: number }
): Promise<void> {
  await db.runAsync(
    `UPDATE game_progress
        SET current_level  = ?,
            last_direction = ?,
            best_score     = MAX(best_score, ?),
            total_plays    = total_plays + 1,
            last_played_at = datetime('now')
      WHERE player_id = ? AND game_id = ?`,
    next.level,
    next.direction,
    next.score,
    playerId,
    gameId
  );
}

export async function listProgress(
  db: SQLiteDatabase,
  playerId: number
): Promise<GameProgress[]> {
  return db.getAllAsync<GameProgress>(
    'SELECT * FROM game_progress WHERE player_id = ?',
    playerId
  );
}

/* --------------------------------- sessions --------------------------------- */

export async function startSession(
  db: SQLiteDatabase,
  playerId: number,
  gameId: string,
  levelStart: number
): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO game_sessions (player_id, game_id, level_start) VALUES (?, ?, ?)',
    playerId,
    gameId,
    levelStart
  );
  return res.lastInsertRowId;
}

export async function saveRound(
  db: SQLiteDatabase,
  sessionId: number,
  round: {
    roundNo: number;
    level: number;
    hits: number;
    misses: number;
    falseAlarms: number;
    accuracy: number;
    avgReactionMs: number | null;
  }
): Promise<void> {
  await db.runAsync(
    `INSERT INTO game_rounds
       (session_id, round_no, level, hits, misses, false_alarms, accuracy, avg_reaction_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    sessionId,
    round.roundNo,
    round.level,
    round.hits,
    round.misses,
    round.falseAlarms,
    round.accuracy,
    round.avgReactionMs
  );
}

export async function endSession(
  db: SQLiteDatabase,
  sessionId: number,
  summary: {
    levelEnd: number;
    accuracy: number;
    score: number;
    avgReactionMs: number | null;
  }
): Promise<void> {
  await db.runAsync(
    `UPDATE game_sessions
        SET ended_at = datetime('now'),
            level_end = ?,
            accuracy = ?,
            score = ?,
            avg_reaction_ms = ?
      WHERE id = ?`,
    summary.levelEnd,
    summary.accuracy,
    summary.score,
    summary.avgReactionMs,
    sessionId
  );
}

export async function recentSessions(
  db: SQLiteDatabase,
  playerId: number,
  limit = 30
): Promise<GameSession[]> {
  return db.getAllAsync<GameSession>(
    `SELECT * FROM game_sessions
      WHERE player_id = ? AND ended_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT ?`,
    playerId,
    limit
  );
}

/* ------------------------------- assessments -------------------------------- */

export async function saveAssessment(
  db: SQLiteDatabase,
  playerId: number,
  answers: Record<number, number>,
  score: {
    total: number;
    band: string;
    domains: { attention: number; stm: number; ltm: number; speed: number; adl: number };
  },
  items: { no: number; domain: string }[]
): Promise<number> {
  let id = 0;

  // The header and its 25 answers must land together — a half-written
  // assessment would score wrongly and silently forever after.
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO assessments
         (player_id, total_score, band, attention, stm, ltm, speed, adl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      playerId,
      score.total,
      score.band,
      score.domains.attention,
      score.domains.stm,
      score.domains.ltm,
      score.domains.speed,
      score.domains.adl
    );
    id = res.lastInsertRowId;

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO assessment_answers (assessment_id, item_no, domain, value) VALUES (?, ?, ?, ?)',
        id,
        item.no,
        item.domain,
        answers[item.no] ?? 0
      );
    }
  });

  return id;
}

export async function latestAssessment(
  db: SQLiteDatabase,
  playerId: number
): Promise<Assessment | null> {
  return db.getFirstAsync<Assessment>(
    'SELECT * FROM assessments WHERE player_id = ? ORDER BY taken_at DESC, id DESC LIMIT 1',
    playerId
  );
}

export async function assessmentHistory(
  db: SQLiteDatabase,
  playerId: number,
  limit = 12
): Promise<Assessment[]> {
  return db.getAllAsync<Assessment>(
    'SELECT * FROM assessments WHERE player_id = ? ORDER BY taken_at DESC, id DESC LIMIT ?',
    playerId,
    limit
  );
}

/* --------------------------------- settings --------------------------------- */

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Dashboard reads. Every query filters on `ended_at IS NOT NULL` — a session
 * the player quit half way through is not data, and counting it would drag
 * their accuracy down for having answered a phone call.
 */

export type GameSummary = {
  game_id: string;
  plays: number;
  mean_accuracy: number;
  best_score: number;
  current_level: number;
  last_played_at: string | null;
};

export type TodayStats = {
  sessionsToday: number;
  sessionsThisWeek: number;
  streak: number;
};

export async function todayStats(db: SQLiteDatabase, playerId: number): Promise<TodayStats> {
  const today = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM game_sessions
      WHERE player_id = ? AND ended_at IS NOT NULL AND date(started_at) = date('now','localtime')`,
    playerId
  );

  const week = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM game_sessions
      WHERE player_id = ? AND ended_at IS NOT NULL
        AND date(started_at) >= date('now','localtime','-6 days')`,
    playerId
  );

  const days = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(started_at,'localtime') AS day
       FROM game_sessions
      WHERE player_id = ? AND ended_at IS NOT NULL
      ORDER BY day DESC
      LIMIT 400`,
    playerId
  );

  return {
    sessionsToday: today?.n ?? 0,
    sessionsThisWeek: week?.n ?? 0,
    streak: countStreak(days.map((d) => d.day)),
  };
}

/**
 * Consecutive days ending today or yesterday. Yesterday still counts so the
 * streak does not appear broken simply because today's session has not
 * happened yet — losing a streak at breakfast is a reason to give up.
 */
export function countStreak(daysDesc: string[], today = new Date()): number {
  if (daysDesc.length === 0) return 0;

  const asDate = (s: string) => new Date(`${s}T00:00:00`);
  const dayMs = 86_400_000;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const gapFromToday = Math.round((start.getTime() - asDate(daysDesc[0]).getTime()) / dayMs);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < daysDesc.length; i++) {
    const gap = Math.round(
      (asDate(daysDesc[i - 1]).getTime() - asDate(daysDesc[i]).getTime()) / dayMs
    );
    if (gap !== 1) break;
    streak++;
  }
  return streak;
}

export async function gameSummaries(
  db: SQLiteDatabase,
  playerId: number
): Promise<GameSummary[]> {
  return db.getAllAsync<GameSummary>(
    `SELECT p.game_id,
            p.current_level,
            p.best_score,
            p.last_played_at,
            COUNT(s.id)                       AS plays,
            COALESCE(AVG(s.accuracy), 0)      AS mean_accuracy
       FROM game_progress p
       LEFT JOIN game_sessions s
         ON s.player_id = p.player_id
        AND s.game_id   = p.game_id
        AND s.ended_at IS NOT NULL
      WHERE p.player_id = ?
      GROUP BY p.game_id
      ORDER BY p.last_played_at DESC`,
    playerId
  );
}

/** Oldest → newest, so it can be drawn left to right without reversing. */
export async function accuracyTrend(
  db: SQLiteDatabase,
  playerId: number,
  gameId: string,
  limit = 10
): Promise<number[]> {
  const rows = await db.getAllAsync<{ accuracy: number }>(
    `SELECT accuracy FROM (
        SELECT accuracy, started_at
          FROM game_sessions
         WHERE player_id = ? AND game_id = ? AND ended_at IS NOT NULL AND accuracy IS NOT NULL
         ORDER BY started_at DESC
         LIMIT ?
     ) ORDER BY started_at ASC`,
    playerId,
    gameId,
    limit
  );
  return rows.map((r) => r.accuracy);
}

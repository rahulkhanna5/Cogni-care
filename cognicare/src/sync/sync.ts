import type { SQLiteDatabase } from 'expo-sqlite';

import * as api from '@/api/patients.api';

/** Loose row shape — these queries read columns the typed helpers do not cover. */
type Row = Record<string, unknown>;

/**
 * Pushes anything played offline up to the server.
 *
 * Deliberately one-directional and device-first: a row is written to SQLite
 * when it happens and uploaded afterwards. Play therefore never waits on a
 * network, and a session finished on a train is not lost. `synced_at` is set
 * only after the server confirms, so a failed upload is simply retried next
 * time rather than silently dropped.
 *
 * No attempt is made to pull server data back down. The device is the only
 * writer of a patient's own results, so there is nothing to reconcile and no
 * merge conflict to get wrong.
 */

export type SyncResult = {
  sessions: number;
  assessments: number;
  failed: number;
};

const iso = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toISOString();

export async function pushPending(
  db: SQLiteDatabase,
  playerId: number,
  patientId: string,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = { sessions: 0, assessments: 0, failed: 0 };

  /* --------------------------- completed sessions --------------------------- */

  const sessions = await db.getAllAsync<Row>(
    `SELECT * FROM game_sessions
      WHERE player_id = ? AND ended_at IS NOT NULL AND synced_at IS NULL
      ORDER BY started_at
      LIMIT 50`,
    playerId
  );

  for (const session of sessions) {
    try {
      const rounds = await db.getAllAsync<Row>(
        'SELECT * FROM game_rounds WHERE session_id = ? ORDER BY round_no',
        session.id as number
      );

      await api.uploadSession(accessToken, patientId, {
        gameId: session.game_id as string,
        startedAt: iso(session.started_at as string),
        endedAt: iso(session.ended_at as string),
        levelStart: session.level_start as number,
        levelEnd: (session.level_end as number) ?? (session.level_start as number),
        accuracy: (session.accuracy as number) ?? 0,
        score: (session.score as number) ?? 0,
        avgReactionMs: (session.avg_reaction_ms as number) ?? null,
        rounds: rounds.map((r) => ({
          roundNo: r.round_no as number,
          level: r.level as number,
          hits: r.hits as number,
          misses: r.misses as number,
          falseAlarms: r.false_alarms as number,
          accuracy: r.accuracy as number,
          avgReactionMs: (r.avg_reaction_ms as number) ?? null,
        })),
      });

      await db.runAsync(`UPDATE game_sessions SET synced_at = datetime('now') WHERE id = ?`, [
        session.id as number,
      ]);
      result.sessions += 1;
    } catch {
      // Leave synced_at NULL and move on — the next run retries it.
      result.failed += 1;
    }
  }

  /* ------------------------------- assessments ------------------------------ */

  const assessments = await db.getAllAsync<Row>(
    `SELECT * FROM assessments WHERE player_id = ? AND synced_at IS NULL ORDER BY taken_at LIMIT 20`,
    playerId
  );

  for (const assessment of assessments) {
    try {
      const answers = await db.getAllAsync<Row>(
        'SELECT item_no, domain, value FROM assessment_answers WHERE assessment_id = ? ORDER BY item_no',
        assessment.id as number
      );

      await api.uploadAssessment(accessToken, patientId, {
        takenAt: iso(assessment.taken_at as string),
        totalScore: assessment.total_score as number,
        band: assessment.band as 'normal' | 'mild' | 'moderate' | 'severe',
        domains: {
          attention: assessment.attention as number,
          stm: assessment.stm as number,
          ltm: assessment.ltm as number,
          speed: assessment.speed as number,
          adl: assessment.adl as number,
        },
        answers: answers.map((a) => ({
          itemNo: a.item_no as number,
          domain: a.domain as string,
          value: a.value as number,
        })),
      });

      await db.runAsync(`UPDATE assessments SET synced_at = datetime('now') WHERE id = ?`, [
        assessment.id as number,
      ]);
      result.assessments += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

export async function pendingCount(db: SQLiteDatabase, playerId: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM game_sessions
         WHERE player_id = ? AND ended_at IS NOT NULL AND synced_at IS NULL)
     + (SELECT COUNT(*) FROM assessments WHERE player_id = ? AND synced_at IS NULL) AS n`,
    playerId,
    playerId
  );
  return row?.n ?? 0;
}

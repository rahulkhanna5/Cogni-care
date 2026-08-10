import { query } from '../db/pool.js';
import type { UserRole } from '../types.js';

export type AccessLogEntry = {
  actorId: string | null;
  actorRole: UserRole | null;
  patientId: string | null;
  assignmentId: string | null;
  action: string;
  method?: string | null;
  route?: string | null;
  allowed: boolean;
  reason: string;
  ip?: string | null;
};

/**
 * Records every decision about patient data — denials included. Denials are
 * the more interesting half: repeated NO_ACTIVE_ASSIGNMENT from one account
 * is what probing looks like.
 *
 * Never throws. A failure to write the audit row must not turn a legitimate
 * request into an error, but it must be loud in the logs.
 */
export async function logAccess(entry: AccessLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO access_log
         (actor_id, actor_role, patient_id, assignment_id, action, method, route, allowed, reason, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        entry.actorId,
        entry.actorRole,
        entry.patientId,
        entry.assignmentId,
        entry.action,
        entry.method ?? null,
        entry.route ?? null,
        entry.allowed,
        entry.reason,
        entry.ip ?? null,
      ]
    );
  } catch (error) {
    console.error('[audit] failed to write access_log entry', { entry, error });
  }
}

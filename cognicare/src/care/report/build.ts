import type { AdminDoctorDetail } from '@/api/admin.api';
import type { PatientSummary, ServerAssessment, ServerRound, ServerSession } from '@/api/doctor.api';
import { getGame } from '@/games/registry';
import { levelRows, stuckLine } from './levels';

/**
 * Report contents, as plain strings. Pure: no files, no platform — so the
 * exact rows a doctor or admin takes away are tested. ./share.ts saves them.
 */

const title = (id: string) => getGame(id)?.title ?? id;
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const pc = (v: number | null | undefined) => (v == null ? '' : String(Math.round(v * 100)));

/** RFC 4180: quote a field that holds a comma, quote or line break. */
export function csv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? '' : String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\r\n');
}

export type PatientData = {
  patient: PatientSummary;
  sessions: ServerSession[];
  rounds: ServerRound[];
  assessments: ServerAssessment[];
};

/** Every check-in and every round, one row each, oldest first. */
export function patientCsv({ patient, rounds, assessments }: PatientData): string {
  const head = [
    'member',
    'email',
    'date',
    'type',
    'game',
    'level',
    'round',
    'hits',
    'misses',
    'false_alarms',
    'accuracy_pct',
    'reaction_ms',
    'checkin_score',
    'checkin_band',
  ];
  const rows: { at: string; row: (string | number | null)[] }[] = [
    ...assessments.map((a) => ({
      at: a.taken_at,
      row: [
        patient.name,
        patient.email,
        day(a.taken_at),
        'check-in',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        a.total_score,
        a.band,
      ],
    })),
    ...rounds.map((r) => ({
      at: r.started_at,
      row: [
        patient.name,
        patient.email,
        day(r.started_at),
        'round',
        title(r.game_id),
        r.level,
        r.round_no,
        r.hits,
        r.misses,
        r.false_alarms,
        pc(r.accuracy),
        r.avg_reaction_ms,
        '',
        '',
      ],
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return csv([head, ...rows.map((r) => r.row)]);
}

/** One row per connected patient, with how they are doing. */
export function doctorCsv({ doctor, patients }: AdminDoctorDetail): string {
  const head = [
    'doctor',
    'member',
    'member_email',
    'status',
    'requested',
    'admin_approved',
    'doctor_accepted',
    'ended',
    'sessions',
    'last_played',
    'accuracy_30d_pct',
    'latest_checkin_score',
    'latest_checkin_band',
    'remarks',
  ];
  return csv([
    head,
    ...patients.map((p) => [
      doctor.name,
      p.patient_name,
      p.patient_email,
      p.status,
      day(p.requested_at),
      day(p.approved_at),
      day(p.doctor_accepted_at),
      day(p.revoked_at),
      p.sessions,
      day(p.last_played_at),
      pc(p.accuracy_30d),
      p.latest_score,
      p.latest_band,
      p.remarks,
    ]),
  ]);
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const table = (head: string[], rows: unknown[][]) =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

const PAGE = `<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#172033;margin:28px;font-size:12px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 8px;color:#1D4ED8}
  .muted{color:#475569} table{border-collapse:collapse;width:100%;margin-top:4px}
  th,td{border:1px solid #CBD5E1;padding:4px 6px;text-align:left} th{background:#EFF6FF}
  li{margin:3px 0} .note{margin-top:24px;color:#475569;font-size:11px}
</style>`;

/** A dated, printable report for one patient. */
export function patientReportHtml({ patient, sessions, rounds, assessments }: PatientData, now = new Date()): string {
  const levels = levelRows(rounds);
  const stuck = levels.filter((l) => l.stuck);
  const byGame = new Map<string, ServerSession[]>();
  for (const s of sessions) byGame.set(s.game_id, [...(byGame.get(s.game_id) ?? []), s]);

  return `<html><head><meta charset="utf-8">${PAGE}</head><body>
  <h1>${esc(patient.name)}</h1>
  <div class="muted">${esc(patient.email)} · CogniCare report generated ${esc(day(now.toISOString()))}</div>

  <h2>Where they get stuck</h2>
  ${
    stuck.length
      ? `<ul>${stuck.map((l) => `<li>${esc(stuckLine(l, title(l.gameId)))}</li>`).join('')}</ul>`
      : '<p class="muted">No level has had two or more hard rounds.</p>'
  }

  <h2>Check-ins (higher = more difficulty)</h2>
  ${
    assessments.length
      ? table(
          ['Date', 'Score /100', 'Band', 'Attention', 'Short-term', 'Long-term', 'Speed', 'Daily living'],
          assessments.map((a) => [day(a.taken_at), a.total_score, a.band, a.attention, a.stm, a.ltm, a.speed, a.adl])
        )
      : '<p class="muted">No check-ins.</p>'
  }

  <h2>Games (higher = better)</h2>
  ${table(
    ['Game', 'Sessions', 'Current level', 'Average % right', 'First played', 'Last played'],
    [...byGame.entries()].map(([g, ss]) => {
      const sorted = [...ss].sort((a, b) => a.started_at.localeCompare(b.started_at));
      const last = sorted[sorted.length - 1]!;
      const acc = ss.map((s) => s.accuracy ?? 0);
      return [
        title(g),
        ss.length,
        last.level_end ?? last.level_start,
        pc(acc.reduce((a, b) => a + b, 0) / acc.length),
        day(sorted[0]!.started_at),
        day(last.started_at),
      ];
    })
  )}

  <h2>Level by level</h2>
  ${table(
    ['Game', 'Level', 'Rounds', '% right', 'Missed', 'Wrong taps', 'Hard rounds', 'First', 'Last'],
    levels.map((l) => [
      title(l.gameId),
      l.level,
      l.rounds,
      pc(l.accuracy),
      l.misses,
      l.falseAlarms,
      `${l.hardRounds}${l.stuck ? ' (stuck)' : ''}`,
      day(l.firstAt),
      day(l.lastAt),
    ])
  )}

  <h2>Sessions</h2>
  ${table(
    ['Date', 'Game', 'Level start', 'Level end', '% right', 'Score', 'Reaction ms'],
    [...sessions]
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .map((s) => [
        day(s.started_at),
        title(s.game_id),
        s.level_start,
        s.level_end,
        pc(s.accuracy),
        s.score,
        s.avg_reaction_ms,
      ])
  )}

  <p class="note">Practice and self-report data from a cognitive-training app. Not a diagnostic assessment.</p>
  </body></html>`;
}

/** A dated, printable report for one doctor and their patients. */
export function doctorReportHtml({ doctor, patients }: AdminDoctorDetail, now = new Date()): string {
  return `<html><head><meta charset="utf-8">${PAGE}</head><body>
  <h1>${esc(doctor.name)}</h1>
  <div class="muted">${esc(doctor.specialty ?? '')} · ${esc(doctor.email)} · registration ${esc(
    doctor.license_number ?? ''
  )} · ${doctor.approved_at ? `approved ${esc(day(doctor.approved_at))}` : 'not approved'}</div>
  <div class="muted">CogniCare report generated ${esc(day(now.toISOString()))}</div>

  <h2>Members (${patients.length})</h2>
  ${table(
    [
      'Member',
      'Status',
      'Requested',
      'Connected',
      'Sessions',
      'Last played',
      '% right (30 days)',
      'Latest check-in',
      'Notes',
    ],
    patients.map((p) => [
      p.patient_name,
      p.status,
      day(p.requested_at),
      day(p.doctor_accepted_at),
      p.sessions,
      day(p.last_played_at),
      pc(p.accuracy_30d),
      p.latest_score == null ? '' : `${p.latest_score} (${p.latest_band})`,
      p.remarks,
    ])
  )}
  <p class="note">Practice and self-report data from a cognitive-training app. Not a diagnostic assessment.</p>
  </body></html>`;
}

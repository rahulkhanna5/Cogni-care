import type { AdminDoctorDetail } from '@/api/admin.api';
import { connectionLabel } from '@/api/admin.api';
import type { ServerAssessment, ServerRound, ServerSession } from '@/api/doctor.api';
import { csv, doctorCsv, doctorReportHtml, patientCsv, patientReportHtml } from './build';
import { levelRows, stuckLine } from './levels';
import { fileName } from './share';

jest.mock('expo-print', () => ({}));
jest.mock('expo-sharing', () => ({}));

const round = (o: Partial<ServerRound>): ServerRound => ({
  game_id: 'blink-trail',
  started_at: '2026-10-01T10:00:00Z',
  round_no: 1,
  level: 3,
  hits: 4,
  misses: 0,
  false_alarms: 0,
  accuracy: 1,
  avg_reaction_ms: 700,
  ...o,
});

const patient = { id: 'p1', name: 'Asha, R', email: 'asha@x.com', created_at: '2026-09-01T00:00:00Z' };
const sessions: ServerSession[] = [
  {
    id: 's1',
    patient_id: 'p1',
    game_id: 'blink-trail',
    started_at: '2026-10-01T10:00:00Z',
    ended_at: '2026-10-01T10:05:00Z',
    level_start: 3,
    level_end: 3,
    accuracy: 0.5,
    score: 40,
    avg_reaction_ms: 700,
  },
];
const assessments: ServerAssessment[] = [
  {
    id: 'c1',
    patient_id: 'p1',
    taken_at: '2026-09-30T10:00:00Z',
    total_score: 48,
    band: 'moderate',
    attention: 10,
    stm: 10,
    ltm: 10,
    speed: 9,
    adl: 9,
  },
];

describe('where a patient gets stuck', () => {
  it('needs two hard rounds on a level; one bad round is a bad day', () => {
    const one = levelRows([round({ accuracy: 0.4, hits: 2, misses: 3 }), round({ round_no: 2 })]);
    expect(one[0]!.stuck).toBe(false);
    const two = levelRows([
      round({ accuracy: 0.4, hits: 2, misses: 3 }),
      round({ round_no: 2, accuracy: 0.5, hits: 2, misses: 2 }),
    ]);
    expect(two[0]).toMatchObject({ level: 3, rounds: 2, hardRounds: 2, stuck: true, misses: 5, falseAlarms: 0 });
  });

  it('counts more mistakes than hits as hard, even above 60%', () => {
    const rows = levelRows([
      round({ accuracy: 0.7, hits: 2, false_alarms: 3 }),
      round({ round_no: 2, accuracy: 0.7, hits: 2, false_alarms: 3 }),
    ]);
    expect(rows[0]!.stuck).toBe(true);
  });

  it('keeps games and levels apart, and names the kind of mistake', () => {
    const rows = levelRows([
      round({ level: 2 }),
      round({ level: 3, accuracy: 0.3, hits: 1, false_alarms: 5 }),
      round({ level: 3, round_no: 2, accuracy: 0.3, hits: 1, false_alarms: 5 }),
      round({ game_id: 'daily-order', level: 3 }),
    ]);
    expect(rows.map((r) => `${r.gameId}:${r.level}`)).toEqual(['blink-trail:2', 'blink-trail:3', 'daily-order:3']);
    expect(stuckLine(rows[1]!, 'Blink Trail')).toBe(
      'Blink Trail, level 3: 2 hard rounds of 2, 30% right — mostly wrong taps (holding back).'
    );
  });
});

describe('exports', () => {
  it('quotes commas, quotes and line breaks in CSV', () => {
    expect(csv([['a,b', 'say "hi"', 'x\ny', 3, null]])).toBe('"a,b","say ""hi""","x\ny",3,');
  });

  it('a member CSV has every check-in and round, dated, oldest first, misses and wrong taps apart', () => {
    const text = patientCsv({
      patient,
      sessions,
      assessments,
      rounds: [round({ misses: 2, false_alarms: 1, accuracy: 0.5 })],
    });
    const lines = text.split('\r\n');
    expect(lines[0]).toBe(
      'member,email,date,type,game,level,round,hits,misses,false_alarms,accuracy_pct,reaction_ms,checkin_score,checkin_band'
    );
    expect(lines[1]).toBe('"Asha, R",asha@x.com,2026-09-30,check-in,,,,,,,,,48,moderate');
    expect(lines[2]).toBe('"Asha, R",asha@x.com,2026-10-01,round,Blink Trail,3,1,4,2,1,50,700,,');
  });

  it('the member report is dated and lists stuck levels', () => {
    const html = patientReportHtml(
      {
        patient,
        sessions,
        assessments,
        rounds: [
          round({ accuracy: 0.4, hits: 1, misses: 4 }),
          round({ round_no: 2, accuracy: 0.4, hits: 1, misses: 4 }),
        ],
      },
      new Date('2026-10-13T12:00:00Z')
    );
    expect(html).toContain('generated 2026-10-13');
    expect(html).toContain('Blink Trail, level 3: 2 hard rounds of 2, 40% right — mostly missed items (attention).');
    expect(html).toContain('Asha, R');
    expect(html).toContain('Not a diagnostic assessment');
  });

  it('a specialist export has one row per member with the connection dates', () => {
    const data: AdminDoctorDetail = {
      doctor: {
        id: 'd1',
        name: 'Dr Rao',
        email: 'rao@x.com',
        created_at: '2026-09-01T00:00:00Z',
        approved_at: '2026-09-02T00:00:00Z',
        is_active: true,
        specialty: 'Neurology',
        license_number: 'N1',
        bio: null,
      },
      patients: [
        {
          assignment_id: 'a1',
          status: 'ACTIVE',
          requested_at: '2026-09-10T00:00:00Z',
          approved_at: '2026-09-11T00:00:00Z',
          doctor_accepted_at: '2026-09-12T00:00:00Z',
          revoked_at: null,
          revoke_reason: null,
          patient_id: 'p1',
          patient_name: 'Asha',
          patient_email: 'asha@x.com',
          sessions: 12,
          last_played_at: '2026-10-12T00:00:00Z',
          accuracy_30d: 0.81,
          latest_band: 'mild',
          latest_score: 30,
          remarks: 2,
        },
      ],
    };
    const lines = doctorCsv(data).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Dr Rao,Asha,asha@x.com,ACTIVE,2026-09-10,2026-09-11,2026-09-12,,12,2026-10-12,81,30,mild,2');
    expect(doctorReportHtml(data)).toContain('Members (1)');
  });

  it('names files by person and date', () => {
    expect(fileName('Dr Meera Rao', 'csv', new Date('2026-10-13T00:00:00Z'))).toBe(
      'cognicare-dr-meera-rao-2026-10-13.csv'
    );
  });
});

describe('connection wording', () => {
  it('says who the connection is waiting on', () => {
    expect(connectionLabel({ status: 'PENDING', doctor_accepted_at: null }).text).toBe('Waiting for you');
    expect(connectionLabel({ status: 'PENDING', doctor_accepted_at: 'x' }).text).toBe(
      'Specialist accepted · waiting for you'
    );
    expect(connectionLabel({ status: 'ACTIVE', doctor_accepted_at: null }).text).toBe('Waiting for the specialist');
    expect(connectionLabel({ status: 'ACTIVE', doctor_accepted_at: 'x' }).text).toBe('Connected');
    expect(connectionLabel({ status: 'REVOKED' }).text).toBe('Stopped');
  });
});

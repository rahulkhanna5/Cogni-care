import type { ServerAssessment, ServerSession } from '@/api/doctor.api';
import { bandTone, describeReason, needsLookFirst, statusLine, summarise } from './insight';

const NOW = new Date('2026-10-10T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const session = (daysBack: number, accuracy: number, gameId = 'blink-trail'): ServerSession => ({
  id: `${gameId}-${daysBack}`,
  patient_id: 'p',
  game_id: gameId,
  started_at: day(daysBack),
  ended_at: day(daysBack),
  level_start: 2,
  level_end: 3,
  accuracy,
  score: 50,
  avg_reaction_ms: 900,
});

const checkIn = (daysBack: number, total: number, band: ServerAssessment['band']): ServerAssessment => ({
  id: `c-${daysBack}`,
  patient_id: 'p',
  taken_at: day(daysBack),
  total_score: total,
  band,
  attention: 5,
  stm: 5,
  ltm: 5,
  speed: 5,
  adl: 5,
});

describe('summarise', () => {
  it('a member who plays regularly and is steady needs no attention', () => {
    const sessions = [1, 2, 4, 6, 9, 12, 15, 18].map((d) => session(d, 0.8));
    const i = summarise(sessions, [checkIn(5, 30, 'mild'), checkIn(40, 31, 'mild')], NOW);
    expect(i.attention).toEqual([]);
    expect(i.activeDaysLast7).toBe(4);
    expect(i.daysSincePlay).toBe(1);
    expect(i.checkInChange).toBe(-1);
  });

  it('flags a lapse once nothing has been played for a week', () => {
    const i = summarise([session(9, 0.8), session(12, 0.8)], [], NOW);
    expect(i.attention).toEqual([{ kind: 'lapsed', days: 9 }]);
    expect(statusLine(i)).toBe('Last played 9 days ago.');
  });

  it('flags someone who has shared nothing', () => {
    const i = summarise([], [], NOW);
    expect(i.attention).toEqual([{ kind: 'never-played' }]);
    expect(statusLine(i)).toBe('No results shared yet.');
  });

  it('a check-in that got 6 points worse, and changed band, is two reasons', () => {
    const i = summarise([session(1, 0.8)], [checkIn(2, 42, 'moderate'), checkIn(30, 36, 'mild')], NOW);
    expect(i.checkInChange).toBe(6);
    expect(i.attention).toEqual([
      { kind: 'checkin-worse', by: 6 },
      { kind: 'band-worse', to: 'moderate' },
    ]);
  });

  it('a small check-in wobble is not a reason', () => {
    const i = summarise([session(1, 0.8)], [checkIn(2, 33, 'mild'), checkIn(30, 31, 'mild')], NOW);
    expect(i.attention).toEqual([]);
  });

  it('picks the game that fell furthest, comparing the last 3 sessions with the 5 before', () => {
    const earlier = [10, 11, 12, 13, 14].map((d) => session(d, 0.9, 'blink-trail'));
    const recent = [1, 2, 3].map((d) => session(d, 0.6, 'blink-trail'));
    const steady = [1, 2, 3, 10, 11, 12].map((d) => session(d, 0.8, 'market-rush'));
    const i = summarise([...earlier, ...recent, ...steady], [], NOW);
    expect(i.attention).toEqual([{ kind: 'accuracy-drop', gameId: 'blink-trail', points: 30 }]);
    expect(describeReason(i.attention[0]!)).toBe('Blink Trail accuracy down 30 points');
  });

  it('needs enough history before calling a drop: three sessions is not a trend', () => {
    const i = summarise(
      [1, 2, 3].map((d) => session(d, 0.4)),
      [],
      NOW
    );
    expect(i.attention).toEqual([]);
  });
});

describe('statusLine', () => {
  it('reads as plain sentences, check-in direction spelt out', () => {
    const sessions = [1, 2, 3, 4].map((d) => session(d, 0.8));
    const i = summarise(sessions, [checkIn(2, 24, 'mild'), checkIn(30, 30, 'mild')], NOW);
    expect(statusLine(i)).toBe(
      'Played on 4 of the last 7 days. Latest check-in: mild, 6 points better than the last one.'
    );
  });
});

describe('ordering and colour', () => {
  it('puts members with something to look at first, then by name', () => {
    const quiet = summarise(
      [1, 2].map((d) => session(d, 0.8)),
      [],
      NOW
    );
    const lapsed = summarise([session(20, 0.8)], [], NOW);
    const rows = needsLookFirst([
      { name: 'Asha', insight: quiet },
      { name: 'Zoya', insight: lapsed },
      { name: 'Bina', insight: quiet },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Zoya', 'Asha', 'Bina']);
  });

  it('a normal band reads good and only severe reads as danger', () => {
    expect(bandTone('normal')).toBe('success');
    expect(bandTone('mild')).toBe('warning');
    expect(bandTone('moderate')).toBe('warning');
    expect(bandTone('severe')).toBe('danger');
  });
});

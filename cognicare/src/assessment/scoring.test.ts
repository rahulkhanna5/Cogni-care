import { QUESTIONS, TOTAL_QUESTIONS } from './questions';
import {
  bandFor,
  firstUnanswered,
  isComplete,
  MAX_TOTAL,
  scoreAssessment,
  type Answers,
} from './scoring';

const answerAll = (value: number): Answers =>
  Object.fromEntries(QUESTIONS.map((q) => [q.no, value]));

describe('questionnaire shape', () => {
  it('has exactly 25 items', () => {
    expect(TOTAL_QUESTIONS).toBe(25);
    expect(MAX_TOTAL).toBe(100);
  });

  it('has exactly 5 items in each of the 5 domains', () => {
    const counts = QUESTIONS.reduce<Record<string, number>>((acc, q) => {
      acc[q.domain] = (acc[q.domain] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ attention: 5, stm: 5, ltm: 5, speed: 5, adl: 5 });
  });

  it('numbers items 1..25 with no gaps or duplicates', () => {
    expect(QUESTIONS.map((q) => q.no)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1)
    );
  });
});

describe('scoreAssessment', () => {
  it('scores all-Never as 0 and all-Always as 100', () => {
    expect(scoreAssessment(answerAll(0)).total).toBe(0);
    expect(scoreAssessment(answerAll(4)).total).toBe(100);
  });

  it('caps every domain at 20', () => {
    const { domains } = scoreAssessment(answerAll(4));
    expect(domains).toEqual({ attention: 20, stm: 20, ltm: 20, speed: 20, adl: 20 });
  });

  it('attributes each answer to the right domain', () => {
    // Only the five ADL items answered, at 3 each.
    const answers: Answers = {};
    for (const q of QUESTIONS) if (q.domain === 'adl') answers[q.no] = 3;

    const { total, domains } = scoreAssessment(answers);
    expect(total).toBe(15);
    expect(domains.adl).toBe(15);
    expect(domains.attention).toBe(0);
  });

  it('ignores unanswered items rather than treating them as zero-scored', () => {
    const partial: Answers = { 1: 4, 2: 4 };
    expect(scoreAssessment(partial).total).toBe(8);
    expect(isComplete(partial)).toBe(false);
  });
});

describe('bands', () => {
  it('maps the document boundaries exactly', () => {
    expect(bandFor(0)).toBe('normal');
    expect(bandFor(20)).toBe('normal');
    expect(bandFor(21)).toBe('mild');
    expect(bandFor(40)).toBe('mild');
    expect(bandFor(41)).toBe('moderate');
    expect(bandFor(70)).toBe('moderate');
    expect(bandFor(71)).toBe('severe');
    expect(bandFor(100)).toBe('severe');
  });

  it('leaves no score in 0..100 without a band', () => {
    for (let n = 0; n <= 100; n++) {
      expect(['normal', 'mild', 'moderate', 'severe']).toContain(bandFor(n));
    }
  });
});

describe('resuming', () => {
  it('returns the first gap, not the highest answered item', () => {
    expect(firstUnanswered({ 1: 0, 2: 0, 4: 0 })).toBe(3);
  });

  it('returns question 1 for a fresh check-in', () => {
    expect(firstUnanswered({})).toBe(1);
  });

  it('returns the last question once everything is answered', () => {
    expect(firstUnanswered(answerAll(2))).toBe(25);
  });
});

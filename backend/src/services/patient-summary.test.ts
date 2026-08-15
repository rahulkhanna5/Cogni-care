import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderSummary, type PatientSummary } from './patient-summary.service.js';

const empty: PatientSummary = { name: 'Asha Patel', games: [], checkIns: [], totalSessions: 0 };

const withData: PatientSummary = {
  name: 'Asha Patel',
  totalSessions: 3,
  games: [
    {
      gameId: 'blink-trail',
      plays: 3,
      level: 4,
      meanAccuracy: 0.82,
      recentAccuracy: [0.7, 0.8, 0.95],
      meanReactionMs: 1240,
      totalMisses: 5,
      totalFalseAlarms: 11,
      lastPlayed: '2026-08-10T09:30:00.000Z',
    },
  ],
  checkIns: [
    {
      takenAt: '2026-08-11T08:00:00.000Z',
      totalScore: 42,
      band: 'mild',
      attention: 9,
      stm: 11,
      ltm: 7,
      speed: 8,
      adl: 7,
    },
  ],
};

test('says plainly when there is no data, rather than leaving a blank section', () => {
  const out = renderSummary(empty);
  assert.match(out, /No completed game sessions on record\./);
  assert.match(out, /No check-in submitted\./);
});

test('keeps misses and false alarms as separate figures', () => {
  const out = renderSummary(withData);
  assert.match(out, /misses: 5, false alarms: 11/);
  // The two must never be presented as one total — 16 would erase the
  // distinction between an attention lapse and an inhibition failure.
  assert.doesNotMatch(out, /16/);
});

test('states which direction the check-in scale runs', () => {
  // Without this the model reads 42/100 as a poor score when it is a good one.
  assert.match(renderSummary(withData), /LOWER IS BETTER/);
});

test('names games that were never played', () => {
  const out = renderSummary(withData);
  assert.match(out, /NEVER PLAYED:/);
  assert.match(out, /Daily Order/);
  // The one game that WAS played must not appear in that list.
  const neverLine = out.split('\n').find((l) => l.startsWith('NEVER PLAYED:'))!;
  assert.doesNotMatch(neverLine, /Blink Trail/);
});

test('includes the accuracy trend so change over time is visible', () => {
  assert.match(renderSummary(withData), /70%, 80%, 95%/);
});

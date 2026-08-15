import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitDraft } from './remarks.service.js';

test('splits observations from the training plan', () => {
  const { body, plan } = splitDraft(
    'OBSERVATIONS:\n- Accuracy rose to 95%.\n\nTRAINING PLAN:\n- Play Daily Order twice.'
  );
  assert.equal(body, '- Accuracy rose to 95%.');
  assert.equal(plan, '- Play Daily Order twice.');
});

test('tolerates markdown headings around the markers', () => {
  const { body, plan } = splitDraft(
    '## OBSERVATIONS\n- Steady.\n\n**TRAINING PLAN**\n- Keep going.'
  );
  assert.equal(body, '- Steady.');
  assert.equal(plan, '- Keep going.');
});

test('keeps everything as observations when the plan heading is missing', () => {
  // A model that ignores the format must not cost us half the note.
  const { body, plan } = splitDraft('- Accuracy rose to 95%.\n- Reaction time steady.');
  assert.match(body, /Accuracy rose to 95%/);
  assert.match(body, /Reaction time steady/);
  assert.equal(plan, '');
});

test('does not split on the phrase appearing mid-sentence', () => {
  // Only a heading on its own line is a delimiter; a mention inside prose is not.
  const { body, plan } = splitDraft('- Discuss the training plan: at the next visit.');
  assert.equal(plan, '');
  assert.match(body, /training plan/);
});

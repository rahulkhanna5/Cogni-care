import { complete, SAFETY_RULES, type ChatMessage } from './llm.service.js';
import { renderSummary, type PatientSummary } from './patient-summary.service.js';

/**
 * The two things the model is asked to do, and the audience for each.
 *
 * A doctor reading a draft and a patient asking about their own results need
 * different registers, so the difference lives in the prompt rather than in a
 * post-processing step that tries to soften clinical wording after the fact.
 */

export type DraftedRemark = { body: string; plan: string; raw: string; model: string };

/**
 * Splits the model's answer on the two headings it was told to use.
 *
 * Exported for tests. Models drift on formatting, so a missed heading must
 * degrade to "everything is observations" rather than throwing away half the
 * answer — a silently truncated clinical note is the worst outcome here.
 */
export function splitDraft(raw: string): { body: string; plan: string } {
  const marker = /^\s*#{0,3}\s*(?:\*\*)?\s*TRAINING PLAN\s*(?:\*\*)?\s*:?\s*$/im;
  const match = raw.match(marker);

  if (!match || match.index == null) {
    return { body: stripHeading(raw).trim(), plan: '' };
  }

  return {
    body: stripHeading(raw.slice(0, match.index)).trim(),
    plan: raw.slice(match.index + match[0].length).trim(),
  };
}

/** Drops a leading "OBSERVATIONS:" heading, which is scaffolding, not content. */
function stripHeading(text: string): string {
  return text.replace(/^\s*#{0,3}\s*(?:\*\*)?\s*OBSERVATIONS\s*(?:\*\*)?\s*:?\s*$/im, '');
}

export async function draftRemark(summary: PatientSummary): Promise<DraftedRemark> {
  const messages: ChatMessage[] = [
    { role: 'system', content: `${SAFETY_RULES}\n\n${DRAFT_INSTRUCTIONS}` },
    {
      role: 'user',
      content:
        `Here is the data on record. Write the note from this and nothing else.\n\n` +
        renderSummary(summary),
    },
  ];

  const { text, model } = await complete(messages, { maxTokens: 800, temperature: 0.3 });
  return { ...splitDraft(text), raw: text, model };
}

const DRAFT_INSTRUCTIONS = `
You are drafting a note FOR A DOCTOR to review. The doctor will edit it before
it is saved, so be useful and specific rather than cautious and vague — but
never step outside the limits above.

Reply in exactly this shape, using these two headings and nothing else:

OBSERVATIONS:
Three to five short bullet points on how this person is doing. Quote real
numbers. Call out anything that changed, anything that stands out, and say
which of misses or false alarms is driving a low score where that is clear.
If a game has never been played, do not comment on ability in it.

TRAINING PLAN:
Three to four short bullet points: which exercises to prioritise this week,
roughly how often, and what to watch for next time. This is exercise practice
only — no medication, no treatment, no diagnosis.

Keep the whole thing under 250 words. No preamble, no sign-off.
`.trim();

/* ---------------------------------- chat ---------------------------------- */

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function answerChat(
  summary: PatientSummary,
  history: ChatTurn[],
  audience: 'DOCTOR' | 'PATIENT'
): Promise<string> {
  const persona =
    audience === 'DOCTOR'
      ? `You are answering a clinician's questions about this patient's practice
data. Be concise and specific. It is fine to use terms like "false alarms" and
"inhibition" — they will be understood.`
      : `You are answering the person's questions about THEIR OWN practice
results. Address them as "you". Be warm, plain, and encouraging without
overpromising. Avoid clinical jargon; if you must use a term, explain it in
the same sentence. Never speculate about their health — if they ask whether
their memory is getting worse, tell them that is a question for their doctor,
and point them at what the practice data does and does not show.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        `${SAFETY_RULES}\n\n${persona}\n\n` +
        `Answer only from the data below. If it does not contain the answer, ` +
        `say so plainly. Keep answers under 150 words.\n\n` +
        renderSummary(summary),
    },
    // Trimmed to the last few turns: the summary is the expensive part of the
    // prompt and a long backscroll would crowd it out on a small free model.
    ...history.slice(-8),
  ];

  // 150 words of prose fits well under this, but a multi-domain comparison in
  // list form spends real tokens on markdown syntax — 400 was measured
  // cutting a legitimate five-domain answer off mid-sentence.
  const { text } = await complete(messages, { maxTokens: 550, temperature: 0.4 });
  return text;
}

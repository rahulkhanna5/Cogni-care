import type { Domain } from '@/db/types';

export type Question = {
  /** 1..25, stable — this is what gets written to assessment_answers. */
  no: number;
  domain: Domain;
  text: string;
};

/**
 * The 25 items exactly as written in Questionnare.docx, in document order.
 *
 * Do not reword these. The wording is the instrument; changing it silently
 * changes what is being measured and makes past scores incomparable. If an
 * item genuinely needs to change, add a new item number and version the
 * instrument rather than editing in place.
 *
 * The .pptx copy carries a 6th ADL item ("manage household activities") that
 * the .docx does not. The .docx is the scoring authority — it is the one with
 * the totals and bands, and it is internally consistent at 25 items and
 * 5 x 20 domains. That item is deliberately absent.
 */
export const QUESTIONS: Question[] = [
  // Attention & Concentration
  { no: 1, domain: 'attention', text: 'I have difficulty maintaining attention on a task for several minutes.' },
  { no: 2, domain: 'attention', text: 'I am easily distracted by sounds or activities around me.' },
  { no: 3, domain: 'attention', text: 'I lose focus while reading or watching television.' },
  { no: 4, domain: 'attention', text: 'I find it difficult to follow conversations, especially in a group.' },
  { no: 5, domain: 'attention', text: 'I need information to be repeated because I miss parts of it.' },

  // Short-Term Memory
  { no: 6, domain: 'stm', text: 'I forget what I was about to do a few moments earlier.' },
  { no: 7, domain: 'stm', text: 'I misplace commonly used objects such as keys, phone, or glasses.' },
  { no: 8, domain: 'stm', text: 'I forget instructions that were given to me recently.' },
  { no: 9, domain: 'stm', text: 'I forget recent conversations or events.' },
  { no: 10, domain: 'stm', text: 'I need reminders for things I was told earlier the same day.' },

  // Long-Term Memory
  { no: 11, domain: 'ltm', text: 'I have difficulty recalling events from my past.' },
  { no: 12, domain: 'ltm', text: 'I forget the names of people I have known for a long time.' },
  { no: 13, domain: 'ltm', text: 'I forget important dates such as birthdays or anniversaries.' },
  { no: 14, domain: 'ltm', text: 'I have difficulty remembering information learned long ago.' },
  { no: 15, domain: 'ltm', text: 'I find it difficult to clearly recall past experiences.' },

  // Processing Speed
  { no: 16, domain: 'speed', text: 'I take longer than before to understand instructions.' },
  { no: 17, domain: 'speed', text: 'I need more time to think before responding to questions.' },
  { no: 18, domain: 'speed', text: 'I feel mentally slower while performing simple tasks.' },
  { no: 19, domain: 'speed', text: 'I take longer to complete daily activities than I used to.' },
  { no: 20, domain: 'speed', text: 'I feel that my thinking speed has reduced.' },

  // Activities of Daily Living
  { no: 21, domain: 'adl', text: 'I have difficulty managing my personal hygiene (bathing, dressing, grooming).' },
  { no: 22, domain: 'adl', text: 'I have difficulty managing my medications independently.' },
  { no: 23, domain: 'adl', text: 'I have difficulty handling money or paying bills.' },
  { no: 24, domain: 'adl', text: 'I find it difficult to prepare meals independently.' },
  { no: 25, domain: 'adl', text: 'I need help remembering appointments or daily tasks.' },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

/** The 0–4 response scale, in order. */
export const CHOICES = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Always' },
] as const;

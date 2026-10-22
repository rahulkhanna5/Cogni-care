/**
 * Terms and privacy text. Plain words, short sections, because the people
 * reading it are older adults, many with memory difficulties.
 *
 * DRAFT written for the product, not by a lawyer. Have it reviewed before a
 * public launch (in India, against the Digital Personal Data Protection Act
 * 2023). Bump LEGAL_VERSION whenever either text changes: the version a person
 * agreed to is stored with their account.
 */
export const LEGAL_VERSION = '2026-10-20';
export const LEGAL_UPDATED = '20 October 2026';

export type Section = { heading: string; body: string[] };

export const TERMS: Section[] = [
  {
    heading: 'What CogniCare is',
    body: [
      'CogniCare offers brain-training exercises and a weekly self-reflection check-in for adults who want to keep their memory and attention active.',
      'It is not a medical device. It does not diagnose, treat or prevent any illness, and its scores are not a medical assessment. Always talk to a doctor about your health.',
      'In an emergency, contact your local emergency number, not the app.',
    ],
  },
  {
    heading: 'Using it without an account',
    body: [
      'You can use the exercises and the check-in without an account. Everything then stays on your phone and is not sent to us.',
    ],
  },
  {
    heading: 'Your account',
    body: [
      'An account is only needed to share your results with a specialist. Give your real name and an email address you use, and keep your password to yourself.',
      'You must be 18 or over to create an account. A family member or carer may help you set it up.',
      'You are responsible for what is done with your account. Tell us if you think someone else has used it.',
    ],
  },
  {
    heading: 'Specialists',
    body: [
      'Specialists must give a true registration ID. An administrator checks it before the specialist can be chosen by patients.',
      'A specialist may only see a patient’s results when the patient asked them, an administrator approved it, and the specialist accepted. Specialists must use what they see only for that patient’s care, and keep it confidential.',
      'Notes a specialist writes are their own professional opinion. CogniCare does not check or endorse them.',
    ],
  },
  {
    heading: 'Fair use',
    body: [
      'Do not try to see anyone else’s information, disrupt the service, or create accounts for other people without their permission.',
      'We may suspend an account that breaks these terms or puts other users at risk.',
    ],
  },
  {
    heading: 'The service',
    body: [
      'We work to keep CogniCare available and correct, but we cannot promise it will always be available or free of errors.',
      'We may change these terms. If we make an important change, we will ask you to agree again before you carry on using your account.',
    ],
  },
  {
    heading: 'Stopping',
    body: [
      'You can stop sharing with a specialist at any time from your Profile, and it takes effect immediately.',
      'You can delete your account yourself at any time: in the app, open Settings and choose “Delete my account” (specialists: “Close my specialist account”), or use the account deletion page on our website. A patient’s account and shared results are deleted. A specialist’s account is closed and their notes are kept, because they are medical records.',
    ],
  },
];

export const PRIVACY: Section[] = [
  {
    heading: 'What we collect',
    body: [
      'Without an account: nothing. Your name, age, check-ins and game results stay on your phone.',
      'With an account: your name, email address and password (stored scrambled, never readable), and the check-ins and game results you play while signed in. For specialists, also specialty, registration ID and an optional short bio.',
      'We also keep a log of who looked at a patient’s results and when, so that access can be checked.',
    ],
  },
  {
    heading: 'Why we use it',
    body: [
      'To show your results to you, and to the specialist you chose, so they can follow how you are doing.',
      'To check that specialists are genuine, and to keep the service secure.',
      'We do not sell your information, show you advertising, or use it for anything else.',
    ],
  },
  {
    heading: 'Who can see it',
    body: [
      'You. A specialist you asked, once an administrator approved and the specialist accepted. Administrators, to run the service; every time they open a patient’s results it is logged.',
      'If you or your specialist use “Ask about your results” or an AI-drafted note, a summary of your results and your name (not your email) is sent to an outside AI service to write the answer. That service handles it under its own terms. If you do not want this, do not use those features.',
      'If you report an AI answer as wrong or harmful, that answer and the question before it are kept so we can check it.',
      'We share information with nobody else unless the law requires it.',
    ],
  },
  {
    heading: 'Health information',
    body: [
      'Check-in answers and game results can say something about your health, so we treat them as sensitive. They travel encrypted and are stored on secured servers.',
      'By ticking the box when you create an account, you agree to us processing this information for the purposes above. You can withdraw that agreement at any time by stopping sharing and deleting your account.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'For as long as your account is open. When you delete it, we delete your shared results, except the access log, which is kept so past access can still be checked.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can delete your account yourself from Settings in the app, or from the account deletion page on our website. You can also ask to see the information we hold about you, to correct it, or to take a copy. Ask the administrator, through your specialist or the app.',
    ],
  },
];

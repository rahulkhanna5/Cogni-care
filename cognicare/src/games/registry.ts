import type { Domain } from '@/db/types';

export type GameId =
  | 'market-rush'
  | 'speedy-current'
  | 'blink-trail'
  | 'emotion-meadow'
  | 'sound-forest'
  | 'path-finder'
  | 'dual-task-flow'
  | 'daily-order';

export type GameMeta = {
  id: GameId;
  title: string;
  /** Shown on the card. Plain words, no jargon — the user is not a clinician. */
  blurb: string;
  /** Questionnaire domains this game plausibly touches. */
  domains: Domain[];
  /** Extra cognitive targets the questionnaire does not measure. */
  alsoTrains?: string[];
  needsHeadphones?: boolean;
  /** Set true once the game itself is implemented. */
  ready: boolean;
};

export const GAMES: GameMeta[] = [
  {
    id: 'blink-trail',
    title: 'Blink Trail',
    blurb: 'Watch the lights, then tap them back in the same order.',
    domains: ['stm', 'attention'],
    ready: true,
  },
  {
    id: 'market-rush',
    title: 'Market Rush',
    blurb: 'Remember the shopping list, then pick those items out of the crowd.',
    domains: ['stm', 'speed', 'attention'],
    ready: true,
  },
  {
    id: 'speedy-current',
    title: 'Speedy Current',
    blurb: 'Tap only the fish swimming against the current.',
    domains: ['speed', 'attention'],
    ready: true,
  },
  {
    id: 'sound-forest',
    title: 'Sound Forest',
    blurb: 'Listen to the forest and find where each sound came from.',
    domains: ['attention', 'stm'],
    needsHeadphones: true,
    ready: true,
  },
  {
    id: 'path-finder',
    title: 'Path Finder',
    blurb: 'Plan the shortest safe route across town.',
    domains: ['adl'],
    alsoTrains: ['Planning', 'Problem solving'],
    ready: true,
  },
  {
    id: 'emotion-meadow',
    title: 'Emotion Meadow',
    blurb: 'Find the face showing the feeling you are asked for.',
    domains: [],
    alsoTrains: ['Social cognition', 'Emotion recognition'],
    ready: true,
  },
  {
    id: 'daily-order',
    title: 'Daily Order',
    blurb: 'Put the steps of an everyday task into the right order.',
    domains: ['adl', 'ltm'],
    alsoTrains: ['Sequencing', 'Planning'],
    ready: true,
  },
  {
    id: 'dual-task-flow',
    title: 'Dual Task Flow',
    blurb: 'Two things at once — watch and listen at the same time.',
    domains: ['attention', 'speed'],
    alsoTrains: ['Task switching'],
    ready: true,
  },
];

export const getGame = (id: string) => GAMES.find((g) => g.id === id);

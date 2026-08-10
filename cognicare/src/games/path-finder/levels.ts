export type PathLevel = { size: number; blockedRatio: number };

/** Grid grows first, then obstacle density — one axis at a time. */
export const PATH_LEVELS: PathLevel[] = [
  { size: 4, blockedRatio: 0.1 },
  { size: 4, blockedRatio: 0.15 },
  { size: 5, blockedRatio: 0.15 },
  { size: 5, blockedRatio: 0.18 },
  { size: 5, blockedRatio: 0.22 },
  { size: 6, blockedRatio: 0.18 },
  { size: 6, blockedRatio: 0.22 },
  { size: 6, blockedRatio: 0.25 },
  { size: 7, blockedRatio: 0.2 },
  { size: 7, blockedRatio: 0.23 },
  { size: 7, blockedRatio: 0.26 },
  { size: 7, blockedRatio: 0.28 },
  { size: 8, blockedRatio: 0.24 },
  { size: 8, blockedRatio: 0.27 },
  { size: 8, blockedRatio: 0.3 },
];

export const PATH_MAX_LEVEL = PATH_LEVELS.length;
export const MAPS_PER_ROUND = 2;

export const pathLevel = (level: number): PathLevel =>
  PATH_LEVELS[Math.min(Math.max(level, 1), PATH_MAX_LEVEL) - 1];

export const describePathLevel = (level: number): string => {
  const s = pathLevel(level);
  return `${s.size} by ${s.size} town, ${Math.round(s.blockedRatio * 100)}% blocked`;
};

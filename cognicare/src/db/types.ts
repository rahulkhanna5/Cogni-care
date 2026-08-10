/** The five questionnaire domains. */
export type Domain = 'attention' | 'stm' | 'ltm' | 'speed' | 'adl';

export const DOMAIN_LABELS: Record<Domain, string> = {
  attention: 'Attention',
  stm: 'Short-Term Memory',
  ltm: 'Long-Term Memory',
  speed: 'Processing Speed',
  adl: 'Daily Living',
};

export type Band = 'normal' | 'mild' | 'moderate' | 'severe';

export type Player = {
  id: number;
  name: string;
  age: number | null;
  created_at: string;
};

export type Assessment = {
  id: number;
  player_id: number;
  taken_at: string;
  total_score: number;
  band: Band;
  attention: number;
  stm: number;
  ltm: number;
  speed: number;
  adl: number;
};

export type GameProgress = {
  player_id: number;
  game_id: string;
  current_level: number;
  best_score: number;
  total_plays: number;
  last_played_at: string | null;
  last_direction: 'up' | 'hold' | 'down' | null;
};

export type GameSession = {
  id: number;
  player_id: number;
  game_id: string;
  started_at: string;
  ended_at: string | null;
  level_start: number;
  level_end: number | null;
  accuracy: number | null;
  score: number | null;
  avg_reaction_ms: number | null;
};

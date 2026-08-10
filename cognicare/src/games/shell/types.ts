export type RoundResult = {
  hits: number;
  /** Expected responses the player never made. */
  misses: number;
  /** Responses made that should have been withheld. Kept apart from misses
   *  on purpose — see ARCHITECTURE.md §4. */
  falseAlarms: number;
  /** 0..1 */
  accuracy: number;
  avgReactionMs: number | null;
  score: number;
};

export type GamePlayProps = {
  level: number;
  roundNo: number;
  totalRounds: number;
  onRoundComplete: (result: RoundResult) => void;
};

export const emptyRound = (): RoundResult => ({
  hits: 0,
  misses: 0,
  falseAlarms: 0,
  accuracy: 0,
  avgReactionMs: null,
  score: 0,
});

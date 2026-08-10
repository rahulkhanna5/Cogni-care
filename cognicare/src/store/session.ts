import { create } from 'zustand';

import type { Player } from '@/db/types';

/**
 * In-memory session state only. Anything that must survive an app restart
 * belongs in SQLite, not here.
 */
type SessionState = {
  player: Player | null;
  setPlayer: (p: Player | null) => void;
};

export const useSession = create<SessionState>((set) => ({
  player: null,
  setPlayer: (player) => set({ player }),
}));

export const ACTIVE_PLAYER_KEY = 'active_player_id';

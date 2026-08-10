import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getPlayer, getSetting } from '@/db/queries';
import { ACTIVE_PLAYER_KEY, useSession } from '@/store/session';
import { colors } from '@/theme/tokens';

/**
 * Boot router. Decides where the app opens, then gets out of the way.
 * Never rendered for more than a frame or two.
 */
export default function Index() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setPlayer = useSession((s) => s.setPlayer);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await getSetting(db, ACTIVE_PLAYER_KEY);
      const player = saved ? await getPlayer(db, Number(saved)) : null;
      if (cancelled) return;

      if (player) {
        setPlayer(player);
        router.replace('/dashboard');
      } else {
        router.replace('/welcome');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, router, setPlayer]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

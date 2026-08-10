import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getPlayer, getSetting } from '@/db/queries';
import { useAuth } from '@/store/auth';
import { ACTIVE_PLAYER_KEY, useSession } from '@/store/session';
import { colors } from '@/theme/tokens';

/**
 * Boot router. Decides where the app opens, then gets out of the way.
 *
 * Two ways in, on purpose:
 *  - signed in  -> dashboard (or the pending screen for an unapproved doctor)
 *  - not signed in but a local player exists -> straight to the exercises
 *
 * The exercises still work with no account at all. An account only exists to
 * share progress with a doctor, and putting a login wall in front of the games
 * would lose the users this app is for.
 */
export default function Index() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setPlayer = useSession((s) => s.setPlayer);
  const { hydrate, hydrated, user, pendingApproval } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      if (user) {
        if (user.role === 'DOCTOR' && pendingApproval) {
          router.replace('/pending');
          return;
        }
        // Keep the local player in step so the games and dashboard still work.
        const saved = await getSetting(db, ACTIVE_PLAYER_KEY);
        const local = saved ? await getPlayer(db, Number(saved)) : null;
        if (cancelled) return;
        if (local) setPlayer(local);
        router.replace(local ? '/dashboard' : '/welcome');
        return;
      }

      const saved = await getSetting(db, ACTIVE_PLAYER_KEY);
      const local = saved ? await getPlayer(db, Number(saved)) : null;
      if (cancelled) return;

      if (local) {
        setPlayer(local);
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, hydrated, user, pendingApproval, router, setPlayer]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

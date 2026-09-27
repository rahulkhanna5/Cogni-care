import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';

import { createPlayer, getPlayer, setSetting } from '@/db/queries';
import { useAuth } from '@/store/auth';
import { ACTIVE_PLAYER_KEY, useSession } from '@/store/session';
import { colors, space } from '@/theme/tokens';
import { Button, Logo, Screen, Text, TextField } from '@/ui';

/**
 * First-run screen. Deliberately two fields and one button — no password,
 * no email, no account. A login wall is where this audience drops out.
 */
export default function Welcome() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setPlayer = useSession((s) => s.setPlayer);
  // If they are signed in, start from the name on the account.
  const accountName = useAuth((s) => s.user?.name);

  const [name, setName] = useState(accountName?.split(' ')[0] ?? '');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      const parsedAge = age.trim() ? Number(age.trim()) : null;
      const id = await createPlayer(db, name.trim(), Number.isFinite(parsedAge) ? parsedAge : null);
      await setSetting(db, ACTIVE_PLAYER_KEY, String(id));
      const player = await getPlayer(db, id);
      setPlayer(player);
      router.replace('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Logo size={64} />
        <View style={{ gap: space.xs }}>
          <Text variant="display">Welcome</Text>
          <Text variant="body" color="textMuted">
            A few brain exercises, a few minutes a day. Let&apos;s start with your name.
          </Text>
        </View>
      </View>

      <TextField
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="First name"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
      />

      <TextField
        label="Your age (optional)"
        value={age}
        onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 68"
        keyboardType="number-pad"
        maxLength={3}
      />

      <Button
        label={saving ? 'Saving…' : 'Continue'}
        onPress={handleContinue}
        busy={saving}
        disabled={name.trim().length === 0}
        disabledReason="Type your name to continue."
        style={{ marginTop: space.sm }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm }}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
        <Text variant="caption" color="textMuted">
          Everything stays on this phone. Nothing is sent anywhere.
        </Text>
      </View>
    </Screen>
  );
}

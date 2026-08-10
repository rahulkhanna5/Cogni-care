import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { createPlayer, getPlayer, setSetting } from '@/db/queries';
import { ACTIVE_PLAYER_KEY, useSession } from '@/store/session';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';

/**
 * First-run screen. Deliberately two fields and one button — no password,
 * no email, no account. A login wall is where this audience drops out.
 */
export default function Welcome() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setPlayer = useSession((s) => s.setPlayer);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim().length > 0 && !saving;

  async function handleContinue() {
    setSaving(true);
    try {
      const parsedAge = age.trim() ? Number(age.trim()) : null;
      const id = await createPlayer(db, name, Number.isFinite(parsedAge) ? parsedAge : null);
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
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Text variant="display">Welcome</Text>
        <Text variant="body" color="textMuted">
          A few brain exercises, a few minutes a day. Let&apos;s start with your name.
        </Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text variant="label">Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="First name"
            placeholderTextColor={colors.disabled}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            style={inputStyle}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="label">Your age (optional)</Text>
          <TextInput
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 68"
            placeholderTextColor={colors.disabled}
            keyboardType="number-pad"
            maxLength={3}
            style={inputStyle}
          />
        </View>
      </View>

      <Button
        label={saving ? 'Saving…' : 'Continue'}
        onPress={handleContinue}
        disabled={!canContinue}
        style={{ marginTop: space.xl }}
      />

      <Text variant="caption" color="textMuted" center style={{ marginTop: space.md }}>
        Everything stays on this phone. Nothing is sent anywhere.
      </Text>
    </Screen>
  );
}

const inputStyle = {
  minHeight: TOUCH_MIN,
  borderWidth: 2,
  borderColor: colors.border,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  paddingHorizontal: space.md,
  fontSize: 20,
  color: colors.text,
} as const;

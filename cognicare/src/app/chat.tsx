import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PatientChat } from '@/chat/PatientChat';
import { useAuth } from '@/store/auth';
import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

export default function OwnChatScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  // The chat calls a signed-in endpoint (it needs an access token to know
  // whose data to read), unlike the games, which work for a local-only
  // guest. Same shape as GameShell's "no player yet" guard, one level up.
  if (!user) {
    return (
      <Screen>
        <Header title="Ask about your results" onBack={() => router.back()} />
        <Card>
          <Text variant="heading">Sign in to ask about your results</Text>
          <Text variant="body" color="textMuted">
            This needs an account, so the assistant knows whose results it is looking at.
          </Text>
        </Card>
        <Button label="Sign in or create an account" onPress={() => router.push('/login')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Header title="Ask about your results" onBack={() => router.back()} />
      </View>

      <PatientChat
        patientId={user.id}
        suggestions={[
          'How am I doing overall?',
          'What should I practise this week?',
          'What does my last check-in score mean?',
        ]}
      />
    </Screen>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        marginBottom: space.md,
      }}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={{ width: TOUCH_MIN, height: TOUCH_MIN, justifyContent: 'center' }}
      >
        <Ionicons name="chevron-back" size={30} color={colors.text} />
      </Pressable>
      <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PatientChat } from '@/chat/PatientChat';
import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Screen, Text } from '@/ui';

export default function PatientChatScreen() {
  const router = useRouter();
  // name travels as a route param from the button that links here, so this
  // screen does not have to re-fetch the patient just to show their name in
  // the header. Optional because a direct deep link would not carry it.
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Header title={name ? `Chat about ${name}` : 'Chat about this patient'} onBack={() => router.back()} />
      </View>

      <PatientChat
        patientId={id}
        suggestions={[
          'How is this patient doing overall?',
          'Which game shows the most misses or false alarms?',
          'What changed since the last check-in?',
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

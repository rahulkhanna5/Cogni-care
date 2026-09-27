import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { PatientChat } from '@/chat/PatientChat';
import { space } from '@/theme/tokens';
import { Screen, ScreenHeader } from '@/ui';

export default function PatientChatScreen() {
  const router = useRouter();
  // name travels as a route param from the button that links here, so this
  // screen does not have to re-fetch the patient just to show their name in
  // the header. Optional because a direct deep link would not carry it.
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  return (
    <Screen scroll={false} padded={false}>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md }}>
        <ScreenHeader title={name ? `Chat about ${name}` : 'Chat about this patient'} onBack={() => router.back()} />
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

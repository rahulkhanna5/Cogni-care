import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Card, Screen, ScreenHeader, Text } from '@/ui';
import { LEGAL_UPDATED, type Section } from './content';

/** One legal text, one card per section, so it can be read a piece at a time. */
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title={title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
      <Text variant="body" color="textMuted">
        {intro}
      </Text>
      <Text variant="caption" color="textMuted">
        {`Last updated ${LEGAL_UPDATED}`}
      </Text>
      {sections.map((s) => (
        <Card key={s.heading} style={{ gap: space.sm }}>
          <Text variant="heading">{s.heading}</Text>
          <View style={{ gap: space.sm }}>
            {s.body.map((p) => (
              <Text key={p} variant="body">
                {p}
              </Text>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

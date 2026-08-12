import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

/** Slide 6 of the source deck. */
const REFERENCES = [
  {
    label: 'Frontiers in Psychology (2022) — cognitive training in MCI',
    url: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1018601/full',
  },
  {
    label: 'PMC — computerised cognitive training review',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10691300/',
  },
  {
    label: 'Frontiers in Aging Neuroscience (2022)',
    url: 'https://www.frontiersin.org/journals/aging-neuroscience/articles/10.3389/fnagi.2022.859715/full',
  },
  { label: 'PubMed 38274539', url: 'https://pubmed.ncbi.nlm.nih.gov/38274539/' },
  { label: 'PubMed 35431905', url: 'https://pubmed.ncbi.nlm.nih.gov/35431905/' },
];

/**
 * The "why" behind the app — slides 2 to 6 of the source deck, condensed.
 * Deliberately short: this is background for a curious user or a reviewer,
 * not a lecture.
 */
export default function About() {
  const router = useRouter();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ width: TOUCH_MIN, height: TOUCH_MIN, justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={30} color={colors.text} />
        </Pressable>
        <Text variant="display">Why this works</Text>
      </View>

      <Card>
        <Text variant="heading">Mild Cognitive Impairment</Text>
        <Text variant="body" color="textMuted">
          A noticeable decline in memory, attention, language or planning — more than
          expected for someone’s age, but not enough to stop them living
          independently. It carries an increased risk of progressing to dementia.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">What changes, and why</Text>
        <Text variant="body">Attention</Text>
        <Text variant="body" color="textMuted">
          The front of the brain, which handles focus and planning, becomes less
          efficient. Harder to hold attention, easier to be distracted.
        </Text>
        <Text variant="body" style={{ marginTop: space.sm }}>
          Memory
        </Text>
        <Text variant="body" color="textMuted">
          The hippocampus, which stores new memories, shrinks slightly and its cells
          communicate less well — so new information is not stored properly.
        </Text>
        <Text variant="body" style={{ marginTop: space.sm }}>
          Processing speed
        </Text>
        <Text variant="body" color="textMuted">
          Myelin, the protective sheath around nerves, thins. Signals travel more
          slowly, like a slower connection.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Neuroplasticity</Text>
        <Text variant="body" color="textMuted">
          The brain can form new connections, strengthen weak ones and reorganise
          itself. In MCI the brain cells are still alive — they are simply not
          communicating efficiently.
        </Text>
        <Text variant="body" color="textMuted">
          Regular exercises aim to improve communication between brain regions,
          encourage the neurotransmitters that support adaptability, stimulate the
          frontal lobe used for planning and attention, and keep memory circuits
          active.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Research</Text>
        {REFERENCES.map((ref) => (
          <Pressable
            key={ref.url}
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(ref.url)}
            style={{ minHeight: TOUCH_MIN, justifyContent: 'center' }}
          >
            <Text variant="body" color="accent">
              {ref.label}
            </Text>
          </Pressable>
        ))}
      </Card>

      <Text variant="caption" color="textMuted">
        These exercises are for practice and tracking. They are not a medical
        diagnosis or a treatment.
      </Text>

      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

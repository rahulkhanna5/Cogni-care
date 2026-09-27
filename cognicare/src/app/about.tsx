import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, ScreenHeader, Text } from '@/ui';

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
      <ScreenHeader title="Why this works" onBack={() => router.back()} />

      <Card>
        <Text variant="heading">Mild Cognitive Impairment</Text>
        <Text variant="body" color="textMuted">
          A noticeable decline in memory, attention, language or planning — more than
          expected for someone’s age, but not enough to stop them living
          independently. It carries an increased risk of progressing to dementia.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="heading">What changes, and why</Text>
        {[
          [
            'Attention',
            'The front of the brain, which handles focus and planning, becomes less efficient. Harder to hold attention, easier to be distracted.',
          ],
          [
            'Memory',
            'The hippocampus, which stores new memories, shrinks slightly and its cells communicate less well — so new information is not stored properly.',
          ],
          [
            'Processing speed',
            'Myelin, the protective sheath around nerves, thins. Signals travel more slowly, like a slower connection.',
          ],
        ].map(([title, body]) => (
          <View key={title} style={{ gap: space.xs }}>
            <Text variant="label">{title}</Text>
            <Text variant="body" color="textMuted">
              {body}
            </Text>
          </View>
        ))}
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

      <Card style={{ gap: 0 }}>
        <Text variant="heading" style={{ marginBottom: space.xs }}>
          Research
        </Text>
        {REFERENCES.map((ref) => (
          <Button
            key={ref.url}
            label={ref.label}
            variant="quiet"
            icon="open-outline"
            fullWidth={false}
            onPress={() => WebBrowser.openBrowserAsync(ref.url)}
            style={{ alignSelf: 'flex-start' }}
          />
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Text variant="heading">Sounds</Text>
        {/* CC0, so credit is optional — but the author asks for it, and it
            costs one line. */}
        <Text variant="body" color="textMuted">
          Duck and crow recordings: Joseph Sardin, BigSoundBank.com (CC0).
        </Text>
      </Card>

      <Banner tone="info" icon="information-circle-outline">
        These exercises are for practice and tracking. They are not a medical diagnosis
        or a treatment.
      </Banner>

      <Button label="Back" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
    </Screen>
  );
}

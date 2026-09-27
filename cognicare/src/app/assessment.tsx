import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { CHOICES, QUESTIONS, TOTAL_QUESTIONS } from '@/assessment/questions';
import {
  bandInfo,
  firstUnanswered,
  isComplete,
  scoreAssessment,
  type Answers,
} from '@/assessment/scoring';
import { getSetting, saveAssessment, setSetting } from '@/db/queries';
import { AreaBars } from '@/charts/AreaBars';
import { chart } from '@/charts/colors';
import { DOMAIN_LABELS, type Domain } from '@/db/types';
import { useSession } from '@/store/session';
import { colors, space } from '@/theme/tokens';
import { AnswerButton, Banner, Button, Card, Score, Screen, ScreenHeader, Text } from '@/ui';

const draftKey = (playerId: number) => `assessment_draft_${playerId}`;

export default function Assessment() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);

  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0); // 0-based position in QUESTIONS
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<ReturnType<typeof scoreAssessment> | null>(null);

  /* Restore an interrupted check-in. 25 questions is a long way for this
     audience to get in one sitting, and losing the lot to a phone call would
     mean they simply never finish it. */
  useEffect(() => {
    // Without this the screen loads forever: the early return skipped
    // setLoading(false), so reaching this route with no local player — a
    // reload, a deep link, or a signed-in user who never made one — showed a
    // permanently blank page.
    if (!player) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const raw = await getSetting(db, draftKey(player.id));
      if (cancelled) return;

      if (raw) {
        try {
          const saved: Answers = JSON.parse(raw);
          setAnswers(saved);
          setIndex(firstUnanswered(saved) - 1);
        } catch {
          // A corrupt draft should not block a fresh check-in.
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, player]);

  const question = QUESTIONS[index];

  const answer = useCallback(
    async (value: number) => {
      if (!player) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const next = { ...answers, [question.no]: value };
      setAnswers(next);
      await setSetting(db, draftKey(player.id), JSON.stringify(next));

      if (index + 1 < TOTAL_QUESTIONS) {
        setIndex(index + 1);
        return;
      }

      if (!isComplete(next)) {
        // A skipped item somewhere earlier — go back to it rather than
        // scoring an incomplete questionnaire.
        setIndex(firstUnanswered(next) - 1);
        return;
      }

      const score = scoreAssessment(next);
      await saveAssessment(
        db,
        player.id,
        next,
        score,
        QUESTIONS.map((q) => ({ no: q.no, domain: q.domain }))
      );
      await setSetting(db, draftKey(player.id), '');
      setDone(score);
    },
    [answers, db, index, player, question]
  );

  if (loading) {
    return (
      <Screen scroll={false}>
        <View />
      </Screen>
    );
  }

  if (!player) {
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: space.lg }}>
          Almost there
        </Text>
        <Text variant="body" color="textMuted">
          The check-in saves your answers against a name, so tell us who you are
          first.
        </Text>
        <Button label="Set up" onPress={() => router.replace('/welcome')} />
      </Screen>
    );
  }

  /* --------------------------------- result -------------------------------- */

  if (done) {
    const info = bandInfo(done.band);
    return (
      <Screen>
        <Text variant="display" style={{ marginTop: space.lg }}>
          All finished
        </Text>

        <Card style={{ gap: space.sm }}>
          <Text variant="caption" color="textMuted">
            Your score
          </Text>
          <Score value={done.total} max={100} />
          <Text variant="heading" color="warning">
            {info.label}
          </Text>
          <Text variant="body" color="textMuted">
            {info.blurb}
          </Text>
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text variant="heading">By area</Text>
            <Text variant="body" color="textMuted">
              A higher number means more difficulty in that area.
            </Text>
          </View>
          <AreaBars
            max={20}
            rows={(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => ({
              label: DOMAIN_LABELS[d],
              value: done.domains[d],
            }))}
          />
        </Card>

        {/* Said plainly, because the instrument is self-made and unvalidated. */}
        <Banner tone="info" icon="information-circle-outline">
          This check-in is a way of tracking how things feel over time. It is not a
          medical diagnosis. Please talk to a doctor about any concerns.
        </Banner>

        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  /* -------------------------------- question ------------------------------- */

  const progress = (index + 1) / TOTAL_QUESTIONS;

  return (
    <Screen>
      <ScreenHeader title={`Question ${index + 1} of ${TOTAL_QUESTIONS}`} onBack={() => router.back()} backIcon="close" />

      {/* Sand, the check-in's colour everywhere — never the games' coral. */}
      <View
        accessible
        accessibilityLabel={`${index + 1} of ${TOTAL_QUESTIONS} answered`}
        style={{ height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: colors.edge, overflow: 'hidden' }}
      >
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: chart.checkin }} />
      </View>

      <Text variant="caption" color="textMuted" style={{ marginTop: space.sm }}>
        {DOMAIN_LABELS[question.domain]}
      </Text>

      <Text variant="title" style={{ marginBottom: space.md }}>
        {question.text}
      </Text>

      <View accessibilityRole="radiogroup" style={{ gap: space.sm + 4 }}>
        {CHOICES.map((choice) => (
          <AnswerButton
            key={choice.value}
            label={choice.label}
            selected={answers[question.no] === choice.value}
            onPress={() => answer(choice.value)}
          />
        ))}
      </View>

      {index > 0 && (
        <Button label="Go back" variant="quiet" icon="arrow-back" onPress={() => setIndex(index - 1)} />
      )}

      <Text variant="caption" color="textMuted" center>
        There are no wrong answers. Your progress is saved as you go.
      </Text>
    </Screen>
  );
}

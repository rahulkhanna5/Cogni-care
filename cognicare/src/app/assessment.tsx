import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CHOICES, QUESTIONS, TOTAL_QUESTIONS } from '@/assessment/questions';
import {
  bandInfo,
  firstUnanswered,
  isComplete,
  scoreAssessment,
  type Answers,
} from '@/assessment/scoring';
import { getSetting, saveAssessment, setSetting } from '@/db/queries';
import { DOMAIN_LABELS } from '@/db/types';
import { useSession } from '@/store/session';
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

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

        <Card>
          <Text variant="body" color="textMuted">
            Your score
          </Text>
          <Text variant="display">{done.total} out of 100</Text>
          <Text variant="heading" color="accent">
            {info.label}
          </Text>
          <Text variant="body" color="textMuted">
            {info.blurb}
          </Text>
        </Card>

        <Card>
          <Text variant="heading">By area</Text>
          {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((domain) => (
            <View key={domain} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{DOMAIN_LABELS[domain]}</Text>
                <Text variant="label">{done.domains[domain]} / 20</Text>
              </View>
              <View
                style={{
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${(done.domains[domain] / 20) * 100}%`,
                    height: '100%',
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
            </View>
          ))}
          <Text variant="caption" color="textMuted">
            A higher number means more difficulty in that area.
          </Text>
        </Card>

        {/* Said plainly, because the instrument is self-made and unvalidated. */}
        <Text variant="caption" color="textMuted">
          This check-in is a way of tracking how things feel over time. It is not a
          medical diagnosis. Please talk to a doctor about any concerns.
        </Text>

        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  /* -------------------------------- question ------------------------------- */

  const progress = (index + 1) / TOTAL_QUESTIONS;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="label" color="textMuted">
          Question {index + 1} of {TOTAL_QUESTIONS}
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close check-in"
          hitSlop={12}
          style={{ width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={32} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.accent }} />
      </View>

      <Text variant="caption" color="textMuted" style={{ marginTop: space.sm }}>
        {DOMAIN_LABELS[question.domain]}
      </Text>

      <Text variant="title" style={{ marginBottom: space.lg }}>
        {question.text}
      </Text>

      <View style={{ gap: space.md }}>
        {CHOICES.map((choice) => {
          const selected = answers[question.no] === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="button"
              accessibilityLabel={choice.label}
              accessibilityState={{ selected }}
              onPress={() => answer(choice.value)}
              style={{
                minHeight: TOUCH_MIN + 8,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: space.md,
              }}
            >
              <Text variant="label" color={selected ? 'accent' : 'text'}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {index > 0 && (
        <Button
          label="Go back"
          variant="quiet"
          onPress={() => setIndex(index - 1)}
          style={{ marginTop: space.md }}
        />
      )}

      <Text variant="caption" color="textMuted" center style={{ marginTop: space.sm }}>
        There are no wrong answers. Your progress is saved as you go.
      </Text>
    </Screen>
  );
}

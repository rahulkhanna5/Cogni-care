import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { TOTAL_QUESTIONS } from '@/assessment/questions';
import { bandInfo, firstUnanswered, type Answers } from '@/assessment/scoring';
import { assessmentHistory, getSetting } from '@/db/queries';
import { DOMAIN_LABELS, type Assessment } from '@/db/types';
import { useSession } from '@/store/session';
import { colors, space } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

const draftKey = (playerId: number) => `assessment_draft_${playerId}`;

const formatDate = (iso: string) =>
  new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function Assess() {
  const db = useSQLiteContext();
  const router = useRouter();
  const player = useSession((s) => s.player);

  const [history, setHistory] = useState<Assessment[]>([]);
  const [resumeAt, setResumeAt] = useState<number | null>(null);

  // Refetch on focus so a check-in finished a moment ago shows up here.
  useFocusEffect(
    useCallback(() => {
      if (!player) return;
      let cancelled = false;

      (async () => {
        const rows = await assessmentHistory(db, player.id);
        const raw = await getSetting(db, draftKey(player.id));
        if (cancelled) return;

        setHistory(rows);

        let next: number | null = null;
        if (raw) {
          try {
            const saved: Answers = JSON.parse(raw);
            if (Object.keys(saved).length > 0) next = firstUnanswered(saved);
          } catch {
            next = null;
          }
        }
        setResumeAt(next);
      })();

      return () => {
        cancelled = true;
      };
    }, [db, player])
  );

  const latest = history[0];
  const previous = history[1];

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Check-in</Text>
        <Text variant="body" color="textMuted">
          {TOTAL_QUESTIONS} short questions about how things have felt lately. There are
          no wrong answers.
        </Text>
      </View>

      {latest ? (
        <Card>
          <Text variant="body" color="textMuted">
            Last check-in · {formatDate(latest.taken_at)}
          </Text>
          <Text variant="display">{latest.total_score} / 100</Text>
          <Text variant="heading" color="accent">
            {bandInfo(latest.band).label}
          </Text>

          {previous && (
            <Text variant="body" color="textMuted">
              {describeChange(latest.total_score, previous.total_score)}
            </Text>
          )}
        </Card>
      ) : (
        <Card>
          <Text variant="heading">Not done yet</Text>
          <Text variant="body" color="textMuted">
            Taking this once now gives you something to compare against later.
          </Text>
        </Card>
      )}

      {latest && (
        <Card>
          <Text variant="heading">By area</Text>
          {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((domain) => (
            <View key={domain} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{DOMAIN_LABELS[domain]}</Text>
                <Text variant="label">{latest[domain]} / 20</Text>
              </View>
              <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${(latest[domain] / 20) * 100}%`,
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
      )}

      <Button
        label={resumeAt ? `Continue from question ${resumeAt}` : 'Start check-in'}
        onPress={() => router.push('/assessment')}
      />

      {history.length > 1 && (
        <Card>
          <Text variant="heading">Earlier check-ins</Text>
          {history.slice(1).map((row) => (
            <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="textMuted">
                {formatDate(row.taken_at)}
              </Text>
              <Text variant="label">{row.total_score} / 100</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

/** Higher score = more difficulty, so a fall is an improvement. Spelled out
 *  in words because the direction is the easiest thing here to misread. */
function describeChange(now: number, before: number): string {
  const delta = now - before;
  if (delta === 0) return 'The same as your previous check-in.';
  if (delta < 0) return `${Math.abs(delta)} points lower than last time — fewer difficulties reported.`;
  return `${delta} points higher than last time — more difficulties reported.`;
}

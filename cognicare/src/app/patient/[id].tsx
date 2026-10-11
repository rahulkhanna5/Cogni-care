import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { CheckInPanel } from '@/care/doctor/CheckInPanel';
import { GamesPanel, movement } from '@/care/doctor/GamesPanel';
import { cap, Fact, formatDate, pct, ReasonList, SegmentTabs } from '@/care/doctor/parts';
import { RemarksPanel } from '@/care/doctor/RemarksPanel';
import { agoText, bandTone, statusLine, summarise } from '@/care/insight';
import { getGame } from '@/games/registry';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, ScreenHeader, Text } from '@/ui';

type Tab = 'overview' | 'games' | 'checkins' | 'notes';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'games', label: 'Games' },
  { value: 'checkins', label: 'Check-ins' },
  { value: 'notes', label: 'Notes' },
];

/**
 * One patient, summary first. The top answers "how are they doing?" in a
 * sentence and three facts; the detail sits behind tabs instead of one long
 * scroll. Games and the check-in are never combined into a single figure —
 * they do not measure the same things.
 */
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authedFetch } = useAuth();

  const [patient, setPatient] = useState<doctorApi.PatientSummary | null>(null);
  const [assessments, setAssessments] = useState<doctorApi.ServerAssessment[]>([]);
  const [sessions, setSessions] = useState<doctorApi.ServerSession[]>([]);
  const [remarks, setRemarks] = useState<doctorApi.Remark[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [p, a, s, r] = await Promise.all([
          authedFetch((t) => doctorApi.getPatient(t, id)),
          authedFetch((t) => doctorApi.getAssessments(t, id)),
          authedFetch((t) => doctorApi.getSessions(t, id)),
          authedFetch((t) => doctorApi.listRemarks(t, id)),
        ]);
        if (cancelled) return;
        setPatient(p.patient);
        setAssessments(a.assessments);
        setSessions(s.sessions);
        setRemarks(r.remarks);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load this patient’s records.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, authedFetch]);

  const insight = useMemo(() => summarise(sessions, assessments), [sessions, assessments]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Loading…" onBack={() => router.back()} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Unavailable" onBack={() => router.back()} />
        <Banner tone="error">{error}</Banner>
      </Screen>
    );
  }

  const { latest, checkInChange } = insight;

  return (
    <Screen>
      <ScreenHeader title={patient?.name ?? 'Patient'} onBack={() => router.back()} />
      <Text variant="caption" color="textMuted">
        {patient?.email}
      </Text>

      {/* The answer first: one sentence, then three facts. */}
      <Card>
        <Text variant="body">{statusLine(insight)}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Fact label="Last played" value={cap(agoText(insight.daysSincePlay))} />
        <Fact label="This week" value={`${insight.activeDaysLast7} of 7 days`} />
        <Fact
          label="Check-in"
          value={latest ? cap(latest.band) : 'None yet'}
          tone={latest ? bandTone(latest.band) : undefined}
          caption={
            latest && checkInChange !== null && checkInChange !== 0
              ? `${Math.abs(checkInChange)} points ${checkInChange > 0 ? 'worse' : 'better'}`
              : undefined
          }
        />
      </View>

      <Button
        label="Chat about this patient"
        variant="secondary"
        icon="chatbox-ellipses-outline"
        onPress={() => router.push({ pathname: '/patient/[id]/chat', params: { id, name: patient?.name ?? '' } })}
      />

      <SegmentTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <View style={{ gap: space.md }}>
          {insight.attention.length > 0 ? (
            <Banner tone="warning" icon="alert-circle-outline">
              <Text variant="label">Worth a look</Text>
              <ReasonList reasons={insight.attention} />
            </Banner>
          ) : (
            <Banner tone="success">Nothing stands out. Playing and check-ins look steady.</Banner>
          )}

          {insight.trends.length > 0 && (
            <Card style={{ gap: space.md }}>
              <Text variant="heading">Games at a glance</Text>
              {insight.trends.map((t) => {
                const m = movement(t);
                return (
                  <View key={t.gameId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                    <Text variant="body" style={{ flex: 1 }}>
                      {getGame(t.gameId)?.title ?? t.gameId}
                    </Text>
                    <Text variant="label">
                      {pct(t.recent)}
                      {m ? ` · ${m.words}` : ''}
                    </Text>
                  </View>
                );
              })}
              <Button label="See all games" variant="quiet" fullWidth={false} onPress={() => setTab('games')} />
            </Card>
          )}

          {latest && (
            <Card style={{ gap: space.xs }}>
              <Text variant="heading">Latest check-in</Text>
              <Text variant="body">{`${latest.total_score} out of 100 · ${cap(latest.band)}`}</Text>
              <Text variant="caption" color="textMuted">
                {`Taken ${formatDate(latest.taken_at)}. Lower is better.`}
              </Text>
              <Button label="See check-ins" variant="quiet" fullWidth={false} onPress={() => setTab('checkins')} />
            </Card>
          )}
        </View>
      )}

      {tab === 'games' && <GamesPanel trends={insight.trends} />}
      {tab === 'checkins' && <CheckInPanel assessments={assessments} />}
      {tab === 'notes' && (
        <RemarksPanel patientId={id} remarks={remarks} onAdded={(r) => setRemarks((prev) => [r, ...prev])} />
      )}

      <Text variant="caption" color="textMuted">
        These scores are practice and self-report data, not a diagnostic assessment.
      </Text>
    </Screen>
  );
}

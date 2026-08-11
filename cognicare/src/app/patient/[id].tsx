import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { bandInfo } from '@/assessment/scoring';
import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { Dumbbell, type DumbbellRow } from '@/charts/Dumbbell';
import { chart } from '@/charts/colors';
import { Meter } from '@/charts/Meter';
import { Sparkline } from '@/charts/Sparkline';
import { DOMAIN_LABELS, type Domain } from '@/db/types';
import { getGame } from '@/games/registry';
import { useAuth } from '@/store/auth';
import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Button, Card, Screen, Text } from '@/ui';

const MAX_LEVEL = 15;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Per-game rollup, computed here because the server returns raw sessions. */
type GameRollup = {
  gameId: string;
  plays: number;
  level: number;
  meanAccuracy: number;
  trend: number[];
  lastPlayed: string | null;
  meanReactionMs: number | null;
};

export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authedFetch } = useAuth();
  const { width } = useWindowDimensions();

  const [patient, setPatient] = useState<doctorApi.PatientSummary | null>(null);
  const [assessments, setAssessments] = useState<doctorApi.ServerAssessment[]>([]);
  const [sessions, setSessions] = useState<doctorApi.ServerSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [p, a, s] = await Promise.all([
          authedFetch((t) => doctorApi.getPatient(t, id)),
          authedFetch((t) => doctorApi.getAssessments(t, id)),
          authedFetch((t) => doctorApi.getSessions(t, id)),
        ]);
        if (cancelled) return;
        setPatient(p.patient);
        setAssessments(a.assessments);
        setSessions(s.sessions);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof ApiError ? e.message : 'Could not load this patient’s records.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, authedFetch]);

  const cardWidth = Math.min(width, 520) - space.lg * 4;

  const rollups = useMemo<GameRollup[]>(() => {
    const byGame = new Map<string, doctorApi.ServerSession[]>();
    // Oldest first so trends read left to right.
    const ordered = [...sessions].sort((a, b) => a.started_at.localeCompare(b.started_at));
    for (const s of ordered) {
      byGame.set(s.game_id, [...(byGame.get(s.game_id) ?? []), s]);
    }

    return [...byGame.entries()]
      .map(([gameId, rows]) => {
        const accuracies = rows.map((r) => r.accuracy ?? 0);
        const reactions = rows
          .map((r) => r.avg_reaction_ms)
          .filter((n): n is number => n != null);
        return {
          gameId,
          plays: rows.length,
          level: rows[rows.length - 1]?.level_end ?? rows[rows.length - 1]?.level_start ?? 1,
          meanAccuracy: accuracies.reduce((a, b) => a + b, 0) / (accuracies.length || 1),
          trend: accuracies.slice(-10),
          lastPlayed: rows[rows.length - 1]?.started_at ?? null,
          meanReactionMs: reactions.length
            ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
            : null,
        };
      })
      .sort((a, b) => (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? ''));
  }, [sessions]);

  const latest = assessments[0];
  const previous = assessments[1];

  const domainRows: DumbbellRow[] = latest
    ? (Object.keys(DOMAIN_LABELS) as Domain[]).map((domain) => ({
        label: DOMAIN_LABELS[domain],
        now: latest[domain],
        before: previous ? previous[domain] : undefined,
      }))
    : [];

  if (loading) {
    return (
      <Screen>
        <Header onBack={() => router.back()} title="Loading…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Header onBack={() => router.back()} title="Unavailable" />
        <Card>
          <Text variant="body" color="danger">
            {error}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header onBack={() => router.back()} title={patient?.name ?? 'Patient'} />

      <Card>
        <Text variant="caption" color="textMuted">
          {patient?.email}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.sm }}>
          <Stat label="Sessions" value={String(sessions.length)} />
          <Stat label="Check-ins" value={String(assessments.length)} />
          <Stat label="Games used" value={String(rollups.length)} />
        </View>
      </Card>

      {/* Two panels, same separation as the patient's own dashboard. The
          games and the questionnaire do not measure the same things, and a
          combined figure would imply a link the data cannot support. */}
      <Card>
        <Text variant="heading">Games</Text>
        <Text variant="body" color="textMuted">
          Performance in the exercises. Higher is better.
        </Text>

        {rollups.length === 0 ? (
          <Text variant="body" color="textMuted">
            No sessions shared yet.
          </Text>
        ) : (
          <View style={{ gap: space.lg, marginTop: space.sm }}>
            {rollups.map((r) => (
              <View key={r.gameId} style={{ gap: space.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label">{getGame(r.gameId)?.title ?? r.gameId}</Text>
                  <Text variant="body" color="textMuted">
                    Level {r.level}
                  </Text>
                </View>

                <Meter value={r.level} max={MAX_LEVEL} width={cardWidth} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Sparkline values={r.trend} width={cardWidth - 90} />
                  <Text variant="body">{Math.round(r.meanAccuracy * 100)}%</Text>
                </View>

                <Text variant="caption" color="textMuted">
                  {r.plays} {r.plays === 1 ? 'session' : 'sessions'}
                  {r.meanReactionMs != null ? ` · ${r.meanReactionMs}ms average` : ''}
                  {r.lastPlayed ? ` · last ${formatDate(r.lastPlayed)}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text variant="heading">Check-in</Text>
        <Text variant="body" color="textMuted">
          Self-reported difficulty. Lower is better.
        </Text>

        {!latest ? (
          <Text variant="body" color="textMuted">
            No check-in shared yet.
          </Text>
        ) : (
          <View style={{ gap: space.md, marginTop: space.sm }}>
            <View>
              <Text variant="display">{latest.total_score} / 100</Text>
              <Text variant="heading" color="accent">
                {bandInfo(latest.band).label}
              </Text>
              <Text variant="caption" color="textMuted">
                Taken {formatDate(latest.taken_at)}
              </Text>
            </View>

            <Dumbbell rows={domainRows} max={20} width={cardWidth} />

            {previous && (
              <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
                <Key color={chart.before} label={`Previous (${formatDate(previous.taken_at)})`} />
                <Key color={chart.now} label="Latest" />
              </View>
            )}
          </View>
        )}
      </Card>

      {assessments.length > 1 && (
        <Card>
          <Text variant="heading">Check-in history</Text>
          {assessments.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" color="textMuted">
                {formatDate(a.taken_at)}
              </Text>
              <Text variant="label">
                {a.total_score} · {bandInfo(a.band).label}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Text variant="caption" color="textMuted">
        These scores are practice and self-report data, not a diagnostic
        assessment.
      </Text>
    </Screen>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

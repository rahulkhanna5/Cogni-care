import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';

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
import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
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
  const { authedFetch, user } = useAuth();
  const { width } = useWindowDimensions();

  const [patient, setPatient] = useState<doctorApi.PatientSummary | null>(null);
  const [assessments, setAssessments] = useState<doctorApi.ServerAssessment[]>([]);
  const [sessions, setSessions] = useState<doctorApi.ServerSession[]>([]);
  const [remarks, setRemarks] = useState<doctorApi.Remark[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Remark composer. Kept apart from the read-only state above since it is
  // the one piece of this screen the doctor writes to, not just reads.
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [draftPlan, setDraftPlan] = useState('');
  const [aiProvenance, setAiProvenance] = useState<{ raw: string; model: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarkError, setRemarkError] = useState<string | null>(null);

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

  function openComposer() {
    setDraftBody('');
    setDraftPlan('');
    setAiProvenance(null);
    setRemarkError(null);
    setComposerOpen(true);
  }

  async function draftWithAi() {
    setDrafting(true);
    setRemarkError(null);
    try {
      const draft = await authedFetch((t) => doctorApi.draftRemark(t, id));
      setDraftBody(draft.body);
      setDraftPlan(draft.plan);
      setAiProvenance({ raw: draft.raw, model: draft.model });
    } catch (e) {
      setRemarkError(e instanceof ApiError ? e.message : 'Could not draft a remark right now.');
    } finally {
      setDrafting(false);
    }
  }

  async function saveRemark() {
    if (!draftBody.trim()) return;
    setSaving(true);
    setRemarkError(null);
    try {
      const { remark } = await authedFetch((t) =>
        doctorApi.saveRemark(t, id, {
          body: draftBody.trim(),
          plan: draftPlan.trim() || undefined,
          // Recorded only when this save actually came from an AI draft —
          // free-hand edits after drafting still count, but a remark typed
          // from scratch must not claim an AI origin it does not have.
          aiDraft: aiProvenance?.raw,
          aiModel: aiProvenance?.model,
        })
      );
      setRemarks((prev) => [
        {
          ...remark,
          plan: remark.plan ?? null,
          visible_to_patient: false,
          // The name on the account that just authenticated this save — the
          // same value the server would return if this list were re-fetched.
          author_name: user?.name ?? 'You',
        },
        ...prev,
      ]);
      setComposerOpen(false);
    } catch (e) {
      setRemarkError(e instanceof ApiError ? e.message : 'Could not save the remark.');
    } finally {
      setSaving(false);
    }
  }

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

      <Button
        label="Chat about this patient"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/patient/[id]/chat', params: { id, name: patient?.name ?? '' } })
        }
      />

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

      {/* A third panel, distinct in kind from the two above: those are raw
          data, this is a clinician's interpretation of it. An AI draft can
          seed it, but nothing here was written by the AI unedited — see
          draftWithAi / saveRemark. */}
      <Card>
        <Text variant="heading">Remarks</Text>
        <Text variant="body" color="textMuted">
          Notes for the care team. Not shown to the patient.
        </Text>

        {remarks.length === 0 && !composerOpen && (
          <Text variant="body" color="textMuted" style={{ marginTop: space.sm }}>
            No remarks yet.
          </Text>
        )}

        {!composerOpen && (
          <View style={{ gap: space.md, marginTop: space.sm }}>
            {remarks.map((r) => (
              <View
                key={r.id}
                style={{
                  gap: space.xs,
                  paddingTop: space.sm,
                  borderTopWidth: remarks[0] === r ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="label">{r.author_name}</Text>
                  <Text variant="caption" color="textMuted">
                    {formatDate(r.created_at)}
                  </Text>
                </View>
                <Text variant="body">{r.body}</Text>
                {r.plan && (
                  <View
                    style={{
                      marginTop: space.xs,
                      padding: space.sm,
                      borderRadius: radius.md,
                      backgroundColor: colors.accentSoft,
                    }}
                  >
                    <Text variant="caption" color="accent">
                      Training plan
                    </Text>
                    <Text variant="body">{r.plan}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {composerOpen ? (
          <View style={{ gap: space.md, marginTop: space.md }}>
            <Button
              label={drafting ? 'Drafting…' : 'Draft with AI'}
              variant="secondary"
              onPress={draftWithAi}
              disabled={drafting || saving}
            />

            {aiProvenance && (
              <Text variant="caption" color="textMuted">
                Drafted by {aiProvenance.model}. Read it over — edit anything before saving.
              </Text>
            )}

            <View style={{ gap: space.sm }}>
              <Text variant="label">Observations</Text>
              <TextInput
                value={draftBody}
                onChangeText={setDraftBody}
                placeholder="What you are seeing in this patient's results…"
                placeholderTextColor={colors.disabled}
                multiline
                style={composerInputStyle}
              />
            </View>

            <View style={{ gap: space.sm }}>
              <Text variant="label">Training plan (optional)</Text>
              <TextInput
                value={draftPlan}
                onChangeText={setDraftPlan}
                placeholder="Which exercises, how often…"
                placeholderTextColor={colors.disabled}
                multiline
                style={composerInputStyle}
              />
            </View>

            {remarkError && (
              <View
                style={{
                  backgroundColor: colors.dangerSoft,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: colors.danger,
                  padding: space.md,
                }}
              >
                <Text variant="body" color="danger">
                  {remarkError}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label={saving ? 'Saving…' : 'Save remark'}
                onPress={saveRemark}
                disabled={!draftBody.trim() || saving || drafting}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                variant="quiet"
                onPress={() => setComposerOpen(false)}
                disabled={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <Button label="Write a remark" onPress={openComposer} style={{ marginTop: space.sm }} />
        )}
      </Card>

      <Text variant="caption" color="textMuted">
        These scores are practice and self-report data, not a diagnostic
        assessment.
      </Text>
    </Screen>
  );
}

const composerInputStyle = {
  minHeight: TOUCH_MIN * 1.6,
  borderWidth: 2,
  borderColor: colors.border,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  paddingHorizontal: space.md,
  paddingTop: space.sm,
  fontSize: 20,
  color: colors.text,
  textAlignVertical: 'top',
} as const;

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

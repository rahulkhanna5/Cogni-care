import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { bandInfo } from '@/assessment/scoring';
import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { Dumbbell, type DumbbellRow } from '@/charts/Dumbbell';
import { LevelMeter } from '@/charts/LevelMeter';
import { Sparkline } from '@/charts/Sparkline';
import { DOMAIN_LABELS, type Domain } from '@/db/types';
import { getGame } from '@/games/registry';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme/tokens';
import {
  Banner,
  Button,
  Card,
  InfoRow,
  Score,
  Screen,
  ScreenHeader,
  StatTile,
  SurfaceProvider,
  Text,
  TextField,
} from '@/ui';

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
          setError(e instanceof ApiError ? e.message : 'Could not load this patient’s records.');
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
        const reactions = rows.map((r) => r.avg_reaction_ms).filter((n): n is number => n != null);
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

  return (
    <Screen>
      <ScreenHeader title={patient?.name ?? 'Patient'} onBack={() => router.back()} />

      <Button
        label="Chat about this patient"
        variant="secondary"
        icon="chatbox-ellipses-outline"
        onPress={() => router.push({ pathname: '/patient/[id]/chat', params: { id, name: patient?.name ?? '' } })}
      />

      <Text variant="body" color="textMuted">
        {patient?.email}
      </Text>

      {/* On the page, not inside a card: nested in one, each tile had ~60dp
          for its label and "Sessions" broke mid-word. */}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <StatTile value={String(sessions.length)} label="Sessions" />
        <StatTile value={String(assessments.length)} label="Check-ins" />
        <StatTile value={String(rollups.length)} label="Games used" />
      </View>

      {/* Two panels, same separation as the patient's own dashboard. The
          games and the questionnaire do not measure the same things, and a
          combined figure would imply a link the data cannot support. */}
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Games</Text>
          <Text variant="body" color="textMuted">
            Performance in the exercises. Higher is better.
          </Text>
        </View>

        {rollups.length === 0 ? (
          <Text variant="body" color="textMuted">
            No sessions shared yet.
          </Text>
        ) : (
          rollups.map((r) => {
            const meta = getGame(r.gameId);
            return (
              <View key={r.gameId} style={{ gap: space.sm }}>
                <LevelMeter title={meta?.title ?? r.gameId} level={r.level} max={meta?.maxLevel ?? 15} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="textMuted">
                    Accuracy, last {r.trend.length} {r.trend.length === 1 ? 'session' : 'sessions'}
                  </Text>
                  <Text variant="label">Avg {Math.round(r.meanAccuracy * 100)}%</Text>
                </View>
                <Sparkline values={r.trend} />
                <Text variant="caption" color="textMuted">
                  {r.plays} {r.plays === 1 ? 'session' : 'sessions'}
                  {r.meanReactionMs != null ? ` · ${r.meanReactionMs} ms average` : ''}
                  {r.lastPlayed ? ` · last ${formatDate(r.lastPlayed)}` : ''}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Check-in</Text>
          <Text variant="body" color="textMuted">
            Self-reported difficulty. Lower is better.
          </Text>
        </View>

        {!latest ? (
          <Text variant="body" color="textMuted">
            No check-in shared yet.
          </Text>
        ) : (
          <>
            <View>
              <Score value={latest.total_score} max={100} />
              <Text variant="heading" color="warning">
                {bandInfo(latest.band).label}
              </Text>
              <Text variant="caption" color="textMuted">
                Taken {formatDate(latest.taken_at)}
              </Text>
            </View>

            <Dumbbell
              rows={domainRows}
              max={20}
              beforeLabel={previous ? `Previous (${formatDate(previous.taken_at)})` : undefined}
              nowLabel="Latest"
            />
          </>
        )}
      </Card>

      {assessments.length > 1 && (
        <Card>
          <Text variant="heading">Check-in history</Text>
          {assessments.map((a) => (
            <InfoRow
              key={a.id}
              label={formatDate(a.taken_at)}
              value={`${a.total_score} · ${bandInfo(a.band).label}`}
            />
          ))}
        </Card>
      )}

      {/* A third panel, distinct in kind from the two above: those are raw
          data, this is a clinician's interpretation of it. An AI draft can
          seed it, but nothing here was written by the AI unedited — see
          draftWithAi / saveRemark. */}
      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text variant="heading">Remarks</Text>
          <Text variant="body" color="textMuted">
            Notes for the care team. Not shown to the patient.
          </Text>
        </View>

        {!composerOpen && remarks.length === 0 && (
          <Text variant="body" color="textMuted">
            No remarks yet.
          </Text>
        )}

        {!composerOpen &&
          remarks.map((r, i) => (
            <View
              key={r.id}
              style={{
                gap: space.sm,
                paddingTop: i === 0 ? 0 : space.md,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.divider,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                <Text variant="label">{r.author_name}</Text>
                <Text variant="caption" color="textMuted">
                  {formatDate(r.created_at)}
                </Text>
              </View>
              <Text variant="body">{r.body}</Text>
              {r.plan && (
                <SurfaceProvider value="raised">
                  <View
                    style={{
                      gap: space.xs,
                      padding: space.md,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceRaised,
                    }}
                  >
                    <Text variant="label" color="accent">
                      Training plan
                    </Text>
                    <Text variant="body">{r.plan}</Text>
                  </View>
                </SurfaceProvider>
              )}
            </View>
          ))}

        {composerOpen ? (
          <View style={{ gap: space.md }}>
            <Button
              label={drafting ? 'Drafting…' : 'Draft with AI'}
              variant="secondary"
              icon="sparkles-outline"
              busy={drafting}
              disabled={saving}
              onPress={draftWithAi}
            />

            {/* The draft must never look final: it is labelled as a draft
                from a named model, for the doctor to check and change. */}
            {aiProvenance && (
              <Banner tone="info" icon="sparkles-outline">
                {`Drafted by ${aiProvenance.model}. Read it over — edit anything before saving.`}
              </Banner>
            )}

            <TextField
              label="Observations"
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="What you are seeing in this patient's results…"
              multiline
              minLines={4}
            />
            <TextField
              label="Training plan (optional)"
              value={draftPlan}
              onChangeText={setDraftPlan}
              placeholder="Which exercises, how often…"
              multiline
              minLines={3}
            />

            {remarkError && <Banner tone="error">{remarkError}</Banner>}

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label={saving ? 'Saving…' : 'Save remark'}
                busy={saving}
                onPress={saveRemark}
                disabled={!draftBody.trim() || drafting}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setComposerOpen(false)}
                disabled={saving}
                style={{ flex: 1 }}
              />
            </View>
            {!draftBody.trim() && !drafting && (
              <Text variant="caption" color="textMuted">
                Write your observations, or draft them with AI, to save.
              </Text>
            )}
          </View>
        ) : (
          <Button label="Write a remark" icon="create-outline" onPress={openComposer} />
        )}
      </Card>

      <Text variant="caption" color="textMuted">
        These scores are practice and self-report data, not a diagnostic assessment.
      </Text>
    </Screen>
  );
}

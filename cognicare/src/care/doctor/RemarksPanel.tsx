import { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme/tokens';
import { Banner, Button, Card, SurfaceProvider, Text, TextField } from '@/ui';
import { formatDate } from './parts';

/**
 * The doctor's own notes. Raw data lives on the other tabs; this is a
 * clinician's interpretation of it. An AI draft can seed a note, but nothing
 * here was written by the AI unedited — the draft is labelled, editable, and
 * only saved when the doctor presses save.
 */
export function RemarksPanel({
  patientId,
  remarks,
  onAdded,
}: {
  patientId: string;
  remarks: doctorApi.Remark[];
  onAdded: (remark: doctorApi.Remark) => void;
}) {
  const { authedFetch, user } = useAuth();

  const [composerOpen, setComposerOpen] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [draftPlan, setDraftPlan] = useState('');
  const [aiProvenance, setAiProvenance] = useState<{ raw: string; model: string } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarkError, setRemarkError] = useState<string | null>(null);

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
      const draft = await authedFetch((t) => doctorApi.draftRemark(t, patientId));
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
        doctorApi.saveRemark(t, patientId, {
          body: draftBody.trim(),
          plan: draftPlan.trim() || undefined,
          // Recorded only when this save actually came from an AI draft — a
          // note typed from scratch must not claim an AI origin.
          aiDraft: aiProvenance?.raw,
          aiModel: aiProvenance?.model,
        })
      );
      onAdded({
        ...remark,
        plan: remark.plan ?? null,
        visible_to_patient: false,
        author_name: user?.name ?? 'You',
      });
      setComposerOpen(false);
    } catch (e) {
      setRemarkError(e instanceof ApiError ? e.message : 'Could not save the remark.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Text variant="heading">Notes</Text>
        <Text variant="body" color="textMuted">
          Notes for the care team. Not shown to the patient.
        </Text>
      </View>

      {!composerOpen && remarks.length === 0 && (
        <Text variant="body" color="textMuted">
          No notes yet.
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

          {/* The draft must never look final: it is labelled as a draft from a
              named model, for the doctor to check and change. */}
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
              label={saving ? 'Saving…' : 'Save note'}
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
        <Button label="Write a note" icon="create-outline" onPress={openComposer} />
      )}
    </Card>
  );
}

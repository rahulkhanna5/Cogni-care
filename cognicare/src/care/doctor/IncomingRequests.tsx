import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { space } from '@/theme/tokens';
import { Banner, Button, Card, Text } from '@/ui';
import { formatDate } from './parts';

/**
 * Patients who asked this doctor, waiting for the doctor's own yes or no. They
 * appear the moment the request is sent; an administrator checks it too. Nothing
 * about the patient is readable until both have said yes — the server enforces
 * that, this only asks.
 *
 * Shows nothing at all when there is nothing to answer, so an ordinary day
 * has no extra card on the screen.
 */
export function IncomingRequests({
  requests,
  accepted = [],
  onAnswered,
}: {
  requests: doctorApi.MyRequest[];
  /** Accepted by this doctor, still with the administrator. */
  accepted?: doctorApi.MyRequest[];
  /** Called after any answer, so the patient list can reload. */
  onAnswered: () => void;
}) {
  const { authedFetch } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    async (id: string, accept: boolean) => {
      setBusy(`${accept ? 'accept' : 'decline'}:${id}`);
      setError(null);
      try {
        await authedFetch((t) => (accept ? doctorApi.acceptRequest(t, id) : doctorApi.declineRequest(t, id)));
        onAnswered();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not send your answer. Please try again.');
        // Stale (already answered, or withdrawn): show the truth.
        if (e instanceof ApiError && e.code === 'REQUEST_NOT_AWAITING_YOU') onAnswered();
      } finally {
        setBusy(null);
      }
    },
    [authedFetch, onAnswered]
  );

  if (requests.length === 0 && accepted.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      {accepted.map((r) => (
        <Card key={r.id} style={{ gap: 2 }}>
          <Text variant="heading">{r.patient_name}</Text>
          <Text variant="caption" color="textMuted">
            You accepted · waiting for an administrator to approve
          </Text>
        </Card>
      ))}

      {requests.length > 0 && (
        <Text variant="heading">
          {requests.length === 1
            ? '1 patient is waiting for your answer'
            : `${requests.length} patients are waiting for your answer`}
        </Text>
      )}
      {error ? <Banner tone="error">{error}</Banner> : null}

      {requests.map((r) => (
        <Card key={r.id} style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">{r.patient_name}</Text>
            <Text variant="caption" color="textMuted">
              {`Asked you on ${formatDate(r.requested_at)} · ${
                r.status === 'ACTIVE' ? 'approved by an administrator' : 'an administrator is also checking it'
              }`}
            </Text>
          </View>
          <Text variant="body" color="textMuted">
            {r.status === 'ACTIVE'
              ? 'If you accept, you will see their game results and check-ins and can write remarks. If you decline, nothing is shared.'
              : 'If you accept, you will see their game results and check-ins once an administrator approves too. If you decline, nothing is shared.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Accept"
                icon="checkmark"
                busy={busy === `accept:${r.id}`}
                disabled={busy !== null}
                onPress={() => answer(r.id, true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Decline"
                variant="secondary"
                icon="close"
                busy={busy === `decline:${r.id}`}
                disabled={busy !== null}
                onPress={() => answer(r.id, false)}
              />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

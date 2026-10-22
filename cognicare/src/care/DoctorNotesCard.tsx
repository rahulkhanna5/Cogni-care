import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme/tokens';
import { Card, Skeleton, SurfaceProvider, Text } from '@/ui';
import { formatDate } from './doctor/parts';

/**
 * Notes a doctor chose to share. The server sends a patient only the notes
 * marked shared, so nothing private can reach this screen.
 */
export function DoctorNotesCard() {
  const { user, authedFetch } = useAuth();
  const [notes, setNotes] = useState<doctorApi.Remark[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      authedFetch((t) => doctorApi.listRemarks(t, user.id))
        .then((r) => !cancelled && setNotes(r.remarks))
        .catch(() => !cancelled && setNotes([]));
      return () => {
        cancelled = true;
      };
    }, [user, authedFetch])
  );

  return (
    <Card style={{ gap: space.md }}>
      <Text variant="heading">Notes from your specialist</Text>
      {notes === null ? (
        <View accessible accessibilityLabel="Loading" style={{ gap: space.xs }}>
          <Skeleton width="50%" />
          <Skeleton />
        </View>
      ) : notes.length === 0 ? (
        <Text variant="body" color="textMuted">
          No notes yet. When your specialist shares a note with you, it appears here.
        </Text>
      ) : (
        notes.map((n, i) => (
          <View
            key={n.id}
            style={{
              gap: space.xs,
              paddingTop: i === 0 ? 0 : space.md,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.divider,
            }}
          >
            <Text variant="caption" color="textMuted">
              {`${n.author_name} · ${formatDate(n.created_at)}`}
            </Text>
            <Text variant="body">{n.body}</Text>
            {n.plan ? (
              <SurfaceProvider value="raised">
                <View
                  style={{ gap: 2, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised }}
                >
                  <Text variant="label">What to practise</Text>
                  <Text variant="body">{n.plan}</Text>
                </View>
              </SurfaceProvider>
            ) : null}
          </View>
        ))
      )}
    </Card>
  );
}

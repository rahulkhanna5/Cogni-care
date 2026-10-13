import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import * as doctorApi from '@/api/doctor.api';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Card, Text } from '@/ui';
import { formatDate } from './parts';

/** Stars as icons plus the number, so the value is never colour-only. */
export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <View accessible accessibilityLabel={`${value.toFixed(1)} out of 5 stars`} style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={value >= n ? 'star' : value >= n - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={value >= n - 0.5 ? colors.warning : colors.edge}
        />
      ))}
    </View>
  );
}

/** Patient ratings a doctor has received. */
export function ReviewList({ reviews }: { reviews: doctorApi.Review[] }) {
  if (reviews.length === 0) {
    return (
      <Text variant="body" color="textMuted">
        No ratings yet.
      </Text>
    );
  }
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Stars value={avg} size={24} />
        <Text variant="label">{`${avg.toFixed(1)} from ${reviews.length} ${reviews.length === 1 ? 'patient' : 'patients'}`}</Text>
      </View>
      {reviews.map((r, i) => (
        <View
          key={`${r.patient_name}-${i}`}
          style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: space.sm }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Stars value={r.rating} />
            <Text variant="caption" color="textMuted">
              {`${r.patient_name} · ${formatDate(r.updated_at)}`}
            </Text>
          </View>
          {r.comment ? <Text variant="body">{r.comment}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** The doctor's own ratings, on their Profile. */
export function MyReviews() {
  const { authedFetch } = useAuth();
  const [reviews, setReviews] = useState<doctorApi.Review[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      authedFetch((t) => doctorApi.myReviews(t))
        .then((r) => !cancelled && setReviews(r.reviews))
        .catch(() => !cancelled && setReviews([]));
      return () => {
        cancelled = true;
      };
    }, [authedFetch])
  );
  return (
    <Card style={{ gap: space.md }}>
      <Text variant="heading">Ratings from your patients</Text>
      {reviews === null ? (
        <Text variant="body" color="textMuted">
          Loading…
        </Text>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </Card>
  );
}

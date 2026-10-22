import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import * as care from '@/api/care.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/store/auth';
import { colors, space, TOUCH_MIN } from '@/theme/tokens';
import { Banner, Button, Text, TextField } from '@/ui';

const WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

/**
 * Five large stars and an optional comment about how the consulting is going.
 * Seen by this doctor and the administrator, never by other patients.
 */
export function RateDoctor({ assignment, onSaved }: { assignment: care.MyAssignment; onSaved: () => void }) {
  const { authedFetch } = useAuth();
  const [rating, setRating] = useState(assignment.my_rating ?? 0);
  const [comment, setComment] = useState(assignment.my_comment ?? '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!open) {
    return (
      <Button
        label={
          assignment.my_rating ? `Your rating: ${assignment.my_rating} of 5 · Change` : `Rate ${assignment.doctor_name}`
        }
        variant="quiet"
        icon="star-outline"
        fullWidth={false}
        onPress={() => setOpen(true)}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{`How is it going with ${assignment.doctor_name}?`}</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space.xs }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityState={{ checked: rating === n }}
            accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}, ${WORDS[n]}`}
            onPress={() => setRating(n)}
            style={{ width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name={n <= rating ? 'star' : 'star-outline'}
              size={36}
              color={n <= rating ? colors.warning : colors.edge}
            />
          </Pressable>
        ))}
      </View>
      {rating > 0 && <Text variant="body">{WORDS[rating]}</Text>}
      <TextField
        label="Anything to add? (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        minLines={3}
        placeholder="What is helping, or what could be better"
      />
      <Text variant="caption" color="textMuted">
        Only your specialist and the administrator see this.
      </Text>
      {error && <Banner tone="error">{error}</Banner>}
      {saved && <Banner tone="success">Thank you. Your rating is saved.</Banner>}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          label="Save rating"
          icon="checkmark"
          busy={busy}
          disabled={rating === 0}
          disabledReason="Tap a star first."
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await authedFetch((t) => care.rateDoctor(t, assignment.id, rating, comment));
              setSaved(true);
              onSaved();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Could not save your rating.');
            } finally {
              setBusy(false);
            }
          }}
          style={{ flex: 1 }}
        />
        <Button label="Close" variant="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

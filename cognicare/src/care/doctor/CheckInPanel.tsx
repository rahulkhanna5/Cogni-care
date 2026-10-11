import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import type { ServerAssessment } from '@/api/doctor.api';
import { bandInfo } from '@/assessment/scoring';
import { Dumbbell, type DumbbellRow } from '@/charts/Dumbbell';
import { DOMAIN_LABELS, type Domain } from '@/db/types';
import { colors, space } from '@/theme/tokens';
import { Card, InfoRow, Score, Text } from '@/ui';
import { bandTone } from '../insight';
import { cap, formatDate } from './parts';

/**
 * The self-reported check-in. LOWER is better here, and every number on this
 * panel says so — it is the opposite direction to the games.
 */
export function CheckInPanel({ assessments }: { assessments: ServerAssessment[] }) {
  const latest = assessments[0];
  const previous = assessments[1];

  if (!latest) {
    return (
      <Card>
        <Text variant="heading">No check-in shared yet</Text>
        <Text variant="body" color="textMuted">
          The patient’s self-reported check-in appears here once they have completed one.
        </Text>
      </Card>
    );
  }

  const rows: DumbbellRow[] = (Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => ({
    label: DOMAIN_LABELS[d],
    now: latest[d],
    before: previous ? previous[d] : undefined,
  }));
  const change = previous ? latest.total_score - previous.total_score : null;
  const tone = bandTone(latest.band);

  return (
    <View style={{ gap: space.md }}>
      <Text variant="body" color="textMuted">
        Self-reported difficulty. Lower is better.
      </Text>

      <Card style={{ gap: space.md }}>
        <View>
          <Score value={latest.total_score} max={100} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons
              name={tone === 'success' ? 'checkmark-circle' : tone === 'danger' ? 'warning' : 'alert-circle'}
              size={22}
              color={colors[tone]}
            />
            <Text variant="heading" color={tone}>
              {bandInfo(latest.band).label}
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {`Taken ${formatDate(latest.taken_at)}`}
            {change === null
              ? ''
              : change === 0
                ? ' · unchanged since the last check-in'
                : ` · ${Math.abs(change)} points ${change > 0 ? 'worse' : 'better'} than the last one`}
          </Text>
        </View>

        <Dumbbell
          rows={rows}
          max={20}
          beforeLabel={previous ? `Previous (${formatDate(previous.taken_at)})` : undefined}
          nowLabel="Latest"
        />
      </Card>

      {assessments.length > 1 && (
        <Card>
          <Text variant="heading">History</Text>
          {assessments.map((a) => (
            <InfoRow key={a.id} label={formatDate(a.taken_at)} value={`${a.total_score} · ${cap(a.band)}`} />
          ))}
        </Card>
      )}
    </View>
  );
}

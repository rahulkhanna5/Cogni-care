import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { colors, radius, space, TOUCH_MIN } from '@/theme/tokens';
import { SurfaceProvider, Text, type IconName } from '@/ui';
import { describeReason, type AttentionReason } from '../insight';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TONE_ICON: Record<'success' | 'warning' | 'danger', IconName> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'warning',
};

/**
 * One fact at a glance. The tone is an icon as well as a colour, so it never
 * rests on colour alone. Sits on a white tile, where coloured text clears 7:1.
 */
export function Fact({
  label,
  value,
  tone,
  caption,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger';
  caption?: string;
}) {
  return (
    <SurfaceProvider value="surface">
      <View
        accessible
        accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ''}`}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingVertical: space.md,
          paddingHorizontal: space.sm + 2,
          gap: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </Text>
          {tone && <Ionicons name={TONE_ICON[tone]} size={18} color={colors[tone]} />}
        </View>
        {/* Wraps at spaces rather than cutting a value off with an ellipsis. */}
        <Text variant="label" color={tone ?? 'text'}>
          {value}
        </Text>
        {caption ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </SurfaceProvider>
  );
}

type Tab<T extends string> = { value: T; label: string };

/** Section switcher. A filled, thicker edge marks the open one — shape, not only colour. */
export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <Pressable
            key={t.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(t.value)}
            style={{
              flexGrow: 1,
              minWidth: 78,
              minHeight: TOUCH_MIN,
              paddingHorizontal: space.sm,
              borderRadius: radius.md,
              borderWidth: selected ? 3 : 2,
              borderColor: selected ? colors.accentBright : colors.edge,
              backgroundColor: selected ? colors.selected : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SurfaceProvider value={selected ? 'selected' : 'surface'}>
              <Text variant="label" numberOfLines={1}>
                {t.label}
              </Text>
            </SurfaceProvider>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The reasons a patient is worth a look, one plain line each. */
export function ReasonList({ reasons }: { reasons: AttentionReason[] }) {
  return (
    <View style={{ gap: space.xs }}>
      {reasons.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          <Text variant="body" style={{ flex: 1 }}>
            {describeReason(r)}
          </Text>
        </View>
      ))}
    </View>
  );
}

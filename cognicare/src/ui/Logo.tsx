import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  size?: number;
  /** Draw the dark rounded square behind the mark, as on the app icon. */
  tile?: boolean;
};

/**
 * The lantern mark: a coral "C" with one warm light in its opening — the one
 * soft light guiding the way.
 */
export function Logo({ size = 56, tile = true }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="CogniCare">
      {tile && <Rect x={0} y={0} width={100} height={100} rx={24} fill={colors.surface} />}
      <Path
        d="M 69.8 30.2 A 28 28 0 1 0 69.8 69.8"
        stroke={colors.accent}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={73} cy={50} r={7.5} fill={colors.tile} />
    </Svg>
  );
}

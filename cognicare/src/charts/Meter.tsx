import Svg, { Rect } from 'react-native-svg';

import { chart, mark } from './colors';

type Props = {
  value: number;
  max: number;
  width: number;
};

/** A single ratio against a limit — a meter on the same track, not a one-bar chart. */
export function Meter({ value, max, width }: Props) {
  const filled = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  // Keep a visible stub at zero so the track never reads as broken.
  const w = filled === 0 ? 0 : Math.max(mark.trackHeight, filled * width);

  return (
    <Svg width={width} height={mark.trackHeight}>
      <Rect x={0} y={0} width={width} height={mark.trackHeight} rx={mark.radius} fill={chart.track} />
      {w > 0 && <Rect x={0} y={0} width={w} height={mark.trackHeight} rx={mark.radius} fill={chart.now} />}
    </Svg>
  );
}

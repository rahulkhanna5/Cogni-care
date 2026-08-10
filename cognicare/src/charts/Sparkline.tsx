import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import { chart, mark } from './colors';

type Props = {
  /** Oldest → newest, each 0..1. */
  values: number[];
  width: number;
  height?: number;
};

/**
 * Accuracy across recent sessions. A single series, so no legend — the row
 * label names it. The last point is marked and the value is printed beside
 * the chart by the caller, because a mobile chart has no hover layer to
 * fall back on.
 */
export function Sparkline({ values, width, height = 40 }: Props) {
  if (values.length < 2) {
    return (
      <Svg width={width} height={height}>
        <Rect
          x={0}
          y={height / 2 - 1}
          width={width}
          height={2}
          rx={1}
          fill={chart.track}
        />
      </Svg>
    );
  }

  const pad = mark.dot / 2 + 1;
  const plotH = height - pad * 2;
  const step = (width - pad * 2) / (values.length - 1);

  // Fixed 0..1 domain rather than min/max of the data. Rescaling to the data
  // would make a flat run of 88% look like wild swings.
  const points = values
    .map((v, i) => `${pad + i * step},${pad + (1 - Math.max(0, Math.min(1, v))) * plotH}`)
    .join(' ');

  const lastX = pad + (values.length - 1) * step;
  const lastY = pad + (1 - Math.max(0, Math.min(1, values[values.length - 1]))) * plotH;

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={pad} width={width} height={plotH} rx={4} fill={chart.track} opacity={0.35} />
      <Polyline
        points={points}
        fill="none"
        stroke={chart.now}
        strokeWidth={mark.lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={lastX} cy={lastY} r={mark.dot / 2} fill={chart.now} stroke={chart.ring} strokeWidth={2} />
    </Svg>
  );
}

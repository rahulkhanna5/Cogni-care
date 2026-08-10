import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'worried' | 'calm';

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprised: 'surprised',
  worried: 'worried',
  calm: 'calm',
};

/**
 * Expressions as geometry rather than artwork, so `intensity` can make them
 * subtler at higher levels — the deck asks for micro-expressions late on.
 *
 * browInner: negative lifts the inner brow (sad/worried), positive lowers it (angry)
 * mouthCurve: positive smiles, negative frowns
 * mouthOpen: height of an open mouth
 * eyeOpen: eye height multiplier
 */
const SHAPES: Record<Emotion, { browInner: number; mouthCurve: number; mouthOpen: number; eyeOpen: number }> = {
  happy: { browInner: -2, mouthCurve: 18, mouthOpen: 0, eyeOpen: 1 },
  sad: { browInner: -8, mouthCurve: -14, mouthOpen: 0, eyeOpen: 0.85 },
  angry: { browInner: 9, mouthCurve: -8, mouthOpen: 0, eyeOpen: 0.9 },
  surprised: { browInner: -6, mouthCurve: 0, mouthOpen: 16, eyeOpen: 1.45 },
  worried: { browInner: -6, mouthCurve: -7, mouthOpen: 0, eyeOpen: 1.05 },
  calm: { browInner: 0, mouthCurve: 3, mouthOpen: 0, eyeOpen: 1 },
};

type Props = {
  emotion: Emotion;
  size: number;
  /** 1 = full expression, lower = subtler. */
  intensity?: number;
};

export function Face({ emotion, size, intensity = 1 }: Props) {
  const s = SHAPES[emotion];
  const k = Math.max(0.15, Math.min(1, intensity));

  const browInner = s.browInner * k;
  const mouthCurve = s.mouthCurve * k;
  const mouthOpen = s.mouthOpen * k;
  const eyeRy = 7 * (1 + (s.eyeOpen - 1) * k);

  // 100x100 viewBox keeps the maths readable regardless of rendered size.
  const leftBrow = `M 26 ${34 + browInner} Q 34 ${29 + browInner * 0.4} 43 33`;
  const rightBrow = `M 74 ${34 + browInner} Q 66 ${29 + browInner * 0.4} 57 33`;
  const mouth = `M 33 ${66 - mouthCurve * 0.2} Q 50 ${66 + mouthCurve} 67 ${66 - mouthCurve * 0.2}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" fill="#F6DCB4" stroke={colors.text} strokeWidth={2.5} />

      <Ellipse cx="35" cy="45" rx="6" ry={eyeRy} fill={colors.text} />
      <Ellipse cx="65" cy="45" rx="6" ry={eyeRy} fill={colors.text} />

      <Path d={leftBrow} stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d={rightBrow} stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />

      {mouthOpen > 1 ? (
        <Ellipse cx="50" cy="68" rx="11" ry={mouthOpen} fill={colors.text} />
      ) : (
        <Path d={mouth} stroke={colors.text} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}

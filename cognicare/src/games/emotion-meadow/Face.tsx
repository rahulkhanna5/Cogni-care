import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * Face ink is fixed dark, deliberately NOT the theme's text colour. The face
 * itself is always a light circle, so on the dark theme a light text colour
 * would draw the eyes, brows and mouth in near-invisible ink on a pale face.
 * Features must contrast with the face, not with the page behind it.
 */
const INK = '#221F20';

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
 * Expressions as geometry so `intensity` can soften them by level.
 *
 * browInner  positive drives the INNER brow end down (angry); negative lifts it (sad, worried).
 *            The inner end is the one nearest the nose — getting this backwards
 *            swaps angry and sad, which is exactly what shipped first.
 * browRaise  lifts BOTH brows bodily (surprise).
 * mouthCurve positive smiles, negative frowns.
 * mouthOpen  height of an open mouth; overrides the curve when > 1.
 * eyeOpen    eye height multiplier.
 * tear       a tear on the cheek — a categorical cue, not a graded one.
 * tint       face fill; hue supports the expression rather than carrying it.
 */
const SHAPES: Record<
  Emotion,
  {
    browInner: number;
    browRaise: number;
    mouthCurve: number;
    mouthOpen: number;
    eyeOpen: number;
    tear?: boolean;
    tint: string;
  }
> = {
  happy: { browInner: -1, browRaise: 1, mouthCurve: 22, mouthOpen: 0, eyeOpen: 0.8, tint: '#FFD9A0' },
  sad: { browInner: -9, browRaise: -1, mouthCurve: -18, mouthOpen: 0, eyeOpen: 0.9, tear: true, tint: '#BFD4E8' },
  angry: { browInner: 11, browRaise: -3, mouthCurve: -12, mouthOpen: 0, eyeOpen: 0.75, tint: '#F2A9A0' },
  surprised: { browInner: -3, browRaise: -9, mouthCurve: 0, mouthOpen: 15, eyeOpen: 1.6, tint: '#FFE9A8' },
  worried: { browInner: -7, browRaise: -2, mouthCurve: -6, mouthOpen: 0, eyeOpen: 1.15, tint: '#E4DCC6' },
  calm: { browInner: 0, browRaise: 0, mouthCurve: 6, mouthOpen: 0, eyeOpen: 1, tint: '#F6DCB4' },
};

/** Blend a tint toward neutral as the expression softens. */
function mix(hex: string, toward: string, amount: number) {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(toward);
  const c = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Where each brow's ends sit vertically. Exported so the angry/sad inversion
 * can be pinned by a test — larger y is lower on the face.
 */
export function browEnds(emotion: Emotion, intensity = 1) {
  const s = SHAPES[emotion];
  const k = Math.max(0.45, Math.min(1, intensity));
  const outerY = 33 + s.browRaise * k;
  return { outerY, innerY: outerY + s.browInner * k };
}

type Props = {
  emotion: Emotion;
  size: number;
  /** 1 = full expression, lower = subtler. Floored so it stays readable. */
  intensity?: number;
};

export function Face({ emotion, size, intensity = 1 }: Props) {
  const s = SHAPES[emotion];
  // Below about 0.45 the expressions stop being fairly distinguishable even
  // for someone with no impairment, so the floor is a fairness limit.
  const k = Math.max(0.45, Math.min(1, intensity));

  const browInner = s.browInner * k;
  const browRaise = s.browRaise * k;
  const mouthCurve = s.mouthCurve * k;
  const mouthOpen = s.mouthOpen * k;
  const eyeRy = 7 * (1 + (s.eyeOpen - 1) * k);
  const fill = mix('#F6DCB4', s.tint, k);

  // 100x100 viewBox. Face centre is x=50, so x=43/57 are the INNER brow ends.
  const { outerY, innerY } = browEnds(emotion, intensity);
  const ctrlY = (outerY + innerY) / 2 - 2;
  const leftBrow = `M 25 ${outerY} Q 34 ${ctrlY} 43 ${innerY}`;
  const rightBrow = `M 75 ${outerY} Q 66 ${ctrlY} 57 ${innerY}`;
  const mouth = `M 32 ${67 - mouthCurve * 0.25} Q 50 ${67 + mouthCurve} 68 ${67 - mouthCurve * 0.25}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" fill={fill} stroke={INK} strokeWidth={2.5} />

      <Ellipse cx="35" cy="47" rx="6" ry={eyeRy} fill={INK} />
      <Ellipse cx="65" cy="47" rx="6" ry={eyeRy} fill={INK} />

      {s.tear && k > 0.5 && (
        <Path
          d="M 35 56 q -4 7 0 9 q 4 -2 0 -9 z"
          fill="#5B8FD6"
          stroke="#3F6FB0"
          strokeWidth={0.8}
        />
      )}

      <Path d={leftBrow} stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <Path d={rightBrow} stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" />

      {mouthOpen > 1 ? (
        <Ellipse cx="50" cy="69" rx="11" ry={mouthOpen} fill={INK} />
      ) : (
        <Path d={mouth} stroke={INK} strokeWidth={3.8} fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}

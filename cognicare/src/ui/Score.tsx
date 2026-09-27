import { Text } from './Text';

/** A headline score: "39 / 100", the number large and the scale beside it. */
export function Score({ value, max }: { value: number; max: number }) {
  return (
    <Text variant="numeral" accessibilityLabel={`${value} out of ${max}`}>
      {value}
      <Text variant="heading" color="textMuted">
        {`  / ${max}`}
      </Text>
    </Text>
  );
}

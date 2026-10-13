import { useState } from 'react';
import { View } from 'react-native';

import { space } from '@/theme/tokens';
import { Banner, Button } from '@/ui';

/**
 * Two buttons: a readable report (PDF) and the raw rows (CSV). Each builds its
 * content only when pressed, so opening a screen never fetches export data.
 */
export function ExportButtons({ onPdf, onCsv }: { onPdf: () => Promise<void>; onCsv: () => Promise<void> }) {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'pdf' | 'csv', fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch {
      setError('Could not export right now. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Report (PDF)"
            variant="secondary"
            icon="document-text-outline"
            busy={busy === 'pdf'}
            disabled={busy !== null}
            onPress={() => run('pdf', onPdf)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Data (CSV)"
            variant="secondary"
            icon="download-outline"
            busy={busy === 'csv'}
            disabled={busy !== null}
            onPress={() => run('csv', onCsv)}
          />
        </View>
      </View>
      {error ? <Banner tone="error">{error}</Banner> : null}
    </View>
  );
}

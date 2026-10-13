import { Component, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Button, Text } from '@/ui';

/**
 * Catches a failure to open the on-device database and says what to do,
 * instead of a crash screen.
 *
 * On the web the database is one file in the browser's private storage, and
 * only ONE tab may hold it open (an OPFS access handle is exclusive). A second
 * tab used to die with "NoModificationAllowedError: createSyncAccessHandle".
 * Try again remounts the provider, which re-opens the file once the other tab
 * has let go (on the web by reloading the page — see retry).
 */
export class DatabaseGate extends Component<
  { children: (attempt: number) => ReactNode },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  retry = () => {
    // expo-sqlite caches the failed open promise for this database, so a
    // remount alone would replay the failure. On the web a reload starts clean.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
  };

  render() {
    const { error, attempt } = this.state;
    if (!error) return this.props.children(attempt);

    const locked = isLocked(error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Text variant="title">{locked ? 'CogniCare is open in another tab' : 'Could not open your saved data'}</Text>
        <Text variant="body" color="textMuted">
          {locked
            ? 'It can only run in one browser tab at a time. Close the other CogniCare tab, then press Try again.'
            : 'Something stopped the app reading the data stored on this device. Press Try again; if it keeps happening, restart the app.'}
        </Text>
        <Button label="Try again" icon="refresh" onPress={this.retry} />
      </View>
    );
  }
}

export const isLocked = (error: Error) =>
  Platform.OS === 'web' &&
  /createSyncAccessHandle|NoModificationAllowed|Access Handle/i.test(String(error?.message ?? error));

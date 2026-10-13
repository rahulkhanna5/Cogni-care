import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as care from '@/api/care.api';
import { openRequestFor } from '@/care/status';
import { useMyRequests } from '@/care/useMyRequests';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, ScreenHeader, SkeletonList, Text } from '@/ui';

/**
 * Where a patient picks the doctor to share results with.
 *
 * Only approved doctors are listed — the server filters, so an unapproved
 * account never appears here. Asking is not sharing: the request waits for an
 * administrator, and the card says so before the button is pressed.
 */
export default function FindDoctor() {
  const router = useRouter();
  const { user, authedFetch } = useAuth();
  const { requests, busyId, error, load, request } = useMyRequests();

  const [doctors, setDoctors] = useState<care.DirectoryDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { doctors: rows } = await authedFetch((t) => care.listDoctors(t));
      setDoctors(rows);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load the list of doctors.');
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  const signedOut = !user;

  // Nothing to ask the server for until someone is signed in.
  useEffect(() => {
    if (signedOut) return;
    fetchDoctors();
    load();
  }, [signedOut, fetchDoctors, load]);

  return (
    <Screen>
      <ScreenHeader title="Find a doctor" onBack={() => router.back()} />

      {signedOut ? (
        <Card style={{ gap: space.md }}>
          <Text variant="heading">Sign in first</Text>
          <Text variant="body" color="textMuted">
            You need an account to share your results with a doctor.
          </Text>
          <Button label="Sign in or create an account" onPress={() => router.push('/login')} />
        </Card>
      ) : (
        <>
          <Banner tone="info" icon="shield-checkmark-outline">
            Asking a doctor does not share anything yet. Your request is checked first, and you can stop sharing at any
            time.
          </Banner>

          {(loadError || error) && <Banner tone="error">{loadError ?? error}</Banner>}

          {loading ? (
            <SkeletonList count={3} lines={2} avatar />
          ) : loadError ? (
            <Button label="Try again" variant="secondary" icon="refresh" onPress={fetchDoctors} />
          ) : doctors.length === 0 ? (
            <Card>
              <Text variant="heading">No doctors yet</Text>
              <Text variant="body" color="textMuted">
                Doctors appear here once they have registered and been approved.
              </Text>
            </Card>
          ) : (
            doctors.map((d) => {
              const open = openRequestFor(d.id, requests);
              return (
                <Card key={d.id} style={{ gap: space.md }} accessibilityLabel={d.name}>
                  <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: colors.tint,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="medkit" size={26} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{d.name}</Text>
                      {d.specialty ? (
                        <Text variant="caption" color="textMuted">
                          {d.specialty}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {d.bio ? (
                    <Text variant="body" numberOfLines={4}>
                      {d.bio}
                    </Text>
                  ) : null}

                  {open ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                      <Ionicons
                        name={open.status === 'ACTIVE' ? 'checkmark-circle' : 'time-outline'}
                        size={22}
                        color={open.status === 'ACTIVE' ? colors.success : colors.edge}
                      />
                      <Text variant="label">
                        {open.status === 'ACTIVE' ? 'Your doctor' : 'Request sent · waiting for approval'}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      label="Ask this doctor"
                      icon="paper-plane-outline"
                      busy={busyId === d.id}
                      onPress={() => request(d.id)}
                    />
                  )}
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

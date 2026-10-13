import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import * as doctorApi from '@/api/doctor.api';
import { IncomingRequests } from '@/care/doctor/IncomingRequests';
import { ReasonList } from '@/care/doctor/parts';
import { needsLookFirst, statusLine, summarise, type PatientInsight } from '@/care/insight';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme/tokens';
import { Banner, Button, Card, Screen, SkeletonList, SurfaceProvider, Text, TextField } from '@/ui';

/** Past this many patients a search box earns its space. */
const SEARCH_FROM = 6;

type Row = doctorApi.PatientSummary & { insight?: PatientInsight; failed?: boolean };

/**
 * The doctor's patient list: who needs a look first, and why.
 *
 * Nothing is filtered on the client for access — the server builds the list
 * FROM the assignments table, so an unassigned patient was never sent. The
 * client only reads each patient's results to rank them.
 */
export default function Patients() {
  const router = useRouter();
  const { user, authedFetch } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [waiting, setWaiting] = useState<doctorApi.MyRequest[]>([]);
  const [withAdmin, setWithAdmin] = useState<doctorApi.MyRequest[]>([]);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { patients } = await authedFetch((token) => doctorApi.listPatients(token));
      setRows(patients);
      setLoading(false);

      // Requests waiting for this doctor's yes/no. A failure here must not
      // hide the patient list, so it is its own try.
      try {
        const { assignments } = await authedFetch((t) => doctorApi.myRequests(t));
        setWaiting(doctorApi.awaitingMe(assignments));
        setWithAdmin(doctorApi.awaitingAdmin(assignments));
      } catch {
        setWaiting([]);
        setWithAdmin([]);
      }

      // Fill each patient's summary in as it arrives, so the list is usable
      // straight away rather than waiting on the slowest one.
      await Promise.all(
        patients.map(async (p) => {
          try {
            const [s, a] = await Promise.all([
              authedFetch((t) => doctorApi.getSessions(t, p.id, 60)),
              authedFetch((t) => doctorApi.getAssessments(t, p.id, 2)),
            ]);
            const insight = summarise(s.sessions, a.assessments);
            setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, insight } : r)));
          } catch {
            setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, failed: true } : r)));
          }
        })
      );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: 'UNKNOWN', message: 'Could not load your patients.' }
      );
      setLoading(false);
    }
  }, [authedFetch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
    return needsLookFirst(matching);
  }, [rows, search]);

  const needLook = rows.filter((r) => (r.insight?.attention.length ?? 0) > 0).length;

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <Text variant="display">Your patients</Text>
        <Text variant="body" color="textMuted">
          {rows.length === 0
            ? user?.name
              ? `Signed in as ${user.name}`
              : ' '
            : needLook > 0
              ? `${rows.length} ${rows.length === 1 ? 'patient' : 'patients'} · ${needLook} to look at`
              : `${rows.length} ${rows.length === 1 ? 'patient' : 'patients'} · nothing stands out`}
        </Text>
      </View>

      {!error && <IncomingRequests requests={waiting} accepted={withAdmin} onAnswered={load} />}

      {/* The pending state is called out separately from a generic failure:
          it resolves by waiting, and saying "could not load" would be wrong. */}
      {error?.code === 'DOCTOR_PENDING_APPROVAL' ? (
        <>
          <Banner tone="info">
            <Text variant="label">Awaiting approval</Text>
            <Text variant="body">
              An administrator is reviewing your registration. Patients cannot be assigned to you until that is done.
            </Text>
          </Banner>
          <Button label="Check again" variant="secondary" icon="refresh" busy={loading} onPress={load} />
        </>
      ) : error ? (
        <>
          <Banner tone="error">{error.message}</Banner>
          <Button label="Try again" variant="secondary" icon="refresh" busy={loading} onPress={load} />
        </>
      ) : loading ? (
        <SkeletonList count={3} lines={1} avatar />
      ) : rows.length === 0 ? (
        waiting.length + withAdmin.length > 0 ? null : (
        <Card>
          <Text variant="heading">No patients yet</Text>
          <Text variant="body" color="textMuted">
            Patients appear here once they have asked you to be their doctor, an administrator has approved it, and you
            have accepted.
          </Text>
        </Card>
        )
      ) : (
        <>
          {rows.length >= SEARCH_FROM && (
            <TextField
              label="Find a patient"
              value={search}
              onChangeText={setSearch}
              placeholder="Start typing a name"
            />
          )}

          {shown.length === 0 && (
            <Text variant="body" color="textMuted">
              No patient matches that name.
            </Text>
          )}

          {shown.map((p) => {
            const reasons = p.insight?.attention ?? [];
            return (
              <Card
                key={p.id}
                style={{ gap: space.md }}
                accessibilityLabel={`${p.name}. ${p.insight ? statusLine(p.insight) : ''}${
                  reasons.length ? ' Needs a look.' : ''
                }`}
                onPress={() => router.push({ pathname: '/patient/[id]', params: { id: p.id } })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <SurfaceProvider value="selected">
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
                      <Text variant="heading" color="accent">
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </SurfaceProvider>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading">{p.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {p.failed ? 'Could not load results' : p.insight ? statusLine(p.insight) : 'Loading results…'}
                    </Text>
                  </View>
                </View>

                {reasons.length > 0 ? (
                  <ReasonList reasons={reasons} />
                ) : p.insight ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text variant="body" color="textMuted">
                      Nothing stands out
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

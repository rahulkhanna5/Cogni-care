import { useCallback, useState } from 'react';

import { ApiError } from '@/api/client';
import * as care from '@/api/care.api';
import { useAuth } from '@/store/auth';
import { requestErrorMessage } from './status';

/**
 * The patient's doctor requests: load them, send one, stop one. Shared by the
 * profile card and the directory so both always agree on what is open.
 *
 * `busyId` is the doctor or request being changed, so only that row's button
 * shows a spinner and a second tap cannot send it twice.
 */
export function useMyRequests() {
  const { authedFetch } = useAuth();
  const [requests, setRequests] = useState<care.MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown, fallback: string) =>
    setError(e instanceof ApiError ? requestErrorMessage(e.code, e.message) : fallback);

  const load = useCallback(async () => {
    try {
      const { assignments } = await authedFetch((t) => care.myAssignments(t));
      setRequests(assignments);
      setError(null);
    } catch (e) {
      fail(e, 'Could not load your requests.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch]);

  const request = useCallback(
    async (doctorId: string) => {
      setBusyId(doctorId);
      setError(null);
      try {
        await authedFetch((t) => care.requestDoctor(t, doctorId));
        await load();
      } catch (e) {
        fail(e, 'Could not send the request.');
        // Already asked? Then what is on screen is stale — show the truth.
        if (e instanceof ApiError && e.code === 'ASSIGNMENT_EXISTS') await load();
      } finally {
        setBusyId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authedFetch, load]
  );

  const stop = useCallback(
    async (assignmentId: string) => {
      setBusyId(assignmentId);
      setError(null);
      try {
        await authedFetch((t) => care.stopSharing(t, assignmentId));
        await load();
      } catch (e) {
        fail(e, 'Could not stop sharing. Please try again.');
      } finally {
        setBusyId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authedFetch, load]
  );

  return { requests, loading, busyId, error, load, request, stop };
}

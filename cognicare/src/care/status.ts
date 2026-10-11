import type { AssignmentStatus, MyAssignment } from '@/api/care.api';

/**
 * How a request reads to the person who made it. Plain words: the patient
 * should never have to know what "PENDING" means or who an "administrator" is
 * beyond "someone checks it first".
 */
export type RequestView = {
  headline: string;
  detail: string;
  tone: 'info' | 'success' | 'warning';
  /** What the person can do about it. */
  action: 'withdraw' | 'stop' | null;
};

export function describeRequest(a: Pick<MyAssignment, 'status' | 'doctor_name'>): RequestView {
  switch (a.status) {
    case 'PENDING':
      return {
        headline: 'Waiting for approval',
        detail: `Your request to ${a.doctor_name} is being checked. Nothing is shared until it is approved.`,
        tone: 'info',
        action: 'withdraw',
      };
    case 'ACTIVE':
      return {
        headline: `Sharing with ${a.doctor_name}`,
        detail: `${a.doctor_name} can see your game results and check-ins. You can stop at any time.`,
        tone: 'success',
        action: 'stop',
      };
    case 'REJECTED':
      return {
        headline: 'Not approved',
        detail: `Your request to ${a.doctor_name} was not approved. You can choose another doctor.`,
        tone: 'warning',
        action: null,
      };
    case 'REVOKED':
      return {
        headline: 'Stopped',
        detail: `You stopped sharing with ${a.doctor_name}.`,
        tone: 'info',
        action: null,
      };
  }
}

const OPEN: AssignmentStatus[] = ['PENDING', 'ACTIVE'];

/** The request that is currently open (waiting or active) with this doctor, if any. */
export const openRequestFor = (doctorId: string, all: MyAssignment[]) =>
  all.find((a) => a.doctor_id === doctorId && OPEN.includes(a.status));

/**
 * What the profile card lists: open requests, plus the most recent refusal so
 * a "not approved" is not silently swallowed. Stopped requests are history.
 */
export function visibleRequests(all: MyAssignment[]): MyAssignment[] {
  const open = all.filter((a) => OPEN.includes(a.status));
  const refused = all
    .filter((a) => a.status === 'REJECTED' && !open.some((o) => o.doctor_id === a.doctor_id))
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
    .slice(0, 1);
  return [...open, ...refused];
}

/** Server error codes worth saying in the patient's own words. */
export function requestErrorMessage(code: string | undefined, fallback: string): string {
  if (code === 'EMAIL_NOT_VERIFIED') return 'Please confirm your email address first, then try again.';
  if (code === 'ASSIGNMENT_EXISTS') return 'You have already asked this doctor.';
  if (code === 'NOT_FOUND') return 'That doctor is no longer available.';
  return fallback;
}

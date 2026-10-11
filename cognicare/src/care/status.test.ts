import type { MyAssignment } from '@/api/care.api';
import { describeRequest, openRequestFor, requestErrorMessage, visibleRequests } from './status';

const row = (over: Partial<MyAssignment>): MyAssignment => ({
  id: 'a1',
  status: 'PENDING',
  requested_at: '2026-10-01T10:00:00Z',
  approved_at: null,
  revoked_at: null,
  doctor_id: 'd1',
  doctor_name: 'Dr Rao',
  ...over,
});

describe('describeRequest', () => {
  it('a waiting request says nothing is shared yet and can be withdrawn', () => {
    const v = describeRequest(row({ status: 'PENDING' }));
    expect(v.headline).toBe('Waiting for approval');
    expect(v.detail).toMatch(/Nothing is shared/);
    expect(v.action).toBe('withdraw');
  });

  it('an active one names the doctor and offers to stop', () => {
    const v = describeRequest(row({ status: 'ACTIVE' }));
    expect(v.headline).toBe('Sharing with Dr Rao');
    expect(v.action).toBe('stop');
  });

  it('a refusal offers no action and points to another doctor', () => {
    const v = describeRequest(row({ status: 'REJECTED' }));
    expect(v.action).toBeNull();
    expect(v.detail).toMatch(/another doctor/);
  });
});

describe('requests list', () => {
  it('finds the open request with a doctor, ignoring stopped and refused ones', () => {
    const all = [
      row({ id: 'old', status: 'REVOKED' }),
      row({ id: 'no', status: 'REJECTED' }),
      row({ id: 'now', status: 'PENDING' }),
    ];
    expect(openRequestFor('d1', all)?.id).toBe('now');
    expect(openRequestFor('d2', all)).toBeUndefined();
  });

  it('shows open requests and the latest refusal, but not stopped history', () => {
    const all = [
      row({ id: 'stopped', status: 'REVOKED', doctor_id: 'd9' }),
      row({ id: 'active', status: 'ACTIVE', doctor_id: 'd1' }),
      row({ id: 'refused-old', status: 'REJECTED', doctor_id: 'd2', requested_at: '2026-09-01T00:00:00Z' }),
      row({ id: 'refused-new', status: 'REJECTED', doctor_id: 'd3', requested_at: '2026-09-20T00:00:00Z' }),
    ];
    expect(visibleRequests(all).map((a) => a.id)).toEqual(['active', 'refused-new']);
  });

  it('does not show a refusal for a doctor who has since been asked again', () => {
    const all = [
      row({ id: 'again', status: 'PENDING', doctor_id: 'd1' }),
      row({ id: 'before', status: 'REJECTED', doctor_id: 'd1' }),
    ];
    expect(visibleRequests(all).map((a) => a.id)).toEqual(['again']);
  });
});

describe('requestErrorMessage', () => {
  it('speaks plainly about an unconfirmed email', () => {
    expect(requestErrorMessage('EMAIL_NOT_VERIFIED', 'x')).toMatch(/confirm your email/);
  });
  it('falls back for anything else', () => {
    expect(requestErrorMessage('SOMETHING', 'Could not send.')).toBe('Could not send.');
  });
});

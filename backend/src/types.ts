export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type AssignmentStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';

/** The freshly-loaded user attached to every authenticated request. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  approvedAt: Date | null;
  isActive: boolean;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  email_verified_at: Date | null;
  approved_at: Date | null;
  approved_by: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  emailVerifiedAt: row.email_verified_at,
  approvedAt: row.approved_at,
  isActive: row.is_active,
});

/**
 * Public shape. `isVerified` is COMPUTED, never stored — the database keeps
 * email confirmation and admin approval as separate columns because they are
 * separate decisions. For a patient it reflects email; for a doctor it
 * reflects admin approval, which is what the frontend actually cares about.
 */
export function toPublicUser(row: UserRow) {
  const isVerified =
    row.role === 'DOCTOR' ? row.approved_at !== null : row.email_verified_at !== null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isVerified,
    emailVerified: row.email_verified_at !== null,
    approvedAt: row.approved_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Set by canAccessPatient so handlers and the audit log agree. */
      patientAccess?: { patientId: string; assignmentId: string | null; reason: string };
    }
  }
}

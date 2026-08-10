import { z } from 'zod';

const password = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(200, 'Password is too long.');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');

/**
 * Doctor fields are required only when role is DOCTOR — expressed as a
 * discriminated union so the type system, not a runtime `if`, guarantees a
 * doctor cannot be created without a specialty and licence number.
 */
export const registerSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('PATIENT'),
    name: z.string().trim().min(1).max(120),
    email,
    password,
  }),
  z.object({
    role: z.literal('DOCTOR'),
    name: z.string().trim().min(1).max(120),
    email,
    password,
    specialty: z.string().trim().min(2).max(120),
    licenseNumber: z.string().trim().min(3).max(80),
    bio: z.string().trim().max(2000).optional(),
  }),
  // Present so the API returns a clear 403 rather than a confusing 400.
  z.object({
    role: z.literal('ADMIN'),
    name: z.string().trim().min(1).max(120),
    email,
    password,
  }),
]);

export const loginSchema = z.object({ email, password: z.string().min(1) });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const verifyEmailSchema = z.object({ token: z.string().min(1) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password });

export const requestAssignmentSchema = z.object({ doctorId: z.string().uuid() });
export const rejectAssignmentSchema = z.object({ reason: z.string().trim().max(500).optional() });
export const revokeAssignmentSchema = z.object({ reason: z.string().trim().max(500).optional() });
export const approveDoctorSchema = z.object({ note: z.string().trim().max(500).optional() });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

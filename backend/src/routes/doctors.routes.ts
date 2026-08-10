import { Router } from 'express';

import { query } from '../db/pool.js';
import { paginationSchema } from '../lib/schemas.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authenticate.js';

export const doctorRoutes = Router();
doctorRoutes.use(authenticate, requireVerifiedEmail);

/**
 * The directory a patient browses to pick a doctor.
 *
 * Filtered to approved doctors at the query layer. If unapproved accounts
 * appeared here, anyone could self-register as "Dr X", show up in the list,
 * and collect trust — even with no data access. Impersonation does not need a
 * database read to do harm.
 *
 * Deliberately exposes no patient-side information, so it is safe for any
 * signed-in user.
 */
doctorRoutes.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const rows = await query(
      `SELECT u.id, u.name, p.specialty, p.bio
         FROM users u
         JOIN doctor_profiles p ON p.user_id = u.id
        WHERE u.role = 'DOCTOR' AND u.approved_at IS NOT NULL AND u.is_active
        ORDER BY u.name
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    // license_number is intentionally not exposed — it is for admin review,
    // not for public display.
    res.json({ doctors: rows });
  } catch (error) {
    next(error);
  }
});

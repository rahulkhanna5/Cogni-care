import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRoutes } from './routes/admin.routes.js';
import { assignmentRoutes } from './routes/assignments.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { doctorRoutes } from './routes/doctors.routes.js';
import { patientRoutes } from './routes/patients.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // rate limiting keys on req.ip behind a proxy
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/patients', patientRoutes);
  app.use('/api/v1/assignments', assignmentRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

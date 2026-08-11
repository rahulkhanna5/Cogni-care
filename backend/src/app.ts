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

  app.use(
    helmet({
      // This is an API consumed from another origin — a mobile app and, in
      // development, a web build served by Metro. Helmet's default of
      // same-origin makes the browser discard every response once the calling
      // page is cross-origin isolated (which the web build is, because
      // expo-sqlite's WASM worker requires COEP). CORS still decides who may
      // call; this only stops the browser throwing the reply away.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  // An empty CORS_ORIGIN means "not configured", not "allow nothing".
  // `''.split(',')` yields [''], an allowlist that matches no origin, which
  // silently rejected every browser request while looking like valid config.
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
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

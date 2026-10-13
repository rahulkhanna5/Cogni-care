import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/pool.js';

// Apply pending migrations BEFORE taking traffic. Render does not run them, and
// code that reads a new column must never be live before the column exists. If
// this throws the process exits and the platform keeps the previous deploy.
try {
  await migrate();
} catch (error) {
  console.error('startup: migrations failed, refusing to serve', error);
  process.exit(1);
}

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`cognicare-backend listening on :${config.port} (${config.env})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  });
}

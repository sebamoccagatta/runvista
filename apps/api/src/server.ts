import 'dotenv/config';

import { buildApp } from './app.js';
import { createPrismaClient } from './db/prisma.js';

const app = buildApp();

const port = Number(process.env.PORT ?? 3211);
const host = process.env.HOST ?? '127.0.0.1';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to start Runvista API');
}

const prisma = createPrismaClient(databaseUrl);

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

try {
  await prisma.$connect();

  app.log.info('PostgreSQL connection established');

  await app.listen({
    port,
    host,
  });
} catch (error) {
  app.log.error(error);

  await app.close();

  process.exitCode = 1;
}

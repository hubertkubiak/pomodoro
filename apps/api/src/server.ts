import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildApp } from './app';

const dbPath = process.env['DB_PATH'] ?? resolve(__dirname, '../data/pomodoro.db');
const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? 'localhost';

async function main(): Promise<void> {
  mkdirSync(dirname(dbPath), { recursive: true });
  const app = await buildApp({ dbPath, logger: true });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => void app.close().then(() => process.exit(0)));
  }

  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import cors from '@fastify/cors';
import type { ErrorDto } from '@pomodoro/shared';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { SessionsRepo } from './repo/sessions.repo';
import { sessionsRoutes } from './routes/sessions';
import { statsRoutes } from './routes/stats';

export interface AppOptions {
  /** Path to the SQLite file, or `:memory:`. */
  dbPath: string;
  logger?: boolean;
  /** Browser origins allowed to call the API. */
  corsOrigins?: string[];
  /** Current time, replaceable in tests. */
  now?: () => Date;
}

/** Builds the Fastify instance without calling `listen`, so tests can use `app.inject()`. */
export async function buildApp({
  dbPath,
  logger = false,
  corsOrigins = ['http://localhost:4200'],
  now = () => new Date(),
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger });
  const repo = new SessionsRepo(dbPath);
  app.addHook('onClose', async () => repo.close());

  await app.register(cors, { origin: corsOrigins });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation) {
      const body: ErrorDto = { error: error.message, details: error.validation };
      return reply.code(400).send(body);
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error(error);
      return reply.code(status).send({ error: 'Internal server error' } satisfies ErrorDto);
    }
    return reply.code(status).send({ error: error.message } satisfies ErrorDto);
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send({ error: `Not found: ${request.method} ${request.url}` } satisfies ErrorDto),
  );

  app.get('/api/health', async () => ({ status: 'ok' }));
  sessionsRoutes(app, repo, now);
  statsRoutes(app, repo, now);

  return app;
}

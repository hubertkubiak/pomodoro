import type { CreateSessionDto, ErrorDto, SessionDto } from '@pomodoro/shared';
import type { FastifyInstance } from 'fastify';
import { isValidTimeZone, localDateFormatter, utcRangeAround } from '../dates';
import type { SessionsRepo } from '../repo/sessions.repo';

const createSessionSchema = {
  body: {
    type: 'object',
    required: ['durationSec', 'completedAt'],
    additionalProperties: false,
    properties: {
      durationSec: { type: 'integer', minimum: 60, maximum: 5400 },
      completedAt: { type: 'string', format: 'date-time' },
    },
  },
};

/** Tolerance for a client clock that runs slightly ahead of the server. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const listSessionsSchema = {
  querystring: {
    type: 'object',
    required: ['date'],
    properties: {
      date: { type: 'string', format: 'date' },
      tz: { type: 'string', default: 'UTC' },
    },
  },
};

export function sessionsRoutes(app: FastifyInstance, repo: SessionsRepo, now: () => Date): void {
  app.post<{ Body: CreateSessionDto; Reply: SessionDto | ErrorDto }>(
    '/api/sessions',
    { schema: createSessionSchema },
    async (request, reply) => {
      if (Date.parse(request.body.completedAt) > now().getTime() + MAX_CLOCK_SKEW_MS) {
        return reply.code(400).send({ error: 'completedAt must not be in the future' });
      }
      return reply.code(201).send(repo.insert(request.body));
    },
  );

  app.get<{ Querystring: { date: string; tz: string } }>(
    '/api/sessions',
    { schema: listSessionsSchema },
    async (request, reply) => {
      const { date, tz } = request.query;
      if (!isValidTimeZone(tz)) {
        return reply.code(400).send({ error: `Unknown time zone: ${tz}` });
      }
      const { from, to } = utcRangeAround(date, date);
      const toLocalDate = localDateFormatter(tz);
      return repo.findBetween(from, to).filter((s) => toLocalDate(s.completedAt) === date);
    },
  );
}

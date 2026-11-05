import type { DayStatsDto } from '@pomodoro/shared';
import type { FastifyInstance } from 'fastify';
import { addDays, isValidTimeZone, localDateFormatter, utcRangeAround } from '../dates';
import type { SessionsRepo } from '../repo/sessions.repo';

const statsSchema = {
  querystring: {
    type: 'object',
    properties: {
      days: { type: 'integer', minimum: 1, maximum: 30, default: 7 },
      tz: { type: 'string', default: 'UTC' },
    },
  },
};

export function statsRoutes(app: FastifyInstance, repo: SessionsRepo, now: () => Date): void {
  app.get<{ Querystring: { days: number; tz: string } }>(
    '/api/stats',
    { schema: statsSchema },
    async (request, reply) => {
      const { days, tz } = request.query;
      if (!isValidTimeZone(tz)) {
        return reply.code(400).send({ error: `Unknown time zone: ${tz}` });
      }

      const toLocalDate = localDateFormatter(tz);
      const today = toLocalDate(now());
      const firstDay = addDays(today, 1 - days);

      // Every requested day is present, even without any sessions.
      const stats = new Map<string, { sessions: number; seconds: number }>();
      for (let i = 0; i < days; i++) {
        stats.set(addDays(firstDay, i), { sessions: 0, seconds: 0 });
      }

      const { from, to } = utcRangeAround(firstDay, today);
      for (const session of repo.findBetween(from, to)) {
        const day = stats.get(toLocalDate(session.completedAt));
        if (day) {
          day.sessions += 1;
          day.seconds += session.durationSec;
        }
      }

      return [...stats].map(
        ([date, { sessions, seconds }]): DayStatsDto => ({
          date,
          sessions,
          focusMinutes: Math.round(seconds / 60),
        }),
      );
    },
  );
}

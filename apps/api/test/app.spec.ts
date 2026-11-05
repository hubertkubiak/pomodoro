import type { DayStatsDto, SessionDto } from '@pomodoro/shared';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';

const NOW = new Date('2026-11-05T12:00:00Z');

describe('API', () => {
  let app: FastifyInstance;

  const postSession = (durationSec: unknown, completedAt: unknown) =>
    app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { durationSec, completedAt },
    });

  beforeEach(async () => {
    app = await buildApp({ dbPath: ':memory:', now: () => NOW });
  });

  afterEach(() => app.close());

  it('GET /api/health reports ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  describe('POST /api/sessions', () => {
    it('returns 201 with the saved session for valid data', async () => {
      const res = await postSession(1500, '2026-11-05T10:00:00+01:00');
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        id: 1,
        type: 'focus',
        durationSec: 1500,
        completedAt: '2026-11-05T09:00:00.000Z',
      });
    });

    it.each([59, 5401, 12.5])('returns 400 when durationSec is %s', async (durationSec) => {
      const res = await postSession(durationSec, '2026-11-05T10:00:00Z');
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: expect.any(String), details: expect.anything() });
    });

    it('returns 400 when completedAt is not a date-time', async () => {
      const res = await postSession(1500, 'yesterday');
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 in the common error format for malformed JSON', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        headers: { 'content-type': 'application/json' },
        payload: '{oops',
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: expect.any(String) });
    });
  });

  describe('GET /api/sessions', () => {
    it('lists only the sessions of the given day', async () => {
      await postSession(1500, '2026-11-04T10:00:00Z');
      await postSession(1500, '2026-11-05T10:00:00Z');
      const res = await app.inject({ method: 'GET', url: '/api/sessions?date=2026-11-05' });
      expect(res.statusCode).toBe(200);
      expect(res.json<SessionDto[]>().map((s) => s.completedAt)).toEqual([
        '2026-11-05T10:00:00.000Z',
      ]);
    });

    it('respects tz when deciding which day a session belongs to', async () => {
      await postSession(1500, '2026-11-04T23:30:00Z');
      const res = await app.inject({
        method: 'GET',
        url: '/api/sessions?date=2026-11-05&tz=Europe/Warsaw',
      });
      expect(res.json<SessionDto[]>()).toHaveLength(1);
    });

    it('returns 400 without a date', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/sessions' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/stats', () => {
    it('returns 7 days, including days without sessions as zeros', async () => {
      await postSession(1500, '2026-11-05T09:00:00Z');
      await postSession(1500, '2026-11-05T10:00:00Z');
      await postSession(600, '2026-11-02T10:00:00Z');

      const res = await app.inject({ method: 'GET', url: '/api/stats?days=7' });

      expect(res.statusCode).toBe(200);
      expect(res.json<DayStatsDto[]>()).toEqual([
        { date: '2026-10-30', sessions: 0, focusMinutes: 0 },
        { date: '2026-10-31', sessions: 0, focusMinutes: 0 },
        { date: '2026-11-01', sessions: 0, focusMinutes: 0 },
        { date: '2026-11-02', sessions: 1, focusMinutes: 10 },
        { date: '2026-11-03', sessions: 0, focusMinutes: 0 },
        { date: '2026-11-04', sessions: 0, focusMinutes: 0 },
        { date: '2026-11-05', sessions: 2, focusMinutes: 50 },
      ]);
    });

    it('defaults to 7 days', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/stats' });
      expect(res.json<DayStatsDto[]>()).toHaveLength(7);
    });

    it('groups by day in the given time zone', async () => {
      // 23:30 UTC on Nov 4 is already 00:30 on Nov 5 in Warsaw.
      await postSession(1500, '2026-11-04T23:30:00Z');

      const lastTwo = async (query: string) => {
        const res = await app.inject({ method: 'GET', url: `/api/stats?${query}` });
        return res.json<DayStatsDto[]>().map((d) => [d.date, d.sessions]);
      };

      expect(await lastTwo('days=2&tz=Europe/Warsaw')).toEqual([
        ['2026-11-04', 0],
        ['2026-11-05', 1],
      ]);
      expect(await lastTwo('days=2')).toEqual([
        ['2026-11-04', 1],
        ['2026-11-05', 0],
      ]);
    });

    it.each(['days=0', 'days=31', 'tz=Mars/Olympus'])('returns 400 for %s', async (query) => {
      const res = await app.inject({ method: 'GET', url: `/api/stats?${query}` });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  it('answers unknown routes in the common error format', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: expect.any(String) });
  });
});

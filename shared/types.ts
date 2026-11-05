/** Kind of a stored session. Only focus sessions are recorded for now. */
export type SessionType = 'focus';

/** Body of `POST /api/sessions`. */
export interface CreateSessionDto {
  /** Actual session length in seconds (60–5400). */
  durationSec: number;
  /** Completion time, ISO 8601. */
  completedAt: string;
}

/** A stored session, as returned by the API. */
export interface SessionDto extends CreateSessionDto {
  id: number;
  type: SessionType;
}

/** One day of `GET /api/stats`. Days without sessions are included with zeros. */
export interface DayStatsDto {
  /** Calendar day in the requested time zone, `YYYY-MM-DD`. */
  date: string;
  sessions: number;
  focusMinutes: number;
}

/** The single error format used by every API endpoint. */
export interface ErrorDto {
  error: string;
  details?: unknown;
}

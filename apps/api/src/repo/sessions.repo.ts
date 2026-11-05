import type { CreateSessionDto, SessionDto, SessionType } from '@pomodoro/shared';
import Database from 'better-sqlite3';

interface SessionRow {
  id: number;
  type: SessionType;
  duration_sec: number;
  completed_at: string;
}

const toDto = (row: SessionRow): SessionDto => ({
  id: row.id,
  type: row.type,
  durationSec: row.duration_sec,
  completedAt: row.completed_at,
});

/** All SQL lives here. `completed_at` is always normalised to UTC, so strings sort chronologically. */
export class SessionsRepo {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        type         TEXT    NOT NULL DEFAULT 'focus',
        duration_sec INTEGER NOT NULL CHECK (duration_sec BETWEEN 60 AND 5400),
        completed_at TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions (completed_at);
    `);
  }

  insert({ durationSec, completedAt }: CreateSessionDto): SessionDto {
    const row = this.db
      .prepare<[number, string], SessionRow>(
        `INSERT INTO sessions (type, duration_sec, completed_at)
         VALUES ('focus', ?, ?)
         RETURNING *`,
      )
      .get(durationSec, new Date(completedAt).toISOString());
    return toDto(row!);
  }

  /** Sessions with `from <= completedAt < to`, oldest first. */
  findBetween(from: Date, to: Date): SessionDto[] {
    return this.db
      .prepare<[string, string], SessionRow>(
        `SELECT * FROM sessions
         WHERE completed_at >= ? AND completed_at < ?
         ORDER BY completed_at`,
      )
      .all(from.toISOString(), to.toISOString())
      .map(toDto);
  }

  close(): void {
    this.db.close();
  }
}

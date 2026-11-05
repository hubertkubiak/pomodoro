import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type { CreateSessionDto, SessionDto } from '@pomodoro/shared';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export const PENDING_SESSIONS_KEY = 'pomodoro.pendingSessions';

function loadQueue(): CreateSessionDto[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_SESSIONS_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/**
 * Stores completed sessions in the backend. Every session goes through a queue persisted in
 * `localStorage`, so a session survives a failed request and is retried on the next `flush()`.
 */
@Injectable({ providedIn: 'root' })
export class SessionsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sessions`;
  private queue = loadQueue();
  private flushing = false;

  private readonly saved = signal(0);
  /** Number of sessions saved during this visit. Grows whenever the stored history changes. */
  readonly savedCount = this.saved.asReadonly();

  save(session: CreateSessionDto): Promise<void> {
    this.setQueue([...this.queue, session]);
    return this.flush();
  }

  /** Sends queued sessions in order and stops at the first failure that is worth retrying. */
  async flush(): Promise<void> {
    if (this.flushing) {
      return; // The running loop also picks up sessions queued in the meantime.
    }
    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        try {
          await firstValueFrom(this.http.post<SessionDto>(this.url, this.queue[0]));
          this.saved.update((count) => count + 1);
        } catch (error) {
          if (!isRejected(error)) {
            return;
          }
          // The server refused this session, so retrying could never succeed and would block the rest.
        }
        this.setQueue(this.queue.slice(1));
      }
    } finally {
      this.flushing = false;
    }
  }

  private setQueue(queue: CreateSessionDto[]): void {
    this.queue = queue;
    try {
      localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(queue));
    } catch {
      // Without storage the queue still works in memory for this visit.
    }
  }
}

function isRejected(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500;
}

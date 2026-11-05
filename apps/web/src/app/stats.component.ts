import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import type { DayStatsDto } from '@pomodoro/shared';
import { environment } from '../environments/environment';
import { SessionsApi } from './sessions.api';

const DAYS = 7;

@Component({
  selector: 'app-stats',
  template: `
    @if (stats.error()) {
      <p class="message" role="alert">Statistics are unavailable. The timer keeps working.</p>
      <button type="button" class="button" (click)="stats.reload()">Try again</button>
    } @else if (stats.hasValue()) {
      <dl class="totals">
        <div>
          <dt>Sessions</dt>
          <dd>{{ totals().sessions }}</dd>
        </div>
        <div>
          <dt>Focus minutes</dt>
          <dd>{{ totals().focusMinutes }}</dd>
        </div>
      </dl>
      <table>
        <caption>
          Focus time per day
        </caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col" class="number">Sessions</th>
            <th scope="col" class="number">Minutes</th>
          </tr>
        </thead>
        <tbody>
          @for (day of stats.value(); track day.date) {
            <tr>
              <td>{{ dayLabel(day.date) }}</td>
              <td class="number">{{ day.sessions }}</td>
              <td class="number">{{ day.focusMinutes }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else if (stats.isLoading()) {
      <p class="message" role="status">Loading statistics…</p>
    }
  `,
  styleUrl: './stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
  private readonly sessionsApi = inject(SessionsApi);

  protected readonly stats = httpResource<DayStatsDto[]>(() => ({
    url: `${environment.apiUrl}/stats`,
    params: { days: DAYS, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  }));

  protected readonly totals = computed(() => {
    const days = this.stats.hasValue() ? this.stats.value() : [];
    return days.reduce(
      (sum, day) => ({
        sessions: sum.sessions + day.sessions,
        focusMinutes: sum.focusMinutes + day.focusMinutes,
      }),
      { sessions: 0, focusMinutes: 0 },
    );
  });

  constructor() {
    // Sessions saved before this panel opened are already in the first response.
    let seenCount = this.sessionsApi.savedCount();
    effect(() => {
      const savedCount = this.sessionsApi.savedCount();
      if (savedCount !== seenCount) {
        seenCount = savedCount;
        untracked(() => this.stats.reload());
      }
    });
  }

  protected dayLabel(date: string): string {
    // `date` is already a day in the user's zone, so format it as is, without shifting it again.
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  }
}

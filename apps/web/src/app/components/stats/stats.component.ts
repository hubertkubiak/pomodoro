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
import { environment } from '../../../environments/environment';
import { SessionsApi } from '../../core/sessions.api';

const DAYS = 7;

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
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

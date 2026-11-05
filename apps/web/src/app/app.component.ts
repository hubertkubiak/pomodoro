import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ControlsComponent } from './controls.component';
import { PomodoroStore } from './pomodoro.store';
import { SettingsComponent } from './settings.component';
import { StatsComponent } from './stats.component';
import { TimerRingComponent } from './timer-ring.component';

@Component({
  selector: 'app-root',
  imports: [ControlsComponent, SettingsComponent, StatsComponent, TimerRingComponent],
  host: { '[attr.data-phase]': 'store.phase()' },
  template: `
    <main class="layout">
      <section class="timer card" aria-label="Timer">
        <h1>Pomodoro</h1>
        <app-timer-ring
          [progress]="store.progress()"
          [display]="store.display()"
          [phaseLabel]="store.phaseLabel()"
        />
        <app-controls
          [status]="store.status()"
          (startTimer)="store.start()"
          (pauseTimer)="store.pause()"
          (resumeTimer)="store.resume()"
          (resetTimer)="store.reset()"
          (skipPhase)="store.skip()"
        />
        <p class="today">
          Completed today: <strong>{{ store.completedFocus() }}</strong>
        </p>
      </section>
      <div class="side">
        <app-settings class="card" />
        <section class="card" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Last 7 days</h2>
          @defer (on interaction) {
            <app-stats />
          } @placeholder {
            <button type="button" class="button">Show statistics</button>
          } @loading (after 100ms; minimum 200ms) {
            <p class="muted" role="status">Loading…</p>
          } @error {
            <p class="muted" role="alert">Statistics could not be loaded.</p>
          }
        </section>
      </div>
    </main>
  `,
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly store = inject(PomodoroStore);
}

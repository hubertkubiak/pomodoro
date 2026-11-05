import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ControlsComponent } from './controls.component';
import { PomodoroStore } from './pomodoro.store';
import { SettingsComponent } from './settings.component';
import { TimerRingComponent } from './timer-ring.component';

@Component({
  selector: 'app-root',
  imports: [ControlsComponent, SettingsComponent, TimerRingComponent],
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
      </div>
    </main>
  `,
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly store = inject(PomodoroStore);
}

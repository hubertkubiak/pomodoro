import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ControlsComponent } from './components/controls/controls.component';
import { PomodoroStore } from './core/pomodoro.store';
import { SettingsComponent } from './components/settings/settings.component';
import { StatsComponent } from './components/stats/stats.component';
import { TimerRingComponent } from './components/timer-ring/timer-ring.component';

@Component({
  selector: 'app-root',
  imports: [ControlsComponent, SettingsComponent, StatsComponent, TimerRingComponent],
  host: { '[attr.data-phase]': 'store.phase()' },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly store = inject(PomodoroStore);
}

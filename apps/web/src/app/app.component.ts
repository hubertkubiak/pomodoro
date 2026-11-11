import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ControlsComponent } from './components/controls/controls.component';
import { PomodoroStore } from './core/pomodoro.store';
import { SettingsComponent } from './components/settings/settings.component';
import { StatsComponent } from './components/stats/stats.component';
import { TimerRingComponent } from './components/timer-ring/timer-ring.component';

@Component({
  selector: 'app-root',
  imports: [ControlsComponent, SettingsComponent, StatsComponent, TimerRingComponent],
  host: {
    '[attr.data-phase]': 'store.phase()',
    '(document:keydown)': 'onKeydown($event)',
  },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly store = inject(PomodoroStore);

  /** Space starts, pauses or resumes; R resets; S skips. */
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTextField(target)) {
      return;
    }
    switch (event.key.toLowerCase()) {
      case ' ':
        if (target?.closest('button')) {
          return; // Space already clicks the focused button.
        }
        this.toggle();
        break;
      case 'r':
        this.store.reset();
        break;
      case 's':
        this.store.skip();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private toggle(): void {
    const actions = {
      idle: () => this.store.start(),
      running: () => this.store.pause(),
      paused: () => this.store.resume(),
    };
    actions[this.store.status()]();
  }
}

function isTextField(element: HTMLElement | null): boolean {
  return !!element?.closest('input, textarea, select, [contenteditable]');
}

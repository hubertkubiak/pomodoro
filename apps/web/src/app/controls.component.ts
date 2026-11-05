import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TimerStatus } from './pomodoro.store';

@Component({
  selector: 'app-controls',
  template: `
    @switch (status()) {
      @case ('idle') {
        <button type="button" class="button button--primary" (click)="startTimer.emit()">
          Start
        </button>
      }
      @case ('running') {
        <button type="button" class="button button--primary" (click)="pauseTimer.emit()">
          Pause
        </button>
      }
      @case ('paused') {
        <button type="button" class="button button--primary" (click)="resumeTimer.emit()">
          Resume
        </button>
      }
    }
    @if (status() !== 'idle') {
      <button type="button" class="button" (click)="resetTimer.emit()">Reset</button>
    }
    <button type="button" class="button" (click)="skipPhase.emit()">Skip</button>
  `,
  styleUrl: './controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsComponent {
  readonly status = input.required<TimerStatus>();

  readonly startTimer = output();
  readonly pauseTimer = output();
  readonly resumeTimer = output();
  readonly resetTimer = output();
  readonly skipPhase = output();
}

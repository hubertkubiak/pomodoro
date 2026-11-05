import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TimerStatus } from '../../core/pomodoro.store';

@Component({
  selector: 'app-controls',
  templateUrl: './controls.component.html',
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

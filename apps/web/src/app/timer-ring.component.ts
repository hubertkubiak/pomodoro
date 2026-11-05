import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-timer-ring',
  template: `
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle class="track" cx="100" cy="100" r="90" />
      <circle
        class="progress"
        cx="100"
        cy="100"
        r="90"
        pathLength="1"
        [style.stroke-dasharray]="progress() + ' 1'"
      />
    </svg>
    <div class="label">
      <span class="time" role="timer">{{ display() }}</span>
      <span class="phase">{{ phaseLabel() }}</span>
    </div>
  `,
  styleUrl: './timer-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerRingComponent {
  /** Elapsed part of the phase, from 0 to 1. */
  readonly progress = input.required<number>();
  readonly display = input.required<string>();
  readonly phaseLabel = input.required<string>();
}

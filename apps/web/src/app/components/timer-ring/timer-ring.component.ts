import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-timer-ring',
  templateUrl: './timer-ring.component.html',
  styleUrl: './timer-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerRingComponent {
  /** Elapsed part of the phase, from 0 to 1. */
  readonly progress = input.required<number>();
  readonly display = input.required<string>();
  readonly phaseLabel = input.required<string>();
}

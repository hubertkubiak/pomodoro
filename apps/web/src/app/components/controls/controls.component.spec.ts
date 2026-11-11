import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TimerStatus } from '../../core/pomodoro.store';
import { ControlsComponent } from './controls.component';

describe('ControlsComponent', () => {
  let fixture: ComponentFixture<ControlsComponent>;

  const render = async (status: TimerStatus) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
  };

  const buttons = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map((button) =>
      button.textContent!.trim(),
    );

  const click = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')]
      .find((button) => button.textContent!.trim() === label)!
      .click();

  beforeEach(() => {
    fixture = TestBed.createComponent(ControlsComponent);
  });

  it.each<[TimerStatus, string[]]>([
    ['idle', ['Start', 'Skip']],
    ['running', ['Pause', 'Reset', 'Skip']],
    ['paused', ['Resume', 'Reset', 'Skip']],
  ])('shows the buttons allowed in the %s state', async (status, expected) => {
    await render(status);
    expect(buttons()).toEqual(expected);
  });

  it.each<[TimerStatus, string, Exclude<keyof ControlsComponent, 'status'>]>([
    ['idle', 'Start', 'startTimer'],
    ['running', 'Pause', 'pauseTimer'],
    ['paused', 'Resume', 'resumeTimer'],
    ['paused', 'Reset', 'resetTimer'],
    ['idle', 'Skip', 'skipPhase'],
  ])('in the %s state, %s emits %s', async (status, label, output) => {
    await render(status);
    const emitted = jest.fn();
    fixture.componentInstance[output].subscribe(emitted);
    click(label);
    expect(emitted).toHaveBeenCalledTimes(1);
  });
});

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => localStorage.clear());

  it('renders the timer from the store state', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Pomodoro');
    expect(element.querySelector('[role=timer]')?.textContent).toContain('25:00');
    expect(element.getAttribute('data-phase')).toBe('focus');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { PomodoroStore } from './core/pomodoro.store';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let store: PomodoroStore;

  const press = (
    key: string,
    target: EventTarget = document.body,
    init: KeyboardEventInit = {},
  ) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    localStorage.clear();
    fixture = TestBed.createComponent(AppComponent);
    store = TestBed.inject(PomodoroStore);
    await fixture.whenStable();
  });

  it('renders the timer from the store state', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Pomodoro');
    expect(element.querySelector('[role=timer]')?.textContent).toContain('25:00');
    expect(element.getAttribute('data-phase')).toBe('focus');
  });

  describe('keyboard shortcuts', () => {
    it('Space starts, pauses and resumes the timer', () => {
      const event = press(' ');
      expect(store.status()).toBe('running');
      expect(event.defaultPrevented).toBe(true);
      press(' ');
      expect(store.status()).toBe('paused');
      press(' ');
      expect(store.status()).toBe('running');
    });

    it('R resets and S skips', () => {
      press(' ');
      press('r');
      expect(store.status()).toBe('idle');
      press('S');
      expect(store.phase()).toBe('shortBreak');
    });

    it('ignores keys typed in a form field, with modifiers or held down', () => {
      const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
      press('s', input);
      press('s', document.body, { ctrlKey: true });
      press(' ', document.body, { repeat: true });
      expect(store.status()).toBe('idle');
      expect(store.phase()).toBe('focus');
    });

    it('leaves Space on a focused button to the button itself', () => {
      const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
      const event = press(' ', button);
      expect(event.defaultPrevented).toBe(false);
      expect(store.status()).toBe('idle');
    });
  });
});

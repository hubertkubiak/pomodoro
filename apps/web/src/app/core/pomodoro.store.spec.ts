import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Chime } from './chime';
import { CLOCK, PomodoroStore, TODAY_COUNT_KEY } from './pomodoro.store';
import { SessionsApi } from './sessions.api';
import { DEFAULT_SETTINGS, SettingsStore } from './settings.store';

const MINUTE = 60_000;
const START = new Date(2026, 10, 5, 12, 0, 0).getTime();

describe('PomodoroStore', () => {
  let time: number;
  let store: PomodoroStore;
  let save: jest.Mock;
  let chime: { unlock: jest.Mock; play: jest.Mock };

  /** Moves the injected clock and the fake timers together. */
  const advance = (ms: number) => {
    time += ms;
    jest.advanceTimersByTime(250);
    jest.advanceTimersByTime(Math.max(0, ms - 250));
  };

  /** Intervals started and not cleared yet. Angular's scheduler timers do not count here. */
  const activeIntervals = () =>
    (setInterval as unknown as jest.Mock).mock.calls.length -
    (clearInterval as unknown as jest.Mock).mock.calls.filter(([id]) => id !== undefined).length;

  const completePhase = () => {
    store.start();
    advance(store.remainingMs());
  };

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CLOCK, useValue: () => time },
        { provide: SessionsApi, useValue: { save } },
        { provide: Chime, useValue: chime },
      ],
    });
    store = TestBed.inject(PomodoroStore);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'setInterval');
    jest.spyOn(globalThis, 'clearInterval');
    localStorage.clear();
    time = START;
    save = jest.fn();
    chime = { unlock: jest.fn(), play: jest.fn() };
    setup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('starts idle in the focus phase with the full time', () => {
    expect(store.status()).toBe('idle');
    expect(store.phase()).toBe('focus');
    expect(store.display()).toBe('25:00');
    expect(store.progress()).toBe(0);
  });

  it('start() from idle moves to running and sets endsAt', () => {
    store.start();
    expect(store.status()).toBe('running');
    advance(MINUTE);
    expect(store.remainingMs()).toBe(24 * MINUTE);
    expect(store.display()).toBe('24:00');
    expect(store.progress()).toBeCloseTo(1 / 25);
  });

  it('calculates time from endsAt, so late ticks do not make the timer drift', () => {
    store.start();
    time += 10 * MINUTE; // The tab was in the background and no interval fired.
    jest.advanceTimersByTime(250);
    expect(store.display()).toBe('15:00');
  });

  it('pause() remembers remainingMs; resume() calculates a new endsAt from that value', () => {
    store.start();
    advance(5 * MINUTE);
    store.pause();
    expect(store.status()).toBe('paused');
    expect(store.remainingMs()).toBe(20 * MINUTE);

    advance(3 * MINUTE);
    expect(store.remainingMs()).toBe(20 * MINUTE);

    store.resume();
    expect(store.status()).toBe('running');
    advance(MINUTE);
    expect(store.remainingMs()).toBe(19 * MINUTE);
  });

  it('after the time elapses the focus session ends and a break begins', () => {
    completePhase();
    expect(store.status()).toBe('idle');
    expect(store.phase()).toBe('shortBreak');
    expect(store.completedFocus()).toBe(1);
    expect(store.display()).toBe('05:00');
  });

  it('ends every Nth focus session with a long break, then returns to focus', () => {
    const phases: string[] = [];
    for (let i = 0; i < 8; i++) {
      completePhase();
      phases.push(store.phase());
    }
    expect(phases).toEqual([
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'shortBreak',
      'focus',
      'longBreak',
      'focus',
    ]);
    expect(store.completedFocus()).toBe(4);
  });

  it('skip() moves to the next phase without incrementing the counter or saving', () => {
    store.start();
    advance(MINUTE);
    store.skip();
    expect(store.status()).toBe('idle');
    expect(store.phase()).toBe('shortBreak');
    expect(store.completedFocus()).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });

  it('reset() returns to idle in the same phase with the full time', () => {
    store.start();
    advance(MINUTE);
    store.reset();
    expect(store.status()).toBe('idle');
    expect(store.phase()).toBe('focus');
    expect(store.display()).toBe('25:00');
  });

  it.each([
    ['pause() in idle', (s: PomodoroStore) => s.pause()],
    ['resume() in idle', (s: PomodoroStore) => s.resume()],
    ['reset() in idle', (s: PomodoroStore) => s.reset()],
  ])('ignores a disallowed transition: %s', (_name, transition) => {
    transition(store);
    expect(store.status()).toBe('idle');
    expect(store.phase()).toBe('focus');
    expect(activeIntervals()).toBe(0);
  });

  it('ignores start() while running, keeping a single interval and the original end time', () => {
    store.start();
    advance(MINUTE);
    store.start();
    expect(store.remainingMs()).toBe(24 * MINUTE);
    expect(activeIntervals()).toBe(1);
  });

  it('ignores resume() while running', () => {
    store.start();
    store.resume();
    expect(activeIntervals()).toBe(1);
  });

  it('completing a focus session calls SessionsApi.save()', () => {
    completePhase();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      durationSec: 25 * 60,
      completedAt: new Date(START + 25 * MINUTE).toISOString(),
    });
  });

  it('does not save completed breaks', () => {
    completePhase();
    completePhase();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps the current countdown when settings change, applying them from the next phase', () => {
    const settings = TestBed.inject(SettingsStore);
    store.start();
    settings.update({ ...DEFAULT_SETTINGS, focusMin: 50, shortBreakMin: 10, longBreakMin: 20 });
    advance(MINUTE);
    expect(store.remainingMs()).toBe(24 * MINUTE);

    advance(24 * MINUTE);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ durationSec: 25 * 60 }));
    expect(store.display()).toBe('10:00');
  });

  describe('the sound at the end of a phase', () => {
    it('prepares audio on start and plays when the time runs out', () => {
      store.start();
      expect(chime.unlock).toHaveBeenCalled();
      expect(chime.play).not.toHaveBeenCalled();
      advance(store.remainingMs());
      expect(chime.play).toHaveBeenCalledTimes(1);
    });

    it('stays silent on skip() and when turned off in the settings', () => {
      store.start();
      store.skip();
      TestBed.inject(SettingsStore).update({ ...DEFAULT_SETTINGS, sound: false });
      completePhase();
      expect(chime.play).not.toHaveBeenCalled();
    });
  });

  it('runs the interval only while running', () => {
    store.start();
    expect(activeIntervals()).toBe(1);
    store.pause();
    expect(activeIntervals()).toBe(0);
    store.resume();
    expect(activeIntervals()).toBe(1);
    store.reset();
    expect(activeIntervals()).toBe(0);
  });

  it('cleans the interval up when destroyed', () => {
    store.start();
    TestBed.resetTestingModule();
    expect(activeIntervals()).toBe(0);
  });

  it('shows the remaining time and the phase in the tab title', () => {
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('25:00 · Focus');
    store.start();
    advance(MINUTE);
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('24:00 · Focus');
  });

  describe('the counter of sessions completed today', () => {
    it('survives a page reload on the same day', () => {
      completePhase();
      TestBed.resetTestingModule();
      setup();
      expect(store.completedFocus()).toBe(1);
    });

    it('starts from zero when the saved count is from another day', () => {
      localStorage.setItem(TODAY_COUNT_KEY, JSON.stringify({ date: '2026-11-04', count: 3 }));
      TestBed.resetTestingModule();
      setup();
      expect(store.completedFocus()).toBe(0);
    });

    it('restarts when a new day begins while the app stays open', () => {
      completePhase();
      store.skip();
      time += 24 * 60 * MINUTE;
      completePhase();
      expect(store.completedFocus()).toBe(1);
    });

    it('restarts at midnight while the timer stays idle', () => {
      completePhase();
      store.skip();
      expect(store.completedFocus()).toBe(1);
      advance(12 * 60 * MINUTE);
      expect(store.completedFocus()).toBe(0);
    });

    it('skip() on a new day picks the next phase from the restarted counter', () => {
      for (let i = 0; i < 3; i++) {
        completePhase();
        store.skip();
      }
      time += 24 * 60 * MINUTE; // The tab slept through midnight, so no timer fired.
      store.skip();
      expect(store.phase()).toBe('shortBreak');
    });
  });
});

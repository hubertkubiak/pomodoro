import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SessionsApi } from './sessions.api';
import { PomodoroSettings, SettingsStore } from './settings.store';

export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';

interface TimerState {
  status: TimerStatus;
  phase: TimerPhase;
  /** Timestamp of the end of the phase. Set only while running. */
  endsAt: number | null;
  /** Time left, remembered on pause. */
  remainingMs: number;
  /** Length of the phase in progress, fixed on start so settings changes do not affect it. */
  durationMs: number;
  /** Focus sessions completed today. */
  completedFocus: number;
}

/** Source of the current time, replaceable in tests. */
export const CLOCK = new InjectionToken<() => number>('CLOCK', {
  factory: () => () => Date.now(),
});

export const TODAY_COUNT_KEY = 'pomodoro.today';
const TICK_MS = 250;

const PHASE_LABELS: Record<TimerPhase, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

const PHASE_MINUTES: Record<TimerPhase, keyof PomodoroSettings> = {
  focus: 'focusMin',
  shortBreak: 'shortBreakMin',
  longBreak: 'longBreakMin',
};

@Injectable({ providedIn: 'root' })
export class PomodoroStore {
  private readonly clock = inject(CLOCK);
  private readonly settings = inject(SettingsStore).settings;
  private readonly sessionsApi = inject(SessionsApi);

  private readonly state = signal<TimerState>({
    status: 'idle',
    phase: 'focus',
    endsAt: null,
    remainingMs: 0,
    durationMs: 0,
    completedFocus: readTodayCount(localDay(this.clock())),
  });
  private readonly now = signal(this.clock());
  private interval: ReturnType<typeof setInterval> | undefined;
  private midnightTimer: ReturnType<typeof setTimeout> | undefined;
  private countedDay = localDay(this.clock());

  readonly status = computed(() => this.state().status);
  readonly phase = computed(() => this.state().phase);
  readonly completedFocus = computed(() => this.state().completedFocus);
  readonly phaseLabel = computed(() => PHASE_LABELS[this.phase()]);

  readonly nextPhase = computed<TimerPhase>(() => {
    if (this.phase() !== 'focus') {
      return 'focus';
    }
    const isCycleEnd = (this.completedFocus() + 1) % this.settings().sessionsUntilLong === 0;
    return isCycleEnd ? 'longBreak' : 'shortBreak';
  });

  readonly remainingMs = computed(() => {
    const { status, phase, endsAt, remainingMs } = this.state();
    switch (status) {
      case 'running':
        return Math.max(0, endsAt! - this.now());
      case 'paused':
        return remainingMs;
      case 'idle':
        return this.phaseMs(phase);
    }
  });

  readonly display = computed(() => {
    const totalSeconds = Math.ceil(this.remainingMs() / 1000);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
  });

  /** Elapsed part of the current phase, from 0 to 1. */
  readonly progress = computed(() => {
    const { status, durationMs } = this.state();
    return status === 'idle' ? 0 : 1 - this.remainingMs() / durationMs;
  });

  constructor() {
    const title = inject(Title);
    effect(() => title.setTitle(`${this.display()} · ${this.phaseLabel()}`));
    this.scheduleDayCheck();
    inject(DestroyRef).onDestroy(() => {
      this.stopTicking();
      clearTimeout(this.midnightTimer);
    });
  }

  start(): void {
    if (this.status() !== 'idle') {
      return;
    }
    this.syncDay();
    const durationMs = this.phaseMs(this.phase());
    this.run(durationMs, { durationMs });
  }

  pause(): void {
    if (this.status() !== 'running') {
      return;
    }
    this.now.set(this.clock());
    this.stopTicking();
    this.patch({ status: 'paused', remainingMs: this.remainingMs(), endsAt: null });
  }

  resume(): void {
    if (this.status() === 'paused') {
      this.run(this.state().remainingMs);
    }
  }

  reset(): void {
    if (this.status() !== 'idle') {
      this.toIdle(this.phase());
    }
  }

  skip(): void {
    this.syncDay();
    this.toIdle(this.nextPhase());
  }

  /** Time ran out. The only transition that counts a focus session and records it. */
  private complete(): void {
    this.syncDay();
    const { phase, durationMs, endsAt } = this.state();
    const nextPhase = this.nextPhase();
    if (phase === 'focus') {
      const completedFocus = this.completedFocus() + 1;
      this.patch({ completedFocus });
      writeTodayCount(this.countedDay, completedFocus);
      void this.sessionsApi.save({
        durationSec: Math.round(durationMs / 1000),
        completedAt: new Date(endsAt!).toISOString(),
      });
    }
    this.toIdle(nextPhase);
  }

  private run(remainingMs: number, changes: Partial<TimerState> = {}): void {
    this.now.set(this.clock());
    this.patch({ ...changes, status: 'running', endsAt: this.clock() + remainingMs });
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    this.now.set(this.clock());
    if (this.remainingMs() === 0) {
      this.complete();
    }
  }

  private toIdle(phase: TimerPhase): void {
    this.stopTicking();
    this.patch({ status: 'idle', phase, endsAt: null, remainingMs: 0, durationMs: 0 });
  }

  private stopTicking(): void {
    clearInterval(this.interval);
    this.interval = undefined;
  }

  private phaseMs(phase: TimerPhase): number {
    return this.settings()[PHASE_MINUTES[phase]] * 60_000;
  }

  /** Restarts the completed sessions counter when a new day has begun. */
  private syncDay(): void {
    const today = localDay(this.clock());
    if (today !== this.countedDay) {
      this.countedDay = today;
      this.patch({ completedFocus: 0 });
    }
  }

  /** Clears the counter at local midnight, also while the timer stays idle. */
  private scheduleDayCheck(): void {
    const now = new Date(this.clock());
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    this.midnightTimer = setTimeout(() => {
      this.syncDay();
      this.scheduleDayCheck();
    }, midnight - now.getTime());
  }

  private patch(changes: Partial<TimerState>): void {
    this.state.update((state) => ({ ...state, ...changes }));
  }
}

/** Calendar day in the user's time zone, `YYYY-MM-DD`. */
function localDay(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function readTodayCount(today: string): number {
  try {
    const saved = JSON.parse(localStorage.getItem(TODAY_COUNT_KEY) ?? 'null');
    return saved?.date === today && Number.isInteger(saved.count) ? saved.count : 0;
  } catch {
    return 0;
  }
}

function writeTodayCount(date: string, count: number): void {
  try {
    localStorage.setItem(TODAY_COUNT_KEY, JSON.stringify({ date, count }));
  } catch {
    // Without storage the counter still works for this visit.
  }
}

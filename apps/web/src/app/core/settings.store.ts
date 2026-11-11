import { effect, Injectable, signal } from '@angular/core';

export interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  sessionsUntilLong: number;
  /** Play a sound when a phase ends. */
  sound: boolean;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  sessionsUntilLong: 4,
  sound: true,
};

/** Allowed range of every setting: the single source for the form and for reading saved data. */
export type NumericSetting = Exclude<keyof PomodoroSettings, 'sound'>;

export const SETTINGS_RANGES: Record<NumericSetting, { min: number; max: number }> = {
  focusMin: { min: 1, max: 90 },
  shortBreakMin: { min: 1, max: 30 },
  longBreakMin: { min: 1, max: 60 },
  sessionsUntilLong: { min: 2, max: 8 },
};

export const SETTINGS_STORAGE_KEY = 'pomodoro.settings';

function isValid(value: Partial<PomodoroSettings>): value is PomodoroSettings {
  const inRange = (Object.keys(SETTINGS_RANGES) as NumericSetting[]).every((key) => {
    const field = value[key];
    const { min, max } = SETTINGS_RANGES[key];
    return Number.isInteger(field) && field! >= min && field! <= max;
  });
  return (
    inRange &&
    value.shortBreakMin! < value.longBreakMin! &&
    value.longBreakMin! < value.focusMin! &&
    typeof value.sound === 'boolean'
  );
}

function loadSettings(): PomodoroSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null');
    // Settings saved before the sound option existed keep working, with the sound on.
    const settings = saved && { sound: DEFAULT_SETTINGS.sound, ...saved };
    return settings && isValid(settings) ? settings : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** The applied settings, persisted in `localStorage`. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly state = signal(loadSettings());
  readonly settings = this.state.asReadonly();

  constructor() {
    effect(() => {
      const settings = this.state();
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Storage can be unavailable (private mode, quota). Settings then last for this visit.
      }
    });
  }

  update(settings: PomodoroSettings): void {
    this.state.set(settings);
  }
}

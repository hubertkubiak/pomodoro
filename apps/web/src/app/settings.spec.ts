import { EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { settingsSchema } from './settings.component';
import {
  DEFAULT_SETTINGS,
  PomodoroSettings,
  SETTINGS_STORAGE_KEY,
  SettingsStore,
} from './settings.store';

describe('settings', () => {
  beforeEach(() => localStorage.clear());

  describe('validation', () => {
    const validate = (changes: Partial<PomodoroSettings>) => {
      const model = signal({ ...DEFAULT_SETTINGS, ...changes });
      return runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
        form(model, settingsSchema),
      );
    };

    it('accepts the defaults', () => {
      expect(validate({})().valid()).toBe(true);
    });

    it.each<[keyof PomodoroSettings, number]>([
      ['focusMin', 0],
      ['focusMin', 91],
      ['shortBreakMin', 0],
      ['shortBreakMin', 31],
      ['longBreakMin', 0],
      ['longBreakMin', 61],
      ['sessionsUntilLong', 1],
      ['sessionsUntilLong', 9],
    ])('rejects %s = %s as out of range', (key, value) => {
      const settings = validate({ focusMin: 90, shortBreakMin: 5, longBreakMin: 15, [key]: value });
      expect(settings[key]().invalid()).toBe(true);
    });

    it('rejects fractions', () => {
      const settings = validate({ focusMin: 25.5 });
      expect(settings.focusMin().errors().map((e) => e.kind)).toEqual(['integer']);
    });

    it('rejects an empty field', () => {
      const settings = validate({ focusMin: null as unknown as number });
      expect(settings.focusMin().errors().map((e) => e.kind)).toEqual(['required']);
    });

    it('requires the short break to be shorter than the long break', () => {
      const settings = validate({ shortBreakMin: 15, longBreakMin: 15 });
      expect(settings.longBreakMin().errors().map((e) => e.kind)).toEqual(['longNotAboveShort']);
      expect(settings().valid()).toBe(false);
    });

    it('requires the long break to be shorter than the focus session', () => {
      const settings = validate({ focusMin: 15, longBreakMin: 20 });
      expect(settings.longBreakMin().errors().map((e) => e.kind)).toEqual(['longNotBelowFocus']);
      expect(settings().valid()).toBe(false);
    });
  });

  describe('SettingsStore', () => {
    const custom: PomodoroSettings = {
      focusMin: 50,
      shortBreakMin: 10,
      longBreakMin: 30,
      sessionsUntilLong: 3,
    };

    it('saves changes to localStorage and reads them back after a reload', () => {
      TestBed.inject(SettingsStore).update(custom);
      TestBed.tick();
      expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual(custom);

      TestBed.resetTestingModule();
      expect(TestBed.inject(SettingsStore).settings()).toEqual(custom);
    });

    it.each([
      ['corrupted JSON', '{oops'],
      ['out-of-range values', JSON.stringify({ ...custom, focusMin: 500 })],
      ['values that break the cross-field rules', JSON.stringify({ ...custom, longBreakMin: 5 })],
      ['missing values', JSON.stringify({ focusMin: 50 })],
    ])('falls back to the defaults for %s', (_name, saved) => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, saved);
      expect(TestBed.inject(SettingsStore).settings()).toEqual(DEFAULT_SETTINGS);
    });
  });
});

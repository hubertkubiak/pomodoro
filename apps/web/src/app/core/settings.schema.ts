import { max, min, required, schema, SchemaPath, validate } from '@angular/forms/signals';
import { PomodoroSettings, SETTINGS_RANGES } from './settings.store';

function wholeNumberInRange(path: SchemaPath<number>, range: { min: number; max: number }): void {
  const message = `Enter a whole number from ${range.min} to ${range.max}.`;
  required(path, { message });
  min(path, range.min, { message });
  max(path, range.max, { message });
  validate(path, ({ value }) =>
    value() !== null && !Number.isInteger(value()) ? { kind: 'integer', message } : undefined,
  );
}

export const settingsSchema = schema<PomodoroSettings>((s) => {
  wholeNumberInRange(s.focusMin, SETTINGS_RANGES.focusMin);
  wholeNumberInRange(s.shortBreakMin, SETTINGS_RANGES.shortBreakMin);
  wholeNumberInRange(s.longBreakMin, SETTINGS_RANGES.longBreakMin);
  wholeNumberInRange(s.sessionsUntilLong, SETTINGS_RANGES.sessionsUntilLong);

  // Cross-field rules: short break < long break < focus session. Empty fields report `required`.
  validate(s.longBreakMin, ({ value, valueOf }) => {
    const shortBreak = valueOf(s.shortBreakMin);
    return value() !== null && shortBreak !== null && value() <= shortBreak
      ? { kind: 'longNotAboveShort', message: 'Must be longer than the short break.' }
      : undefined;
  });
  validate(s.longBreakMin, ({ value, valueOf }) => {
    const focus = valueOf(s.focusMin);
    return value() !== null && focus !== null && value() >= focus
      ? { kind: 'longNotBelowFocus', message: 'Must be shorter than the focus session.' }
      : undefined;
  });
});

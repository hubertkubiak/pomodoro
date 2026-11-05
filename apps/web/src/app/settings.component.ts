import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  max,
  min,
  required,
  schema,
  SchemaPath,
  submit,
  validate,
} from '@angular/forms/signals';
import { PomodoroSettings, SETTINGS_RANGES, SettingsStore } from './settings.store';

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

@Component({
  selector: 'app-settings',
  imports: [FormField],
  template: `
    <h2>Settings</h2>
    <form novalidate (submit)="save($event)">
      <div class="fields">
        @for (item of fields; track item.id) {
          <div class="field">
            <label [for]="item.id">{{ item.label }}</label>
            <input
              type="number"
              inputmode="numeric"
              [id]="item.id"
              [formField]="item.field"
              [attr.aria-invalid]="item.field().invalid()"
              [attr.aria-describedby]="item.id + '-error'"
            />
            <p class="error" [id]="item.id + '-error'">
              @for (error of item.field().errors(); track error.kind) {
                <span>{{ error.message }}</span>
              }
            </p>
          </div>
        }
      </div>
      <div class="actions">
        <button type="submit" class="button" [disabled]="!canSave()">Save</button>
        <p class="hint" role="status">
          {{ justSaved() ? 'Saved.' : 'Changes apply from the next phase.' }}
        </p>
      </div>
    </form>
  `,
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly store = inject(SettingsStore);

  private readonly model = signal<PomodoroSettings>(this.store.settings());
  private readonly form = form(this.model, settingsSchema);

  protected readonly fields = [
    { id: 'focus-min', label: 'Focus session (min)', field: this.form.focusMin },
    { id: 'short-break-min', label: 'Short break (min)', field: this.form.shortBreakMin },
    { id: 'long-break-min', label: 'Long break (min)', field: this.form.longBreakMin },
    { id: 'sessions-until-long', label: 'Sessions until long break', field: this.form.sessionsUntilLong },
  ];

  private readonly isUnchanged = computed(() => {
    const draft = this.model();
    const applied = this.store.settings();
    return (Object.keys(applied) as (keyof PomodoroSettings)[]).every(
      (key) => draft[key] === applied[key],
    );
  });
  private readonly hasSaved = signal(false);

  protected readonly canSave = computed(() => this.form().valid() && !this.isUnchanged());
  protected readonly justSaved = computed(() => this.hasSaved() && this.isUnchanged());

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      this.store.update(this.model());
      this.hasSaved.set(true);
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { settingsSchema } from '../../core/settings.schema';
import { DEFAULT_SETTINGS, PomodoroSettings, SettingsStore } from '../../core/settings.store';

@Component({
  selector: 'app-settings',
  imports: [FormField],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly store = inject(SettingsStore);

  private readonly model = signal<PomodoroSettings>(this.store.settings());
  protected readonly form = form(this.model, settingsSchema);

  protected readonly fields = [
    { id: 'focus-min', label: 'Focus session (min)', field: this.form.focusMin },
    { id: 'short-break-min', label: 'Short break (min)', field: this.form.shortBreakMin },
    { id: 'long-break-min', label: 'Long break (min)', field: this.form.longBreakMin },
    {
      id: 'sessions-until-long',
      label: 'Sessions until long break',
      field: this.form.sessionsUntilLong,
    },
  ];

  private readonly isUnchanged = computed(() => sameSettings(this.model(), this.store.settings()));
  private readonly hasSaved = signal(false);

  protected readonly canSave = computed(() => this.form().valid() && !this.isUnchanged());
  protected readonly justSaved = computed(() => this.hasSaved() && this.isUnchanged());
  protected readonly isDefault = computed(() => sameSettings(this.model(), DEFAULT_SETTINGS));

  /** Fills the form with the defaults. They apply only after Save, like any other change. */
  protected restoreDefaults(): void {
    this.model.set(DEFAULT_SETTINGS);
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      this.store.update(this.model());
      this.hasSaved.set(true);
    });
  }
}

function sameSettings(a: PomodoroSettings, b: PomodoroSettings): boolean {
  return (Object.keys(b) as (keyof PomodoroSettings)[]).every((key) => a[key] === b[key]);
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, SettingsStore } from '../../core/settings.store';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;

  const element = () => fixture.nativeElement as HTMLElement;
  const saveButton = () => element().querySelector<HTMLButtonElement>('button[type=submit]')!;

  const type = async (id: string, value: string) => {
    const input = element().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
  });

  it('shows the applied settings and disables Save while nothing has changed', () => {
    expect(element().querySelector<HTMLInputElement>('#focus-min')!.value).toBe('25');
    expect(saveButton().disabled).toBe(true);
  });

  it('applies valid changes on Save and confirms them', async () => {
    await type('focus-min', '50');
    expect(saveButton().disabled).toBe(false);

    saveButton().click();
    await fixture.whenStable();

    expect(TestBed.inject(SettingsStore).settings()).toEqual({ ...DEFAULT_SETTINGS, focusMin: 50 });
    expect(saveButton().disabled).toBe(true);
    expect(element().textContent).toContain('Saved.');
  });

  it('turns the sound off', async () => {
    element().querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    await fixture.whenStable();
    saveButton().click();
    await fixture.whenStable();

    expect(TestBed.inject(SettingsStore).settings().sound).toBe(false);
  });

  it('shows the error and keeps Save disabled for invalid values', async () => {
    await type('long-break-min', '3');

    expect(saveButton().disabled).toBe(true);
    expect(element().querySelector('#long-break-min')!.getAttribute('aria-invalid')).toBe('true');
    expect(element().querySelector('#long-break-min-error')!.textContent).toContain(
      'Must be longer than the short break.',
    );
  });
});

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('renders the page heading', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Pomodoro');
  });
});

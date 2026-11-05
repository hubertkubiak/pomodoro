import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DayStatsDto } from '@pomodoro/shared';
import { SessionsApi } from '../../core/sessions.api';
import { StatsComponent } from './stats.component';

const days: DayStatsDto[] = [
  { date: '2026-11-04', sessions: 1, focusMinutes: 25 },
  { date: '2026-11-05', sessions: 2, focusMinutes: 50 },
];

describe('StatsComponent', () => {
  let fixture: ComponentFixture<StatsComponent>;
  let http: HttpTestingController;

  const isStatsRequest = (req: { url: string }) => req.url === '/api/stats';
  const text = () => (fixture.nativeElement as HTMLElement).textContent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StatsComponent);
    // whenStable() would wait for the pending request, so only render here.
    TestBed.tick();
  });

  it('requests 7 days in the time zone of the user and shows totals', async () => {
    const request = http.expectOne(isStatsRequest);
    expect(request.request.params.get('days')).toBe('7');
    expect(request.request.params.get('tz')).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(text()).toContain('Loading');

    request.flush(days);
    await fixture.whenStable();

    expect(text()).toContain('75');
    expect(text()).toContain('5 Nov');
  });

  it('shows an error when the backend is down', async () => {
    http.expectOne(isStatsRequest).flush('', { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    expect(text()).toContain('Statistics are unavailable');
  });

  it('reloads after a session has been saved', async () => {
    http.expectOne(isStatsRequest).flush(days);
    await fixture.whenStable();

    void TestBed.inject(SessionsApi).save({
      durationSec: 1500,
      completedAt: '2026-11-05T12:00:00.000Z',
    });
    http.expectOne('/api/sessions').flush({ id: 3 });
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();

    http.expectOne(isStatsRequest).flush([{ ...days[1], sessions: 5, focusMinutes: 125 }]);
    await fixture.whenStable();
    expect(text()).toContain('125');
  });
});

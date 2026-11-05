import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PENDING_SESSIONS_KEY, SessionsApi } from './sessions.api';

const first = { durationSec: 1500, completedAt: '2026-11-05T10:00:00.000Z' };
const second = { durationSec: 1500, completedAt: '2026-11-05T11:00:00.000Z' };

describe('SessionsApi', () => {
  let api: SessionsApi;
  let http: HttpTestingController;

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SessionsApi);
    http = TestBed.inject(HttpTestingController);
  };

  const pending = () => JSON.parse(localStorage.getItem(PENDING_SESSIONS_KEY) ?? '[]');
  const respond = async (body: object, init?: { status: number; statusText: string }) => {
    http.expectOne('/api/sessions').flush(body, init);
    await new Promise((resolve) => setTimeout(resolve));
  };
  const failure = { status: 503, statusText: 'Service Unavailable' };

  beforeEach(() => {
    localStorage.clear();
    setup();
  });

  afterEach(() => http.verify());

  it('posts the session to the API', () => {
    void api.save(first);
    const request = http.expectOne('/api/sessions').request;
    expect(request.method).toBe('POST');
    expect(request.body).toEqual(first);
  });

  it('counts saved sessions and empties the queue on success', async () => {
    void api.save(first);
    await respond({ id: 1 });
    expect(pending()).toEqual([]);
    expect(api.savedCount()).toBe(1);
  });

  it('keeps a failed session queued and retries it with the next one', async () => {
    void api.save(first);
    await respond({ error: 'down' }, failure);
    expect(pending()).toEqual([first]);
    expect(api.savedCount()).toBe(0);

    void api.save(second);
    expect(http.expectOne('/api/sessions').request.body).toEqual(first);
  });

  it('sends queued sessions in order once the backend is back', async () => {
    void api.save(first);
    await respond({ error: 'down' }, failure);

    void api.save(second);
    await respond({ id: 1 });
    expect(http.expectOne('/api/sessions').request.body).toEqual(second);
  });

  it('retries sessions left over from a previous visit on flush()', async () => {
    localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify([first]));
    TestBed.resetTestingModule();
    setup();

    void api.flush();
    await respond({ id: 1 });
    expect(pending()).toEqual([]);
  });

  it('drops a session the server refuses, so it cannot block the queue', async () => {
    void api.save(first);
    await respond({ error: 'invalid' }, { status: 400, statusText: 'Bad Request' });
    expect(pending()).toEqual([]);
    expect(api.savedCount()).toBe(0);
  });
});

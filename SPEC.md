# Pomodoro – application specification

Nov 5, 2026 · @Hubert

## Project goal

A small Pomodoro timer.

| Skill | Where it shows in the project |
| --- | --- |
| Angular 22, standalone, zoneless | The whole app, with no zone.js and no NgModule |
| Signals, `computed`, `effect` | Timer store, derived time and progress, tab title |
| State-driven UI | Explicit timer state machine; the view only reads state |
| Signal Forms, validators | Settings panel with field validation and cross-field validation |
| `@defer`, lazy loading | Stats panel loaded only after interaction |
| Resource API (`httpResource`) | Fetching statistics from the backend |
| Node.js, REST API | Mini backend that stores completed sessions |
| Jest | Store tests (fake timers) and API tests |

## Functional scope

The MVP is a single screen: timer, control buttons, settings and daily statistics.

**In scope (MVP)**

1. Timer for a focus session (25 min by default), a short break (5 min) and a long break (15 min).
2. A long break after every N focus sessions (4 by default).
3. Buttons: Start, Pause, Resume, Reset, Skip (move to the next phase).
4. Progress ring (SVG) and time in `mm:ss` format.
5. Counter of focus sessions completed today.
6. The browser tab title shows the remaining time and the phase, e.g. `12:34 · Focus`.
7. Settings: phase lengths and the number of sessions until a long break, validated and saved in `localStorage`.
8. After a focus session is completed, the frontend sends it to the backend.
9. Stats panel: number of focus sessions and focus minutes over the last 7 days, from the backend.

**Out of scope**

- Login and user accounts (JWT as a possible stage 2).
- System notifications. The only sound is a short chime at the end of a phase, generated with the Web Audio API.
- A task list assigned to sessions.
- Synchronisation between devices.
- Running the timer with the tab closed (Service Worker).

## Timer state machine

The timer state has two independent axes: `status` (`idle`, `running`, `paused`) and `phase` (focus, short break, long break).

&#91;embedded content: timer state machine · 3 statuses, 3 phases\]

Time running out and `skip()` set the next phase and return to `idle`, so the user starts every phase manually. `reset()` returns to `idle` in the same phase, with the full time. Only time running out on a focus session increments the counter and saves the session in the backend.

## Frontend (Angular 22)

All the logic lives in a single signal-based store. Components are thin: they read signals and call store methods.

**Application configuration**

- Standalone components, no NgModule.
- `provideZonelessChangeDetection()`, zone.js removed from `polyfills`.
- `provideHttpClient(withFetch())`.
- All components use `ChangeDetectionStrategy.OnPush`.

**`PomodoroStore` (`pomodoro.store.ts`, approx. 80 lines)**

- State in a single `signal<TimerState>`: `status`, `phase`, `endsAt` (timestamp of the end of the phase), `remainingMs` (remembered on pause), `completedFocus`.
- Time is calculated from the difference `endsAt - now()`, not by subtracting seconds in an interval. This way the timer does not drift when the tab is in the background.
- `now` comes from a signal updated every 250 ms by `setInterval`, which runs only in the `running` state.
- `computed`: `remainingMs`, `display` (`mm:ss`), `progress` (0–1), `phaseLabel`, `nextPhase`.
- Transition methods: `start()`, `pause()`, `resume()`, `reset()`, `skip()` and an internal `complete()`. Each one checks whether the transition is allowed in the current state.
- The clock is injected through a `CLOCK` token (`Date.now` by default), so that tests can control it.
- The interval is cleaned up in `DestroyRef.onDestroy`.

**Effects**

- An `effect` that updates `document.title` (through the `Title` service).
- An `effect` that saves settings to `localStorage` (reading is wrapped in `try/catch`).
- After `complete()` of a focus session: a call to `SessionsApi.save()` (details in the Integration section).

**Components**

| Component | Responsibility |
| --- | --- |
| `AppComponent` | Page layout, injects the store |
| `TimerRingComponent` | SVG ring and time; `input()` for `progress` and `display` |
| `ControlsComponent` | Buttons; visibility depends on `status`; `output()` for actions |
| `SettingsComponent` | Settings form (Signal Forms) |
| `StatsComponent` | 7-day statistics from `httpResource`, loaded through `@defer` |

**Settings (Signal Forms)**

- Model: `focusMin` (1–90), `shortBreakMin` (1–30), `longBreakMin` (1–60), `sessionsUntilLong` (2–8), `sound` (on by default).
- Field validators: required, integer, range.
- Cross-field validation: short break < long break < focus session.
- Changing settings during a phase does not change the current countdown; the change applies from the next phase.

**`@defer`**

- `StatsComponent` in a `@defer (on interaction)` block with a "Show statistics" button, with `@placeholder` and `@loading`.

**Appearance**

- One SCSS file per component, CSS variables for phase colours (focus / break), dark mode through `prefers-color-scheme`.
- No UI libraries, to keep the code short.

## Backend (Node.js)

A mini API in TypeScript on Fastify. It stores completed focus sessions in SQLite and returns statistics for recent days.

**Stack**

- Node.js LTS, TypeScript, Fastify.
- Input validation through JSON Schema in the route definition (built into Fastify).
- SQLite through `better-sqlite3`, a single database file `data/pomodoro.db`.
- CORS enabled only for `http://localhost:4200`.

**Data model: `sessions` table**

| Column | Type | Description |
| --- | --- | --- |
| `id` | INTEGER PK | Autoincrement |
| `type` | TEXT | Only `focus` for now |
| `duration_sec` | INTEGER | Actual session length, 60–5400 |
| `completed_at` | TEXT | Completion date and time, ISO 8601 (UTC) |

**Endpoints**

| Method | Path | Input | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `200 { status: "ok" }` |
| POST | `/api/sessions` | `{ durationSec, completedAt }` | `201` with the saved session; `400` on invalid data |
| GET | `/api/sessions` | `?date=YYYY-MM-DD` | `200` list of sessions from the given day |
| GET | `/api/stats` | `?days=7` (1–30) | `200 [{ date, sessions, focusMinutes }]`, every day, including days with zero |

**Rules**

- Errors in one format: `{ error: string, details?: unknown }`.
- Days are calculated in the time zone passed by the client (`?tz=Europe/Warsaw`), UTC by default.
- Layers: `routes/` (HTTP and schemas), `repo/` (SQL), `app.ts` (builds the Fastify instance without `listen`, so tests can use it).

## Frontend–backend integration

The timer works fully without the backend. The backend only stores history and provides statistics.

- `SessionsApi` (service): `save(session)` sends `POST /api/sessions` through `HttpClient`.
- A failed save goes to a queue in `localStorage` and is retried on the next session completion or on app start.
- `StatsComponent` uses `httpResource` on `GET /api/stats?days=7&tz=…`. The template handles the `isLoading()`, `error()` and `value()` states.
- After a session is saved successfully, statistics are refreshed through `reload()` on the resource.
- The API address is in `environment.ts`; in dev it goes through the Angular CLI proxy (`/api` → `http://localhost:3000`), so there is no CORS in the browser.
- DTO types (`SessionDto`, `DayStatsDto`) live in the `shared/` package, used by both projects.

## Tests

We test logic, not pixels: the timer store and the API. Everything in Jest.

**Frontend: `pomodoro.store.spec.ts`**

- [ ] `start()` from `idle` moves to `running` and sets `endsAt`.
- [ ] `pause()` remembers `remainingMs`; `resume()` calculates a new `endsAt` from that value.
- [ ] After the time elapses (`jest.advanceTimersByTime` and a shifted `CLOCK`), the focus session ends and a break begins.
- [ ] Every Nth focus session ends with a long break.
- [ ] `skip()` moves to the next phase without incrementing the completed sessions counter.
- [ ] A disallowed transition (e.g. `pause()` in `idle`) changes nothing.
- [ ] Completing a focus session calls `SessionsApi.save()` (mock).

**Frontend: settings**

- [ ] Range validation and cross-field validation of breaks (2–3 tests).

**Backend: `app.spec.ts`**

- Tests through Fastify's `app.inject()`, on an in-memory SQLite database (`:memory:`).

* [ ] `POST /api/sessions` with valid data returns `201`.
* [ ] `POST /api/sessions` with `durationSec` out of range returns `400`.
* [ ] `GET /api/stats?days=7` returns 7 days, including days with no sessions, with zeros.
* [ ] Grouping by day respects `tz` (a session at 23:30 UTC lands on the next day in Warsaw).

## Repo structure and running

One repo with two projects and shared types, started with a single command.

```
pomodoro/
  apps/
    web/                 Angular 22
      src/app/
        app.component.ts, .html, .scss
        app.config.ts
        core/
          pomodoro.store.ts
          pomodoro.store.spec.ts
          sessions.api.ts
          settings.store.ts
          settings.schema.ts
        components/      One folder per component, each with .ts, .html and .scss files
          timer-ring/
          controls/
          settings/
          stats/
    api/                 Node + Fastify
      src/
        app.ts
        server.ts
        routes/sessions.ts
        routes/stats.ts
        repo/sessions.repo.ts
      test/app.spec.ts
  shared/types.ts        DTOs shared by both
  .github/workflows/     Deployment of the web app to GitHub Pages
  render.yaml            Deployment of the API to Render
  package.json           npm workspaces
  README.md
```

- `npm install`, then `npm run dev` starts both projects in parallel (`concurrently`).
- `npm test` runs the tests of both projects.
- Optional: a `Dockerfile` for the API and `docker-compose.yml` (Docker is on my CV).
- README: screenshot, list of skills from the table in the Goal section, commands, a short note on decisions (e.g. why time is calculated from `endsAt`).

**Definition of done**

- [ ] The timer goes through a full cycle of 4 focus sessions with a long break.
- [ ] No zone.js in the build; the app runs zoneless.
- [ ] Settings validate and survive a page refresh.
- [ ] Completed sessions are saved in the database; statistics show the last 7 days.
- [ ] The app works with the backend turned off (statistics show an error, the timer works).
- [ ] All tests are green.
- [ ] Public repo on GitHub with a README.

**Stage 2 (optional)**

- Login with JWT and per-user sessions.
- A React version of the same frontend as a comparison.

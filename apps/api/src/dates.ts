const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns a function that maps an instant to its calendar day (`YYYY-MM-DD`) in the given zone. */
export function localDateFormatter(tz: string): (instant: Date | string) => string {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return (instant) => {
    const parts = Object.fromEntries(
      format.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]),
    );
    return `${parts['year']}-${parts['month']}-${parts['day']}`;
  };
}

/** Moves a `YYYY-MM-DD` calendar day by whole days. Plain UTC arithmetic, so it is DST-safe. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A UTC range guaranteed to contain the given calendar days in any time zone: offsets stay
 * within about 14 hours, so one extra day on each side is enough. Callers filter by local day.
 */
export function utcRangeAround(firstDate: string, lastDate: string): { from: Date; to: Date } {
  return {
    from: new Date(Date.parse(`${firstDate}T00:00:00Z`) - DAY_MS),
    to: new Date(Date.parse(`${lastDate}T00:00:00Z`) + 2 * DAY_MS),
  };
}

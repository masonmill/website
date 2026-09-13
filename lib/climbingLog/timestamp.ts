/**
 * Combines a date-only string (e.g. from an `<input type="date">`, in the
 * form "YYYY-MM-DD") with the time-of-day of `now`, both interpreted in the
 * local time zone, and returns the result as Unix epoch seconds.
 *
 * Used when logging a new session: the timestamp is the chosen date at the
 * browser's current local time of day (see specs/web-log-editor/overview.md,
 * "Timestamps and dates").
 */
export function computeNewSessionTimestamp(dateString: string, now: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const combined = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );

  return Math.floor(combined.getTime() / 1000);
}

/**
 * Combines a date-only string with the original session timestamp's local
 * time-of-day, returning the result as Unix epoch seconds.
 *
 * If the new date string matches the original timestamp's local calendar
 * date, the original timestamp is returned unchanged (exact same integer),
 * per specs/web-log-editor/overview.md, "Timestamps and dates": "Leaving the
 * date unchanged keeps the timestamp unchanged."
 */
export function computeEditedSessionTimestamp(originalTimestamp: number, newDateString: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(newDateString);
  if (!match) {
    throw new Error(`Invalid date string: ${newDateString}`);
  }

  const originalDate = new Date(originalTimestamp * 1000);
  if (toDateInputValue(originalDate) === newDateString) {
    return originalTimestamp;
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const combined = new Date(
    year,
    month - 1,
    day,
    originalDate.getHours(),
    originalDate.getMinutes(),
    originalDate.getSeconds(),
    originalDate.getMilliseconds()
  );

  return Math.floor(combined.getTime() / 1000);
}

/** Formats a Date as a "YYYY-MM-DD" string in local time, for date inputs. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

/** Formats a Date as a "YYYY-MM-DD" string in local time, for date inputs. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

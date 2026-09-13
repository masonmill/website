import { describe, expect, it } from "vitest";
import { computeNewSessionTimestamp, toDateInputValue } from "./timestamp";

describe("computeNewSessionTimestamp", () => {
  it("combines the chosen date with now's local time of day", () => {
    const now = new Date(2024, 2, 10, 14, 30, 5); // 2024-03-10 14:30:05 local
    const result = computeNewSessionTimestamp("2024-01-05", now);
    const expected = new Date(2024, 0, 5, 14, 30, 5);
    expect(result).toBe(Math.floor(expected.getTime() / 1000));
  });

  it("is independent of which local time zone the test runs in", () => {
    // Whatever the system time zone is, the chosen date's calendar fields
    // and now's time-of-day fields should be combined verbatim.
    const now = new Date(2024, 5, 1, 23, 59, 59);
    const result = computeNewSessionTimestamp("2024-06-01", now);
    const expected = new Date(2024, 5, 1, 23, 59, 59);
    expect(result).toBe(Math.floor(expected.getTime() / 1000));
  });

  it("throws on a malformed date string", () => {
    expect(() => computeNewSessionTimestamp("not-a-date", new Date())).toThrow();
  });
});

describe("toDateInputValue", () => {
  it("formats a date as YYYY-MM-DD in local time", () => {
    expect(toDateInputValue(new Date(2024, 0, 5))).toBe("2024-01-05");
    expect(toDateInputValue(new Date(2024, 10, 30))).toBe("2024-11-30");
  });
});

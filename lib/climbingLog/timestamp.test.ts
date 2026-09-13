import { describe, expect, it } from "vitest";
import { computeEditedSessionTimestamp, computeNewSessionTimestamp, toDateInputValue } from "./timestamp";

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

describe("computeEditedSessionTimestamp", () => {
  it("returns the exact original timestamp when the date is unchanged", () => {
    const original = new Date(2024, 2, 10, 14, 30, 5); // 2024-03-10 14:30:05 local
    const originalTimestamp = Math.floor(original.getTime() / 1000);
    const result = computeEditedSessionTimestamp(originalTimestamp, "2024-03-10");
    expect(result).toBe(originalTimestamp);
  });

  it("keeps the original local time-of-day when the date changes", () => {
    const original = new Date(2024, 2, 10, 14, 30, 5); // 2024-03-10 14:30:05 local
    const originalTimestamp = Math.floor(original.getTime() / 1000);
    const result = computeEditedSessionTimestamp(originalTimestamp, "2024-01-05");
    const expected = new Date(2024, 0, 5, 14, 30, 5);
    expect(result).toBe(Math.floor(expected.getTime() / 1000));
  });

  it("preserves the exact integer value on an unchanged date even with sub-second precision", () => {
    const original = new Date(2024, 5, 1, 23, 59, 59, 500);
    const originalTimestamp = Math.floor(original.getTime() / 1000);
    const result = computeEditedSessionTimestamp(originalTimestamp, "2024-06-01");
    expect(result).toBe(originalTimestamp);
  });

  it("throws on a malformed date string", () => {
    expect(() => computeEditedSessionTimestamp(1_700_000_000, "not-a-date")).toThrow();
  });
});

describe("toDateInputValue", () => {
  it("formats a date as YYYY-MM-DD in local time", () => {
    expect(toDateInputValue(new Date(2024, 0, 5))).toBe("2024-01-05");
    expect(toDateInputValue(new Date(2024, 10, 30))).toBe("2024-11-30");
  });
});

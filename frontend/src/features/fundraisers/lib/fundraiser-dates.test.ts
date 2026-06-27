import { describe, expect, it } from "vitest";
import {
  getFundraiserDateRangeError,
  isFundraiserEndBeforeStart,
} from "@/features/fundraisers/lib/fundraiser-dates";

describe("isFundraiserEndBeforeStart", () => {
  it("returns false when end date is on or after start date", () => {
    expect(isFundraiserEndBeforeStart("2026-06-01", "2026-06-01")).toBe(false);
    expect(isFundraiserEndBeforeStart("2026-06-01", "2026-06-15")).toBe(false);
  });

  it("returns true when end date is before start date", () => {
    expect(isFundraiserEndBeforeStart("2026-06-15", "2026-06-01")).toBe(true);
  });

  it("returns false when either date is empty", () => {
    expect(isFundraiserEndBeforeStart("", "2026-06-01")).toBe(false);
    expect(isFundraiserEndBeforeStart("2026-06-01", "")).toBe(false);
  });
});

describe("getFundraiserDateRangeError", () => {
  it("returns error message for invalid range", () => {
    expect(getFundraiserDateRangeError("2026-06-15", "2026-06-01")).toBe(
      "Data końca nie może być wcześniejsza niż data startu.",
    );
  });

  it("returns null for valid range", () => {
    expect(getFundraiserDateRangeError("2026-06-01", "2026-06-15")).toBeNull();
  });
});

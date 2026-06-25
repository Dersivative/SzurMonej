import { describe, expect, it } from "vitest";
import { isAdminRole } from "@/features/auth/lib/use-is-admin";

describe("isAdminRole", () => {
  it("returns true for ADMIN role", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
  });

  it("returns false for USER role", () => {
    expect(isAdminRole("USER")).toBe(false);
  });

  it("returns false for undefined role", () => {
    expect(isAdminRole(undefined)).toBe(false);
  });
});

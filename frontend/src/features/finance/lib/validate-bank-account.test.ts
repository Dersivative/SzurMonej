import { describe, expect, it } from "vitest";
import {
  normalizeBankAccountNumber,
  validateBankAccountNumber,
} from "@/features/finance/lib/validate-bank-account";

describe("validateBankAccountNumber", () => {
  it("accepts 26 digits", () => {
    expect(validateBankAccountNumber("12345678901234567890123456")).toBeNull();
  });

  it("accepts PL prefix with 26 digits", () => {
    expect(validateBankAccountNumber("PL12345678901234567890123456")).toBeNull();
  });

  it("normalizes spaces and lowercase prefix", () => {
    expect(
      normalizeBankAccountNumber("pl 12345678901234567890123456"),
    ).toBe("PL12345678901234567890123456");
  });

  it("rejects invalid format", () => {
    expect(validateBankAccountNumber("12345")).toMatch(/Nieprawidłowy format/);
  });

  it("rejects empty value", () => {
    expect(validateBankAccountNumber("")).toMatch(/Podaj numer konta/);
  });
});

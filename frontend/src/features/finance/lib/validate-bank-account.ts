const BANK_ACCOUNT_PATTERN = /^(PL)?[0-9]{26}$/;

export function normalizeBankAccountNumber(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export function validateBankAccountNumber(value: string): string | null {
  const normalized = normalizeBankAccountNumber(value);

  if (!normalized) {
    return "Podaj numer konta bankowego.";
  }

  if (!BANK_ACCOUNT_PATTERN.test(normalized)) {
    return "Nieprawidłowy format numeru konta. Oczekiwano 26 cyfr lub PL i 26 cyfr.";
  }

  return null;
}

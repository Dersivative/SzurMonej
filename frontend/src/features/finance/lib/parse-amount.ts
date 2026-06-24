export function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function validateAmount(value: string): string | null {
  if (!value.trim()) {
    return "Podaj kwotę.";
  }

  if (parseAmount(value) == null) {
    return "Kwota musi być dodatnia (max 2 miejsca po przecinku).";
  }

  return null;
}

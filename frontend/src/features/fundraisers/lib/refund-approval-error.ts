import { isAxiosError } from "axios";

export const INSUFFICIENT_FUNDRAISER_FUNDS_MESSAGE =
  "Brak wystarczających środków w zbiórce. Poczekaj na inne wpłaty albo odrzuć zwrot.";

function extractErrorMessage(error: unknown): string | null {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length > 0) {
      return data;
    }
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return null;
}

export function isInsufficientFundraiserFundsError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return message?.toLowerCase().includes("insufficient funds") ?? false;
}

export function getRefundApprovalErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = extractErrorMessage(error);
  return message ?? fallback;
}

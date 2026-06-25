import type { FundraiserHistoryEntryDTO } from "@/features/fundraisers/api/types-history";

const TREASURER_WITHDRAWAL_TYPE = "Wypłata skarbnika";

export function isTreasurerWithdrawalEntry(
  entry: FundraiserHistoryEntryDTO,
): boolean {
  return entry.type === TREASURER_WITHDRAWAL_TYPE;
}

export function getTreasurerWithdrawalEntries(
  history: FundraiserHistoryEntryDTO[] = [],
): FundraiserHistoryEntryDTO[] {
  return history
    .filter(isTreasurerWithdrawalEntry)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function getTotalTreasurerWithdrawnAmount(
  history: FundraiserHistoryEntryDTO[] = [],
): number {
  return getTreasurerWithdrawalEntries(history).reduce(
    (sum, entry) => sum + Math.abs(entry.amount),
    0,
  );
}

/** Saldo konta zbiórki — suma operacji z historii (po wypłatach/zwrotach). */
export function getFundraiserAvailableBalance(
  history: FundraiserHistoryEntryDTO[] = [],
): number {
  const balance = history.reduce((sum, entry) => sum + entry.amount, 0);
  return Math.max(0, balance);
}

export function formatHistoryDateTime(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

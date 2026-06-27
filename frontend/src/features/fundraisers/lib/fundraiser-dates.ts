export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function getTodayDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPolishDate(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }

  const [year, month, day] = date.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}.${month}.${year}`;
}

export function getFundraiserPlannedEndDate(
  fundraiser: { endsBy?: string | null; endedAt?: string | null },
): string | null | undefined {
  return fundraiser.endsBy ?? fundraiser.endedAt;
}

export const FUNDRAISER_END_BEFORE_START_ERROR =
  "Data końca nie może być wcześniejsza niż data startu.";

export function isFundraiserEndBeforeStart(
  startedAt: string,
  endsBy: string,
): boolean {
  const start = startedAt.trim();
  const end = endsBy.trim();

  if (!start || !end) {
    return false;
  }

  return end < start;
}

export function getFundraiserDateRangeError(
  startedAt: string,
  endsBy: string,
): string | null {
  return isFundraiserEndBeforeStart(startedAt, endsBy)
    ? FUNDRAISER_END_BEFORE_START_ERROR
    : null;
}

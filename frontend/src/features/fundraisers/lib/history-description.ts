export function formatFundraiserHistoryDescription(
  description: string,
): string {
  return description.replace(/^Spłata długu za /, "Spłata należności za ");
}

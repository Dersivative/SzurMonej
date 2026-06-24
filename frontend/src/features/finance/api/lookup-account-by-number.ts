import type { AccountLookupResponseDTO } from "@/features/finance/api/types";
import { api } from "@/lib/api";

export async function lookupAccountByNumber(
  accountNumber: string,
): Promise<AccountLookupResponseDTO> {
  const trimmed = accountNumber.trim();
  const { data } = await api.get<AccountLookupResponseDTO>(
    `/account/by-number/${encodeURIComponent(trimmed)}`,
  );
  return data;
}

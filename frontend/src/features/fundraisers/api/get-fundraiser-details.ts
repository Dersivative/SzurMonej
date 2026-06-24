import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function fetchFundraiserDetails(
  fundraiserId: number,
): Promise<FundraiserResponseDTO> {
  const { data } = await api.get<FundraiserResponseDTO>(
    `/fundraisers/${fundraiserId}`,
  );
  return data;
}

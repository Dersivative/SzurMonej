import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function addFundraiserParticipant(
  fundraiserId: number,
  childId: number,
): Promise<FundraiserResponseDTO> {
  const { data } = await api.post<FundraiserResponseDTO>(
    `/fundraisers/${fundraiserId}/participants`,
    { childId },
  );
  return data;
}

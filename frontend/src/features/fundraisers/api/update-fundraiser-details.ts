import type {
  FundraiserResponseDTO,
  UpdateDetailsRequestDTO,
} from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function updateFundraiserDetails(
  fundraiserId: number,
  request: UpdateDetailsRequestDTO,
): Promise<FundraiserResponseDTO> {
  const { data } = await api.patch<FundraiserResponseDTO>(
    `/fundraisers/${fundraiserId}/details`,
    request,
  );
  return data;
}

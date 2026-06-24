import type {
  FundraiserResponseDTO,
  UpdateGoalRequestDTO,
} from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function updateFundraiserGoal(
  fundraiserId: number,
  request: UpdateGoalRequestDTO,
): Promise<FundraiserResponseDTO> {
  const { data } = await api.patch<FundraiserResponseDTO>(
    `/fundraisers/${fundraiserId}/goal`,
    request,
  );
  return data;
}

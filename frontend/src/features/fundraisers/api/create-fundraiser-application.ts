import type {
  FundraiserApplicationRequestDTO,
  FundraiserApplicationResponseDTO,
} from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function createFundraiserApplication(
  request: FundraiserApplicationRequestDTO,
): Promise<FundraiserApplicationResponseDTO> {
  const { data } = await api.post<FundraiserApplicationResponseDTO>(
    "/fundraiser-applications",
    request,
  );
  return data;
}

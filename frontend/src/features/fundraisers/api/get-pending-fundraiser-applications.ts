import type { FundraiserApplicationResponseDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function fetchPendingFundraiserApplications(
  classId: number,
): Promise<FundraiserApplicationResponseDTO[]> {
  const { data } = await api.get<FundraiserApplicationResponseDTO[]>(
    `/fundraiser-applications/class/${classId}/pending`,
  );
  return data;
}

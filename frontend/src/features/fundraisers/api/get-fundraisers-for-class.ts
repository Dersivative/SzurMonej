import type { FundraiserResponseDTO } from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function fetchFundraisersForClass(
  classId: number,
): Promise<FundraiserResponseDTO[]> {
  const { data } = await api.get<FundraiserResponseDTO[]>(
    `/school-classes/${classId}/fundraisers`,
  );
  return data;
}

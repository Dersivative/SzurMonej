import type {
  FundraiserCreateRequestDTO,
  FundraiserResponseDTO,
} from "@/features/fundraisers/api/types";
import { api } from "@/lib/api";

export async function createFundraiser(
  classId: number,
  request: FundraiserCreateRequestDTO,
): Promise<FundraiserResponseDTO> {
  const { data } = await api.post<FundraiserResponseDTO>(
    `/school-classes/${classId}/fundraisers`,
    request,
  );
  return data;
}

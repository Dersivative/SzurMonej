import type { MoneyOperationResponseDTO } from "@/features/finance/api/types";
import { api } from "@/lib/api";

export interface FundraiserActionRequestDTO {
  amount: number;
  note?: string;
}

export async function depositToFundraiser(
  fundraiserId: number,
  request: FundraiserActionRequestDTO,
): Promise<MoneyOperationResponseDTO> {
  const { data } = await api.post<MoneyOperationResponseDTO>(
    `/fundraisers/${fundraiserId}/deposit`,
    request,
  );
  return data;
}

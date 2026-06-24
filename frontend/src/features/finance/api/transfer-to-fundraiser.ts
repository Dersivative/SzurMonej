import type {
  MoneyOperationResponseDTO,
  TransferToFundraiserRequestDTO,
} from "@/features/finance/api/types";
import { api } from "@/lib/api";

export async function transferToFundraiser(
  request: TransferToFundraiserRequestDTO,
): Promise<MoneyOperationResponseDTO> {
  const { data } = await api.post<MoneyOperationResponseDTO>(
    "/account/transfer-to-fundraiser",
    request,
  );
  return data;
}

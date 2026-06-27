import type {
  AmountRequestDTO,
  MoneyOperationResponseDTO,
} from "@/features/finance/api/types";
import { api } from "@/lib/api";

export async function withdrawFromOwnAccount(
  amount: number,
): Promise<MoneyOperationResponseDTO> {
  const payload: AmountRequestDTO = { amount };
  const { data } = await api.post<MoneyOperationResponseDTO>(
    "/account/withdraw",
    payload,
  );
  return data;
}

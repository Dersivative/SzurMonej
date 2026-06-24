import type {
  AmountRequestDTO,
  MoneyOperationResponseDTO,
} from "@/features/finance/api/types";
import { api } from "@/lib/api";

export async function depositToOwnAccount(
  amount: number,
): Promise<MoneyOperationResponseDTO> {
  const payload: AmountRequestDTO = { amount };
  const { data } = await api.post<MoneyOperationResponseDTO>(
    "/account/deposit",
    payload,
  );
  return data;
}

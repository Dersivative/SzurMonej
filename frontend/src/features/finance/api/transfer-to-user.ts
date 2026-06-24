import type {
  MoneyOperationResponseDTO,
  TransferToUserRequestDTO,
} from "@/features/finance/api/types";
import { api } from "@/lib/api";

/**
 * Przelew do innego użytkownika — endpoint oczekiwany na backendzie.
 * @see BackendFinanceGapsCard
 */
export async function transferToUser(
  request: TransferToUserRequestDTO,
): Promise<MoneyOperationResponseDTO> {
  const { data } = await api.post<MoneyOperationResponseDTO>(
    "/account/transfer-to-user",
    request,
  );
  return data;
}

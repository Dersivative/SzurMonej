import type { UserResponseDTO } from "@/features/auth/api/types";
import { api } from "@/lib/api";

export interface BankAccountRequestDTO {
  bankAccountNumber: string;
}

export async function updateBankAccount(
  bankAccountNumber: string,
): Promise<UserResponseDTO> {
  const payload: BankAccountRequestDTO = { bankAccountNumber };
  const { data } = await api.patch<UserResponseDTO>(
    "/users/me/bank-account",
    payload,
  );
  return data;
}

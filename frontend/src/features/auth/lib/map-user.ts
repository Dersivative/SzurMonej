import type { UserResponseDTO } from "@/features/auth/api/types";
import type { User } from "@/features/auth/store/authStore";

export function mapUserResponse(dto: UserResponseDTO): User {
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.fullName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    role: dto.admin ? "ADMIN" : "USER",
    balance: dto.balance ?? null,
    accountNumber: dto.accountNumber ?? null,
    bankAccountNumber: dto.bankAccountNumber ?? null,
  };
}

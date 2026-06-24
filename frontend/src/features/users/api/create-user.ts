import type { UserResponseDTO } from "@/features/auth/api/types";
import type { UserCreateRequestDTO } from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function createUser(
  request: UserCreateRequestDTO,
): Promise<UserResponseDTO> {
  const { data } = await api.post<UserResponseDTO>("/users", request);
  return data;
}

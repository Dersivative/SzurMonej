import type { UserResponseDTO } from "@/features/auth/api/types";
import { api } from "@/lib/api";

export async function fetchUserMe(): Promise<UserResponseDTO> {
  const { data } = await api.get<UserResponseDTO>("/users/me");
  return data;
}

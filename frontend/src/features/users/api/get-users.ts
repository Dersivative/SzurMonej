import type { UserResponseDTO } from "@/features/auth/api/types";
import { api } from "@/lib/api";

export async function fetchUsers(): Promise<UserResponseDTO[]> {
  const { data } = await api.get<UserResponseDTO[]>("/users");
  return data;
}

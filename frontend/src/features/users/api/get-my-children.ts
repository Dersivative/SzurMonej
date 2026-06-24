import type { ChildResponseDTO } from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function fetchMyChildren(): Promise<ChildResponseDTO[]> {
  const { data } = await api.get<ChildResponseDTO[]>("/users/me/children");
  return data;
}

import type { UserWithChildrenResponseDTO } from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function fetchAllUsersWithChildren(): Promise<
  UserWithChildrenResponseDTO[]
> {
  const { data } = await api.get<UserWithChildrenResponseDTO[]>("/users/all");
  return data;
}

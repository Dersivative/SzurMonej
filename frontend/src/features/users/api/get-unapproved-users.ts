import type { UnapprovedUserDTO } from "@/features/users/api/types";
import { api } from "@/lib/api";

export async function fetchUnapprovedUsers(): Promise<UnapprovedUserDTO[]> {
  const { data } = await api.get<UnapprovedUserDTO[]>("/users/unapproved");
  return data;
}

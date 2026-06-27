import { api } from "@/lib/api";

export async function approveUser(userId: number): Promise<void> {
  await api.patch(`/users/${userId}/approve`, {});
}

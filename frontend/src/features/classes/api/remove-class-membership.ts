import { api } from "@/lib/api";

export async function removeClassMembership(
  membershipId: number,
): Promise<void> {
  await api.delete(`/class-memberships/${membershipId}`);
}

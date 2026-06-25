import { api } from "@/lib/api";

export async function removeFundraiserParticipant(
  fundraiserId: number,
  childId: number,
): Promise<void> {
  await api.delete(`/fundraisers/${fundraiserId}/participants/${childId}`);
}

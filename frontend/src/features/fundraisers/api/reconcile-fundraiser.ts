import { api } from "@/lib/api";

export async function reconcileFundraiser(
  fundraiserId: number,
  note = "Rozliczenie zbiórki",
): Promise<void> {
  await api.post(`/fundraisers/${fundraiserId}/reconcile`, { note });
}

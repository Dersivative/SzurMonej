import { api } from "@/lib/api";

export async function withdrawAllFundraiser(
  fundraiserId: number,
): Promise<void> {
  await api.post(`/fundraisers/${fundraiserId}/withdraw-all`);
}

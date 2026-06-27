import { api } from "@/lib/api";

export async function reopenFundraiser(fundraiserId: number): Promise<void> {
  await api.post(`/fundraisers/${fundraiserId}/reopen`);
}

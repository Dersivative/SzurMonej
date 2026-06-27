import { api } from "@/lib/api";

export async function settleFundraiser(fundraiserId: number): Promise<void> {
  await api.post(`/fundraisers/${fundraiserId}/settle`);
}

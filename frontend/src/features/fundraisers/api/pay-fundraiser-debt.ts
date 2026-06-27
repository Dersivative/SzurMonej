import { api } from "@/lib/api";

export async function payFundraiserDebt(
  fundraiserId: number,
  childId: number,
): Promise<void> {
  await api.post(
    `/fundraisers/${fundraiserId}/children/${childId}/pay-debt`,
  );
}

import axios from "axios";

export async function payFundraiserDebt(
  fundraiserId: number,
  childId: number,
): Promise<void> {
  await axios.post(
    `/api/fundraisers/${fundraiserId}/children/${childId}/pay-debt`,
  );
}
import type { RefundRequestResponseDTO } from "@/features/fundraisers/api/types-refund";
import { fetchFundraisersForClass } from "@/features/fundraisers/api/get-fundraisers-for-class";
import { fetchPendingRefundRequests } from "@/features/fundraisers/api/get-pending-refund-requests";

export async function fetchPendingRefundRequestsForClass(
  classId: number,
): Promise<RefundRequestResponseDTO[]> {
  const fundraisers = await fetchFundraisersForClass(classId);
  const requestsByFundraiser = await Promise.all(
    fundraisers.map((fundraiser) => fetchPendingRefundRequests(fundraiser.id)),
  );
  return requestsByFundraiser.flat();
}
